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
def setup_test_data():
    Base.metadata.create_all(bind=engine)
    db = Session(bind=engine)

    # Clean previous test user
    db.query(DocumentChunk).delete()
    db.query(Document).delete()
    db.query(User).filter(User.email == "test_notes@documind.ai").delete()
    db.commit()

    user = User(
        name="Test Summary User",
        email="test_notes@documind.ai",
        password_hash=hash_password("TestPass123!"),
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})

    doc = Document(
        user_id=user.id,
        filename="test_ai_architecture.pdf",
        original_filename="AI_Architecture_Guide.pdf",
        file_size=2048,
        page_count=10,
        storage_path="../storage/documents/test_ai_architecture.pdf",
        status="READY"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    chunks = [
        ChunkData(
            content="An intelligent agent perceives its environment through sensors and acts using actuators to achieve specific performance measures.",
            page_number=1,
            chunk_index=0,
            metadata={"filename": "AI_Architecture_Guide.pdf"}
        ),
        ChunkData(
            content="Rationality depends on four factors: performance measure, prior knowledge, available action choices, and percept history.",
            page_number=2,
            chunk_index=1,
            metadata={"filename": "AI_Architecture_Guide.pdf"}
        ),
        ChunkData(
            content="The 4 primary agent architectures include Simple Reflex, Model-based Reflex, Goal-based, and Utility-based agents.",
            page_number=3,
            chunk_index=2,
            metadata={"filename": "AI_Architecture_Guide.pdf"}
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

def test_summary_structured_endpoint(setup_test_data):
    headers = setup_test_data["headers"]
    doc = setup_test_data["doc"]

    res = client.post(
        "/api/chat/intelligence",
        headers=headers,
        json={"document_id": doc.id, "mode": "summary"}
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["mode"] == "summary"
    assert data["summary_structured"] is not None

    structured = data["summary_structured"]
    assert "overview" in structured
    assert "executive_summary" in structured["overview"]
    assert "document_purpose" in structured["overview"]
    assert "scope" in structured["overview"]
    assert isinstance(structured["main_topics"], list)
    assert len(structured["main_topics"]) > 0
    assert isinstance(structured["key_concepts"], list)
    assert len(structured["key_concepts"]) > 0
    assert isinstance(structured["key_takeaways"], list)
    assert len(structured["key_takeaways"]) > 0

def test_study_notes_structured_endpoint_english(setup_test_data):
    headers = setup_test_data["headers"]
    doc = setup_test_data["doc"]

    res = client.post(
        "/api/chat/intelligence",
        headers=headers,
        json={"document_id": doc.id, "mode": "study_notes", "target_language": "english"}
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["mode"] == "study_notes"
    assert data["study_notes_structured"] is not None

    notes = data["study_notes_structured"]
    assert isinstance(notes["topics"], list)
    assert len(notes["topics"]) > 0

    first_topic = notes["topics"][0]
    assert "topic" in first_topic
    assert "definition" in first_topic
    assert "important_points" in first_topic
    assert isinstance(first_topic["important_points"], list)
    assert "remember" in first_topic

def test_study_notes_structured_endpoint_tamil(setup_test_data):
    headers = setup_test_data["headers"]
    doc = setup_test_data["doc"]

    res = client.post(
        "/api/chat/intelligence",
        headers=headers,
        json={"document_id": doc.id, "mode": "study_notes", "target_language": "tamil"}
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["study_notes_structured"] is not None
    assert len(data["study_notes_structured"]["topics"]) > 0
