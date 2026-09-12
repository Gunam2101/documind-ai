from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.models import User, Document, Conversation, Message
from app.schemas.schemas import (
    UserResponse, UserProfileUpdate, UserSettingsUpdate, DashboardStats
)
from app.dependencies import get_current_user
from app.auth.security import hash_password, verify_password

router = APIRouter(prefix="/api/user", tags=["User Settings & Profile"])

@router.get("/profile", response_model=UserResponse)
def get_user_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@router.patch("/profile", response_model=UserResponse)
def update_user_profile(
    update_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if update_data.name:
        current_user.name = update_data.name.strip()

    if update_data.email and update_data.email.lower() != current_user.email:
        existing = db.query(User).filter(User.email == update_data.email.lower()).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use.")
        current_user.email = update_data.email.lower().strip()

    if update_data.new_password:
        if not update_data.current_password:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is required to set new password.")
        if not verify_password(update_data.current_password, current_user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password.")
        current_user.password_hash = hash_password(update_data.new_password)

    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)

@router.get("/dashboard-stats", response_model=DashboardStats)
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Total documents
    total_docs = db.query(Document).filter(Document.user_id == current_user.id).count()

    # Total pages
    total_pages_res = db.query(func.sum(Document.page_count)).filter(Document.user_id == current_user.id).scalar()
    total_pages = int(total_pages_res or 0)

    # Questions asked
    user_conversations = db.query(Conversation.id).filter(Conversation.user_id == current_user.id).all()
    conv_ids = [c[0] for c in user_conversations]
    questions_asked = 0
    if conv_ids:
        questions_asked = db.query(Message).filter(
            Message.conversation_id.in_(conv_ids),
            Message.role == "user"
        ).count()

    # Storage used
    storage_res = db.query(func.sum(Document.file_size)).filter(Document.user_id == current_user.id).scalar()
    storage_used_bytes = int(storage_res or 0)

    return DashboardStats(
        total_documents=total_docs,
        total_pages=total_pages,
        questions_asked=questions_asked,
        storage_used_bytes=storage_used_bytes
    )
