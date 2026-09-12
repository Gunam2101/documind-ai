import os
import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import get_db, Base, engine
from app.models.models import User, Document, Conversation, Message, DocumentChunk
from app.auth.security import hash_password, create_access_token
from app.rag.vector_store import vector_store, ChunkData

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_data():
    Base.metadata.create_all(bind=engine)
    db = Session(bind=engine)

    # Clean test data
    db.query(Message).delete()
    db.query(Conversation).delete()
    db.query(DocumentChunk).delete()
    db.query(Document).delete()
    db.query(User).filter(User.email == "test_qa@documind.ai").delete()
    db.commit()

    # Create test user
    user = User(
        name="Test QA User",
        email="test_qa@documind.ai",
        password_hash=hash_password("TestPass123!"),
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})

    # Create test document
    doc = Document(
        user_id=user.id,
        filename="test_ai_lecture.pdf",
        original_filename="AI_Fundamentals_Lecture.pdf",
        file_size=1024,
        page_count=5,
        storage_path="../storage/documents/test_ai_lecture.pdf",
        status="READY"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Add chunks & FAISS vectors (384 dim)
    chunks = [
        ChunkData(
            content="An intelligent agent is an autonomous entity that perceives its environment through sensors and acts upon it using actuators to maximize performance.",
            page_number=1,
            chunk_index=0,
            metadata={"filename": "AI_Fundamentals_Lecture.pdf"}
        ),
        ChunkData(
            content="Rationality depends on four factors: performance measure, prior knowledge, action choices, and percept sequence history.",
            page_number=2,
            chunk_index=1,
            metadata={"filename": "AI_Fundamentals_Lecture.pdf"}
        )
    ]
    vector_store.add_chunks(user.id, doc.id, chunks)

    yield {
        "user": user,
        "token": token,
        "doc": doc,
        "headers": {"Authorization": f"Bearer {token}"}
    }

    db.close()

def test_1_ask_question_with_document_selected(setup_data):
    headers = setup_data["headers"]
    doc = setup_data["doc"]
    res = client.post(
        "/api/chat",
        headers=headers,
        json={"message": "What is an intelligent agent?", "document_ids": [doc.id]}
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert "answer" in data
    assert "conversation_id" in data
    assert isinstance(data["sources"], list)
    assert len(data["sources"]) > 0

def test_2_ask_question_without_document(setup_data):
    headers = setup_data["headers"]
    res = client.post(
        "/api/chat",
        headers=headers,
        json={"message": "Explain what is an intelligent agent in AI."}
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert "answer" in data
    assert isinstance(data["sources"], list)

def test_3_followup_question(setup_data):
    headers = setup_data["headers"]
    doc = setup_data["doc"]
    res1 = client.post("/api/chat", headers=headers, json={"message": "What is rationality?", "document_ids": [doc.id]})
    conv_id = res1.json()["conversation_id"]

    res2 = client.post("/api/chat", headers=headers, json={"conversation_id": conv_id, "message": "List its 4 key factors.", "document_ids": [doc.id]})
    assert res2.status_code == 200, res2.text
    data = res2.json()
    assert data["conversation_id"] == conv_id

def test_4_tamil_question(setup_data):
    headers = setup_data["headers"]
    doc = setup_data["doc"]
    res = client.post("/api/chat", headers=headers, json={"message": "செயற்கை நுண்ணறிவு முகவர் என்றால் என்ன?", "document_ids": [doc.id], "language": "tamil"})
    assert res.status_code == 200, res.text

def test_5_english_question(setup_data):
    headers = setup_data["headers"]
    doc = setup_data["doc"]
    res = client.post("/api/chat", headers=headers, json={"message": "Define sensors and actuators.", "document_ids": [doc.id], "language": "english"})
    assert res.status_code == 200, res.text

def test_6_tanglish_question(setup_data):
    headers = setup_data["headers"]
    doc = setup_data["doc"]
    res = client.post("/api/chat", headers=headers, json={"message": "Intelligent agent na enna?", "document_ids": [doc.id], "language": "tanglish"})
    assert res.status_code == 200, res.text

def test_7_image_question(setup_data):
    headers = setup_data["headers"]
    doc = setup_data["doc"]
    res = client.post(
        "/api/chat",
        headers=headers,
        json={"message": "Explain this diagram", "document_ids": [doc.id], "image_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="}
    )
    assert res.status_code == 200, res.text

def test_8_empty_question(setup_data):
    headers = setup_data["headers"]
    res = client.post("/api/chat", headers=headers, json={"message": "   "})
    assert res.status_code == 400

def test_9_invalid_document_id(setup_data):
    headers = setup_data["headers"]
    res = client.post("/api/chat", headers=headers, json={"message": "Test question", "document_ids": ["invalid-doc-id-999"]})
    assert res.status_code == 403

def test_10_faiss_dimension_mismatch_recovery(setup_data):
    user = setup_data["user"]
    doc = setup_data["doc"]
    headers = setup_data["headers"]

    # Deliberately corrupt index with wrong dimension
    user_dir = vector_store._get_user_dir(user.id)
    import faiss
    bad_index = faiss.IndexFlatIP(1536)
    faiss.write_index(bad_index, str(user_dir / "faiss.index"))

    # Now execute similarity search / chat query
    res = client.post("/api/chat", headers=headers, json={"message": "What is an intelligent agent?", "document_ids": [doc.id]})
    assert res.status_code == 200, res.text
    # Dimension mismatch should be safely recovered with 384 dim without crashing!

def test_11_get_conversations(setup_data):
    headers = setup_data["headers"]
    res = client.get("/api/conversations", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert isinstance(data, list)
    if len(data) > 0:
        assert "messages" in data[0]
        assert "sources" in data[0]["messages"][0]

def test_12_get_conversation_by_id(setup_data):
    headers = setup_data["headers"]
    convs = client.get("/api/conversations", headers=headers).json()
    if convs:
        cid = convs[0]["id"]
        res = client.get(f"/api/conversations/{cid}", headers=headers)
        assert res.status_code == 200, res.text
        assert res.json()["id"] == cid
