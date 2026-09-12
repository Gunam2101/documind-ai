import uuid
import datetime
from sqlalchemy import (
    Column, String, Integer, DateTime, ForeignKey, Text, Boolean, Table, JSON, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
import enum
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class DocumentStatus(str, enum.Enum):
    UPLOADING = "UPLOADING"
    PROCESSING = "PROCESSING"
    READY = "READY"
    FAILED = "FAILED"

class MessageRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"

# Association table for Conversation <-> Document
conversation_documents = Table(
    "conversation_documents",
    Base.metadata,
    Column("conversation_id", String(36), ForeignKey("conversations.id", ondelete="CASCADE"), primary_key=True),
    Column("document_id", String(36), ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True),
)

# Association table for Collection <-> Document
collection_documents = Table(
    "collection_documents",
    Base.metadata,
    Column("collection_id", String(36), ForeignKey("collections.id", ondelete="CASCADE"), primary_key=True),
    Column("document_id", String(36), ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True),
)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    collections = relationship("Collection", back_populates="user", cascade="all, delete-orphan")
    reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
    verification_tokens = relationship("EmailVerificationToken", back_populates="user", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False, default=0)
    page_count = Column(Integer, nullable=False, default=0)
    storage_path = Column(String(512), nullable=False)
    status = Column(String(32), default=DocumentStatus.UPLOADING.value, nullable=False)
    processing_error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    conversations = relationship("Conversation", secondary=conversation_documents, back_populates="documents")
    collections = relationship("Collection", secondary=collection_documents, back_populates="documents")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=False)
    chunk_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    document = relationship("Document", back_populates="chunks")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False, default="New Conversation")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")
    documents = relationship("Document", secondary=conversation_documents, back_populates="conversations")

class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(32), nullable=False)
    content = Column(Text, nullable=False)
    image_url = Column(Text, nullable=True)
    sources = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    conversation = relationship("Conversation", back_populates="messages")

class Collection(Base):
    __tablename__ = "collections"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="collections")
    documents = relationship("Document", secondary=collection_documents, back_populates="collections")

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(255), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    user = relationship("User", back_populates="reset_tokens")

class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(255), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    user = relationship("User", back_populates="verification_tokens")
