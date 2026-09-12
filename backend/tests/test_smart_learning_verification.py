import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import get_db, Base, engine
from app.models.models import User, Document, DocumentChunk
from app.auth.security import hash_password, create_access_token
from app.rag.vector_store import vector_store, ChunkData

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_smart_learning_data():
    Base.metadata.create_all(bind=engine)
    db = Session(bind=engine)

    # Clean previous test user
    db.query(DocumentChunk).delete()
    db.query(Document).delete()
    db.query(User).filter(User.email == "test_smart_teacher@documind.ai").delete()
    db.commit()

    user = User(
        name="Test Smart Teacher User",
        email="test_smart_teacher@documind.ai",
        password_hash=hash_password("TestPass123!"),
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})

    doc = Document(
        user_id=user.id,
        filename="test_multilingual_teacher_guide.pdf",
        original_filename="Multilingual_AI_Teacher_Guide.pdf",
        file_size=4096,
        page_count=15,
        storage_path="../storage/documents/test_multilingual_teacher_guide.pdf",
        status="READY"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    chunks = [
        ChunkData(
            content="An intelligent agent is an autonomous entity that perceives its environment through sensors and acts upon it using actuators.",
            page_number=1,
            chunk_index=0,
            metadata={"filename": "Multilingual_AI_Teacher_Guide.pdf"}
        ),
        ChunkData(
            content="Page 18 details the 4 core rules of rational decision making in dynamic environments.",
            page_number=18,
            chunk_index=1,
            metadata={"filename": "Multilingual_AI_Teacher_Guide.pdf"}
        ),
        ChunkData(
            content="The agent architecture framework connects environmental sensors to model-based reflex decision logic.",
            page_number=5,
            chunk_index=2,
            metadata={"filename": "Multilingual_AI_Teacher_Guide.pdf"}
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

def test_chat_answer_style_and_page_number(setup_smart_learning_data):
    headers = setup_smart_learning_data["headers"]
    doc = setup_smart_learning_data["doc"]

    # Test answer_style: 2_marks with page_number context
    res = client.post(
        "/api/chat",
        headers=headers,
        json={
            "document_ids": [doc.id],
            "message": "What is an intelligent agent?",
            "answer_style": "2_marks",
            "page_number": 1,
            "language": "english"
        }
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert "conversation_id" in data
    assert len(data["answer"]) > 10
    assert len(data["sources"]) > 0
    assert data["sources"][0]["page"] == 1

def test_learning_path_mode(setup_smart_learning_data):
    headers = setup_smart_learning_data["headers"]
    doc = setup_smart_learning_data["doc"]

    res = client.post(
        "/api/chat/intelligence",
        headers=headers,
        json={
            "document_id": doc.id,
            "mode": "learning_path"
        }
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["mode"] == "learning_path"
    assert data["learning_path_structured"] is not None

    path = data["learning_path_structured"]
    assert "document_title" in path
    assert isinstance(path["topics"], list)
    assert len(path["topics"]) > 0

    first = path["topics"][0]
    assert "title" in first
    assert "explanation" in first
    assert "key_concept" in first
    assert "important_points" in first

def test_explain_simply_multilingual(setup_smart_learning_data):
    headers = setup_smart_learning_data["headers"]
    doc = setup_smart_learning_data["doc"]

    # Test Explain Simply in Tanglish
    res = client.post(
        "/api/chat/intelligence",
        headers=headers,
        json={
            "document_id": doc.id,
            "mode": "explain_simply",
            "concept_query": "Intelligent Agent",
            "target_language": "tanglish"
        }
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["mode"] == "explain_simply"
    assert len(data["content"]) > 10
