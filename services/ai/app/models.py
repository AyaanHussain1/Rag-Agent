from datetime import datetime
from uuid import uuid4

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


class Learner(Base):
    __tablename__ = "learners"

    learner_id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: new_id("learner"))
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    current_level: Mapped[str] = mapped_column(String(40), default="BEGINNER")
    recommended_concept_id: Mapped[str | None] = mapped_column(String(20), nullable=True)
    recent_correctness: Mapped[list] = mapped_column(JSON, default=list)
    attempts_count: Mapped[int] = mapped_column(Integer, default=0)
    hint_count: Mapped[int] = mapped_column(Integer, default=0)
    confidence_history: Mapped[list] = mapped_column(JSON, default=list)
    detected_misconceptions: Mapped[list] = mapped_column(JSON, default=list)
    last_action_reason: Mapped[str] = mapped_column(Text, default="")
    next_recommendation: Mapped[str] = mapped_column(Text, default="")
    diagnostic_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    diagnostic_completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    mastery: Mapped[list["LearnerMastery"]] = relationship(back_populates="learner", cascade="all, delete-orphan")
    interactions: Mapped[list["Interaction"]] = relationship(back_populates="learner", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: new_id("user"))
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="learner")
    learner_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("learners.learner_id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    learner: Mapped[Learner | None] = relationship()


class Concept(Base):
    __tablename__ = "concepts"

    concept_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    concept_name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")


class SourceDocument(Base):
    __tablename__ = "source_documents"

    source_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    file_name: Mapped[str] = mapped_column(String(200), default="")
    verification_status: Mapped[str] = mapped_column(Text, default="")
    concepts: Mapped[list] = mapped_column(JSON, default=list)


class LearningOutcome(Base):
    __tablename__ = "learning_outcomes"

    outcome_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    concept_id: Mapped[str] = mapped_column(String(20), ForeignKey("concepts.concept_id"))
    description: Mapped[str] = mapped_column(Text, nullable=False)
    bloom_level: Mapped[str] = mapped_column(String(40), default="Understand")


class ContentChunk(Base):
    __tablename__ = "content_chunks"

    chunk_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    concept_id: Mapped[str] = mapped_column(String(20), ForeignKey("concepts.concept_id"))
    source_page: Mapped[str | None] = mapped_column(String(40), nullable=True)
    source_title: Mapped[str] = mapped_column(String(200), default="OOP academic source pack")
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)


class Question(Base):
    __tablename__ = "questions"

    question_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    concept_id: Mapped[str] = mapped_column(String(20), ForeignKey("concepts.concept_id"))
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(40), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(40), nullable=False)
    options: Mapped[list | None] = mapped_column(JSON, nullable=True)
    correct_answer: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    misconception_id: Mapped[str | None] = mapped_column(String(40), nullable=True)


class HintLadder(Base):
    __tablename__ = "hint_ladders"

    question_id: Mapped[str] = mapped_column(String(40), ForeignKey("questions.question_id"), primary_key=True)
    concept_id: Mapped[str] = mapped_column(String(20), ForeignKey("concepts.concept_id"))
    hint_step_1: Mapped[str] = mapped_column(Text, nullable=False)
    hint_step_2: Mapped[str] = mapped_column(Text, nullable=False)
    hint_step_3: Mapped[str] = mapped_column(Text, nullable=False)


class Misconception(Base):
    __tablename__ = "misconceptions"

    misconception_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    concept_id: Mapped[str] = mapped_column(String(20), ForeignKey("concepts.concept_id"))
    misconception_description: Mapped[str] = mapped_column(Text, nullable=False)
    learner_response_example: Mapped[str] = mapped_column(Text, default="")
    recommended_intervention: Mapped[str] = mapped_column(Text, nullable=False)


class LearnerMastery(Base):
    __tablename__ = "learner_mastery"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    learner_id: Mapped[str] = mapped_column(String(64), ForeignKey("learners.learner_id"), index=True)
    concept_id: Mapped[str] = mapped_column(String(20), ForeignKey("concepts.concept_id"))
    mastery_score: Mapped[float] = mapped_column(Float, default=40)
    evidence_count: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    learner: Mapped["Learner"] = relationship(back_populates="mastery")


class Interaction(Base):
    __tablename__ = "interactions"

    interaction_id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: new_id("interaction"))
    learner_id: Mapped[str] = mapped_column(String(64), ForeignKey("learners.learner_id"), index=True)
    concept_id: Mapped[str] = mapped_column(String(20), ForeignKey("concepts.concept_id"))
    interaction_type: Mapped[str] = mapped_column(String(60), nullable=False)
    question_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    learner_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    confidence: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hints_used: Mapped[int] = mapped_column(Integer, default=0)
    misconception_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    teaching_action: Mapped[str | None] = mapped_column(String(80), nullable=True)
    mastery_before: Mapped[float] = mapped_column(Float, default=40)
    mastery_after: Mapped[float] = mapped_column(Float, default=40)
    evidence_summary: Mapped[str] = mapped_column(Text, default="")
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    learner: Mapped["Learner"] = relationship(back_populates="interactions")


class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"

    attempt_id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: new_id("attempt"))
    learner_id: Mapped[str] = mapped_column(String(64), ForeignKey("learners.learner_id"), index=True)
    question_id: Mapped[str] = mapped_column(String(40), ForeignKey("questions.question_id"))
    concept_id: Mapped[str] = mapped_column(String(20), ForeignKey("concepts.concept_id"))
    learner_answer: Mapped[str] = mapped_column(Text, default="")
    correct: Mapped[bool] = mapped_column(Boolean, default=False)
    confidence: Mapped[int] = mapped_column(Integer, default=3)
    hints_used: Mapped[int] = mapped_column(Integer, default=0)
    misconception_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    feedback: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EducatorAlert(Base):
    __tablename__ = "educator_alerts"

    alert_id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: new_id("alert"))
    learner_id: Mapped[str] = mapped_column(String(64), ForeignKey("learners.learner_id"), index=True)
    concept_id: Mapped[str] = mapped_column(String(20), ForeignKey("concepts.concept_id"))
    alert_type: Mapped[str] = mapped_column(String(80), nullable=False)
    evidence: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_action: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="medium")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AIUsageLog(Base):
    __tablename__ = "ai_usage_logs"

    log_id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: new_id("ai"))
    learner_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    endpoint: Mapped[str] = mapped_column(String(120), nullable=False)
    model_name: Mapped[str] = mapped_column(String(120), default="deterministic-fallback")
    prompt_summary: Mapped[str] = mapped_column(Text, default="")
    source_metadata: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AdaptationRule(Base):
    __tablename__ = "adaptation_rules"

    rule_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    trigger_condition: Mapped[str] = mapped_column(Text, nullable=False)
    learner_evidence_used: Mapped[str] = mapped_column(Text, nullable=False)
    selected_action: Mapped[str] = mapped_column(String(120), nullable=False)
    expected_profile_update: Mapped[str] = mapped_column(Text, nullable=False)
    educator_visibility: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
