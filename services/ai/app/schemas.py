from typing import Any

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    role: str = "learner"


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str


class CurrentUserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    learner_id: str | None = None
    diagnostic_completed: bool | None = None
    diagnostic_completed_at: str | None = None


class LearnerCreate(BaseModel):
    display_name: str = Field(min_length=2, max_length=120)
    current_level: str = "BEGINNER"


class DiagnosticAnswer(BaseModel):
    question_id: str
    learner_answer: str
    confidence: int = Field(ge=1, le=5)
    time_spent_seconds: int | None = None


class DiagnosticSubmit(BaseModel):
    learner_id: str
    answers: list[DiagnosticAnswer]


class RAGAnswerRequest(BaseModel):
    learner_id: str | None = None
    question: str


class TeachRequest(BaseModel):
    learner_id: str
    concept_id: str | None = None
    action: str | None = None


class TutorConfusionRequest(BaseModel):
    learner_id: str
    message: str
    confidence: int = Field(default=2, ge=1, le=5)


class AssessmentNextRequest(BaseModel):
    learner_id: str
    concept_id: str | None = None


class AssessmentSubmitRequest(BaseModel):
    learner_id: str
    question_id: str
    learner_answer: str
    confidence: int = Field(ge=1, le=5)
    hints_used: int = Field(default=0, ge=0, le=3)


class HintNextRequest(BaseModel):
    learner_id: str
    question_id: str
    current_hint_count: int = Field(default=0, ge=0, le=3)


class SourceReference(BaseModel):
    source_title: str
    chunk_id: str
    concept_id: str
    source_page: str | None = None
    similarity_score: float | None = None


class APIMessage(BaseModel):
    message: str
    data: dict[str, Any] | None = None
