from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import List, Optional, Any
from datetime import datetime

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

class UserSettingsUpdate(BaseModel):
    theme: Optional[str] = "dark"
    default_language: Optional[str] = "english"

class DashboardStats(BaseModel):
    total_documents: int
    total_conversations: int
    total_messages: int
    storage_used_mb: float

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: Optional[str] = None
    user: Optional[UserResponse] = None

class TokenData(BaseModel):
    user_id: Optional[str] = None

# --- Auth & Account Action Schemas ---
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class VerifyEmailRequest(BaseModel):
    token: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class AccountActionResponse(BaseModel):
    message: str
    detail: Optional[str] = None

# Aliases for Auth Routes compatibility
UserLogin = LoginRequest
TokenResponse = Token

class RefreshTokenRequest(BaseModel):
    refresh_token: str

EmailVerifyRequest = VerifyEmailRequest

# --- Collection Schemas ---
class CollectionBase(BaseModel):
    name: str
    description: Optional[str] = None

class CollectionCreate(CollectionBase):
    document_ids: Optional[List[str]] = None

class CollectionResponse(CollectionBase):
    id: str
    user_id: str
    created_at: datetime
    document_count: Optional[int] = 0
    documents: Optional[List[DocumentResponse]] = []

    class Config:
        from_attributes = True

class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

# --- Document Schemas ---
class DocumentUpdate(BaseModel):
    filename: Optional[str] = None

class DocumentResponse(BaseModel):
    id: str
    user_id: str
    filename: str
    original_filename: str
    file_size: int
    page_count: int
    status: str
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int

# --- Chat & Source Schemas ---
class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    document_ids: Optional[List[str]] = None
    collection_id: Optional[str] = None
    message: str
    image_url: Optional[str] = None
    language: Optional[str] = "auto"
    answer_style: Optional[str] = "auto"  # auto | quick | 2_marks | 5_marks | 10_marks | detailed
    page_number: Optional[int] = None

class SourceCitation(BaseModel):
    document_id: str
    filename: str
    page: int
    excerpt: str

class ChatResponse(BaseModel):
    conversation_id: str
    answer: str
    sources: List[SourceCitation] = Field(default_factory=list)

    @field_validator("sources", mode="before")
    @classmethod
    def validate_sources(cls, v: Any) -> Any:
        if v is None:
            return []
        return v

class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    image_url: Optional[str] = None
    created_at: datetime
    sources: List[SourceCitation] = Field(default_factory=list)

    @field_validator("sources", mode="before")
    @classmethod
    def validate_sources(cls, v: Any) -> Any:
        if v is None:
            return []
        return v

    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = Field(default_factory=list)
    documents: List[DocumentResponse] = Field(default_factory=list)

    @field_validator("messages", mode="before")
    @classmethod
    def validate_messages(cls, v: Any) -> Any:
        if v is None:
            return []
        return v

    @field_validator("documents", mode="before")
    @classmethod
    def validate_documents(cls, v: Any) -> Any:
        if v is None:
            return []
        return v

    class Config:
        from_attributes = True

class ConversationUpdate(BaseModel):
    title: str

# --- Search Schemas ---
class SearchRequest(BaseModel):
    query: str
    document_ids: Optional[List[str]] = None
    collection_id: Optional[str] = None
    top_k: Optional[int] = 10

class SearchItem(BaseModel):
    document_id: str
    filename: str
    page: int
    content: str
    score: float

class SearchResponse(BaseModel):
    results: List[SearchItem]

# --- Document Intelligence & Study Assistant Schemas ---
class QuizQuestionSchema(BaseModel):
    id: int
    question: str
    options: List[str]
    correct_answer: str  # String "0", "1", "2", "3" or "A", "B", "C", "D"
    explanation: str
    page: int

class FlashcardSchema(BaseModel):
    id: int
    front: str
    back: str
    question: Optional[str] = None
    answer: Optional[str] = None
    page: int

class CustomQuestionSchema(BaseModel):
    id: int
    type: str  # mcq | short_answer | long_answer
    question: str
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    model_answer: Optional[str] = None
    marks: int
    difficulty: str  # easy | medium | hard
    topic: Optional[str] = None
    page: int

class ImportantQuestionSchema(BaseModel):
    id: int
    question: str
    topic: Optional[str] = None
    difficulty: Optional[str] = "Medium"
    marks: Optional[int] = 5
    importance: Optional[str] = "High"
    expected_depth: Optional[str] = None
    model_answer: Optional[str] = None
    page: int

class ExamQuestionItemSchema(BaseModel):
    id: Optional[int] = 1
    question: str
    marks: Optional[int] = 2
    difficulty: Optional[str] = "Medium"
    topic: Optional[str] = None
    importance: Optional[str] = "High"
    model_answer: Optional[str] = None
    page: int

class ExamSectionSchema(BaseModel):
    marks: int
    questions: List[ExamQuestionItemSchema]

class InsightsSchema(BaseModel):
    document_type: str
    main_subject: str
    difficulty: str
    core_topics: List[str]
    key_takeaways: List[str]
    study_focus: List[str]

class OverviewSectionSchema(BaseModel):
    executive_summary: str
    document_purpose: str
    scope: str

class MainTopicItemSchema(BaseModel):
    title: str
    description: str

class KeyConceptItemSchema(BaseModel):
    title: str
    explanation: str

class SummaryStructuredSchema(BaseModel):
    overview: OverviewSectionSchema
    main_topics: List[MainTopicItemSchema] = Field(default_factory=list)
    key_concepts: List[KeyConceptItemSchema] = Field(default_factory=list)
    key_takeaways: List[str] = Field(default_factory=list)

class StudyTopicNoteSchema(BaseModel):
    topic: str
    definition: str
    important_points: List[str] = Field(default_factory=list)
    example: Optional[str] = None
    remember: str

class StudyNotesStructuredSchema(BaseModel):
    topics: List[StudyTopicNoteSchema] = Field(default_factory=list)

class TopicLearningItemSchema(BaseModel):
    id: int
    title: str
    explanation: str
    key_concept: str
    example: Optional[str] = None
    important_points: List[str] = Field(default_factory=list)

class LearningPathStructuredSchema(BaseModel):
    document_title: str
    topics: List[TopicLearningItemSchema] = Field(default_factory=list)

class IntelligenceRequest(BaseModel):
    document_id: str
    mode: str  # summary | key_points | important_questions | exam_questions | study_notes | quiz | insights | flashcards | custom_questions | explain_simply | learning_path
    custom_prompt: Optional[str] = None
    num_questions: Optional[int] = 10
    difficulty: Optional[str] = "medium"  # easy | medium | hard | mixed
    question_types: Optional[List[str]] = None  # mcq | short_answer | long_answer
    marks: Optional[str] = "mixed"  # 2 | 5 | 10 | mixed
    topic: Optional[str] = None
    target_level: Optional[str] = "college"  # beginner | school | college | technical
    target_language: Optional[str] = "english"  # english | tamil | tanglish
    concept_query: Optional[str] = None

class IntelligenceResponse(BaseModel):
    document_id: str
    mode: str
    title: str
    content: str
    quiz_questions: Optional[List[QuizQuestionSchema]] = None
    flashcards: Optional[List[FlashcardSchema]] = None
    custom_questions: Optional[List[CustomQuestionSchema]] = None
    important_questions: Optional[List[ImportantQuestionSchema]] = None
    exam_sections: Optional[List[ExamSectionSchema]] = None
    insights: Optional[InsightsSchema] = None
    summary_structured: Optional[SummaryStructuredSchema] = None
    study_notes_structured: Optional[StudyNotesStructuredSchema] = None
    learning_path_structured: Optional[LearningPathStructuredSchema] = None
    sources: List[SourceCitation] = Field(default_factory=list)
