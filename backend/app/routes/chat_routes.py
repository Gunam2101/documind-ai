from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from app.database import get_db
from app.models.models import User, Conversation, Message, Document, Collection, MessageRole
from app.schemas.schemas import (
    ChatRequest, ChatResponse, ConversationResponse, ConversationUpdate, MessageResponse, SourceCitation,
    DocumentResponse, IntelligenceRequest, IntelligenceResponse
)
from app.dependencies import get_current_user
from app.rag.chain import run_rag_chain, run_intelligence_chain
from app.rag.retriever import retrieve_relevant_chunks
from app.rag.prompt import format_rag_prompt
from app.rag.generator import llm_generator

router = APIRouter(prefix="/api", tags=["Chat"])

@router.post("/chat", response_model=ChatResponse)
def create_chat_message(
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    print(f"[CHAT] Request received for user: {current_user.email}")

    query_text = (req.message or "").strip()
    if not query_text and not req.image_url:
        print("[CHAT][ERROR] Empty message and no image provided.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a question or attach an image."
        )

    print(f"[CHAT] User query: '{query_text[:80]}'")
    print(f"[CHAT] Image URL present: {bool(req.image_url)}")

    # 1. Resolve target document_ids
    target_doc_ids: List[str] = req.document_ids or []
    if req.collection_id:
        coll = db.query(Collection).filter(
            Collection.id == req.collection_id,
            Collection.user_id == current_user.id
        ).first()
        if coll:
            target_doc_ids = [d.id for d in coll.documents]

    print(f"[CHAT] Target document_ids: {target_doc_ids}")

    # Verify document ownership if specific IDs passed
    if target_doc_ids:
        owned_count = db.query(Document).filter(
            Document.id.in_(target_doc_ids),
            Document.user_id == current_user.id
        ).count()
        if owned_count != len(target_doc_ids):
            print(f"[CHAT][ERROR] Unauthorized document access for user {current_user.id}")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized document access.")

    # 2. Get or create conversation
    conversation: Optional[Conversation] = None
    if req.conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == req.conversation_id,
            Conversation.user_id == current_user.id
        ).first()
        if not conversation:
            print(f"[CHAT][ERROR] Conversation {req.conversation_id} not found.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    else:
        title_summary = query_text[:40] + ("..." if len(query_text) > 40 else "") if query_text else "Image Analysis"
        conversation = Conversation(
            user_id=current_user.id,
            title=title_summary or "New Chat"
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # Attach documents to conversation if not already linked
    if target_doc_ids:
        docs = db.query(Document).filter(Document.id.in_(target_doc_ids)).all()
        for d in docs:
            if d not in conversation.documents:
                conversation.documents.append(d)
        db.commit()

    # 3. Add user message
    user_msg = Message(
        conversation_id=conversation.id,
        role=MessageRole.USER.value,
        content=query_text or "Explain this image",
        image_url=req.image_url
    )
    db.add(user_msg)
    db.commit()

    # Retrieve recent conversation context
    recent_msgs = db.query(Message).filter(Message.conversation_id == conversation.id)\
        .order_by(Message.created_at.desc()).limit(6).all()
    history_str = "\n".join([f"{m.role.upper()}: {m.content}" for m in reversed(recent_msgs[:-1])])

    # 4. Execute RAG Chain
    answer, sources = run_rag_chain(
        user_id=current_user.id,
        query=query_text or "Explain this image in detail.",
        document_ids=target_doc_ids or None,
        conversation_history=history_str,
        image_url=req.image_url,
        language=req.language or "auto",
        answer_style=req.answer_style or "auto",
        page_number=req.page_number
    )

    # 5. Add assistant message with sources JSON
    sources_data = [s.model_dump() for s in (sources or [])]
    assistant_msg = Message(
        conversation_id=conversation.id,
        role=MessageRole.ASSISTANT.value,
        content=answer,
        sources=sources_data
    )
    db.add(assistant_msg)
    db.commit()

    print(f"[CHAT] Response saved successfully for conversation_id: {conversation.id}")

    return ChatResponse(
        conversation_id=conversation.id,
        answer=answer,
        sources=sources or []
    )

@router.post("/chat/stream")
def stream_chat_message(
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_doc_ids: List[str] = req.document_ids or []
    if req.collection_id:
        coll = db.query(Collection).filter(Collection.id == req.collection_id, Collection.user_id == current_user.id).first()
        if coll:
            target_doc_ids = [d.id for d in coll.documents]

    # Get or create conversation
    if req.conversation_id:
        conversation = db.query(Conversation).filter(Conversation.id == req.conversation_id, Conversation.user_id == current_user.id).first()
    else:
        conversation = Conversation(user_id=current_user.id, title=req.message[:40])
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    user_msg = Message(conversation_id=conversation.id, role=MessageRole.USER.value, content=req.message, image_url=req.image_url)
    db.add(user_msg)
    db.commit()

    results = retrieve_relevant_chunks(user_id=current_user.id, query=req.message, document_ids=target_doc_ids or None)
    if req.page_number and results:
        results.sort(key=lambda r: (0 if r.page == req.page_number else 1, r.page))

    sources = []
    seen = set()
    for item in results:
        key = (item.document_id, item.page)
        if key not in seen:
            seen.add(key)
            sources.append({"document_id": item.document_id, "filename": item.filename, "page": item.page, "excerpt": item.content[:200]})

    prompt = format_rag_prompt(
        query=req.message,
        search_results=results,
        has_image=bool(req.image_url),
        language=req.language or "auto",
        answer_style=req.answer_style or "auto",
        page_number=req.page_number
    )


    def event_generator():
        # First send metadata line
        yield f"data: {json.dumps({'type': 'metadata', 'conversation_id': conversation.id, 'sources': sources})}\n\n"
        full_text = []
        for delta in llm_generator.generate_stream(prompt, results, image_url=req.image_url):
            full_text.append(delta)
            yield f"data: {json.dumps({'type': 'token', 'token': delta})}\n\n"

        complete_answer = "".join(full_text)
        assistant_msg = Message(conversation_id=conversation.id, role=MessageRole.ASSISTANT.value, content=complete_answer, sources=sources)
        db.add(assistant_msg)
        db.commit()
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/conversations", response_model=List[ConversationResponse])
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    convs = db.query(Conversation).filter(Conversation.user_id == current_user.id)\
        .order_by(Conversation.updated_at.desc()).all()
    
    result = []
    for c in convs:
        c_res = ConversationResponse.model_validate(c)
        c_res.documents = [DocumentResponse.model_validate(d) for d in c.documents]
        c_res.messages = [MessageResponse.model_validate(m) for m in c.messages]
        result.append(c_res)

    return result

@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    res = ConversationResponse.model_validate(conv)
    res.documents = [DocumentResponse.model_validate(d) for d in conv.documents]
    res.messages = [MessageResponse.model_validate(m) for m in conv.messages]
    return res

@router.patch("/conversations/{conversation_id}", response_model=ConversationResponse)
def update_conversation(
    conversation_id: str,
    update_data: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    conv.title = update_data.title.strip()
    db.commit()
    db.refresh(conv)

    res = ConversationResponse.model_validate(conv)
    res.documents = [DocumentResponse.model_validate(d) for d in conv.documents]
    res.messages = [MessageResponse.model_validate(m) for m in conv.messages]
    return res

@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    db.delete(conv)
    db.commit()
    return {"message": "Conversation deleted successfully."}

@router.post("/chat/intelligence", response_model=IntelligenceResponse)
def get_document_intelligence(
    req: IntelligenceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates grounded Document Intelligence (Summary, Key Points, Important Questions, Exam Questions, Study Notes, Quiz, Insights).
    """
    doc = db.query(Document).filter(
        Document.id == req.document_id,
        Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found or access denied.")

    return run_intelligence_chain(
        user_id=current_user.id,
        document_id=req.document_id,
        mode=req.mode,
        custom_prompt=req.custom_prompt,
        num_questions=req.num_questions,
        difficulty=req.difficulty,
        question_types=req.question_types,
        marks=req.marks,
        topic=req.topic,
        target_level=req.target_level,
        target_language=req.target_language,
        concept_query=req.concept_query
    )
