"""initial LearnShift AI schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-17
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "learners",
        sa.Column("learner_id", sa.String(length=64), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("current_level", sa.String(length=40), nullable=False),
        sa.Column("recommended_concept_id", sa.String(length=20), nullable=True),
        sa.Column("recent_correctness", sa.JSON(), nullable=True),
        sa.Column("attempts_count", sa.Integer(), nullable=False),
        sa.Column("hint_count", sa.Integer(), nullable=False),
        sa.Column("confidence_history", sa.JSON(), nullable=True),
        sa.Column("detected_misconceptions", sa.JSON(), nullable=True),
        sa.Column("last_action_reason", sa.Text(), nullable=False),
        sa.Column("next_recommendation", sa.Text(), nullable=False),
        sa.Column("is_demo", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("learner_id"),
    )
    op.create_table(
        "concepts",
        sa.Column("concept_id", sa.String(length=20), nullable=False),
        sa.Column("concept_name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("concept_id"),
    )
    op.create_table(
        "source_documents",
        sa.Column("source_id", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("file_name", sa.String(length=200), nullable=False),
        sa.Column("verification_status", sa.Text(), nullable=False),
        sa.Column("concepts", sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint("source_id"),
    )
    op.create_table(
        "learning_outcomes",
        sa.Column("outcome_id", sa.String(length=40), nullable=False),
        sa.Column("concept_id", sa.String(length=20), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("bloom_level", sa.String(length=40), nullable=False),
        sa.ForeignKeyConstraint(["concept_id"], ["concepts.concept_id"]),
        sa.PrimaryKeyConstraint("outcome_id"),
    )
    op.create_table(
        "content_chunks",
        sa.Column("chunk_id", sa.String(length=40), nullable=False),
        sa.Column("concept_id", sa.String(length=20), nullable=False),
        sa.Column("source_page", sa.String(length=40), nullable=True),
        sa.Column("source_title", sa.String(length=200), nullable=False),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["concept_id"], ["concepts.concept_id"]),
        sa.PrimaryKeyConstraint("chunk_id"),
    )
    op.create_table(
        "questions",
        sa.Column("question_id", sa.String(length=40), nullable=False),
        sa.Column("concept_id", sa.String(length=20), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("question_type", sa.String(length=40), nullable=False),
        sa.Column("difficulty", sa.String(length=40), nullable=False),
        sa.Column("options", sa.JSON(), nullable=True),
        sa.Column("correct_answer", sa.Text(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("misconception_id", sa.String(length=40), nullable=True),
        sa.ForeignKeyConstraint(["concept_id"], ["concepts.concept_id"]),
        sa.PrimaryKeyConstraint("question_id"),
    )
    op.create_table(
        "hint_ladders",
        sa.Column("question_id", sa.String(length=40), nullable=False),
        sa.Column("concept_id", sa.String(length=20), nullable=False),
        sa.Column("hint_step_1", sa.Text(), nullable=False),
        sa.Column("hint_step_2", sa.Text(), nullable=False),
        sa.Column("hint_step_3", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["concept_id"], ["concepts.concept_id"]),
        sa.ForeignKeyConstraint(["question_id"], ["questions.question_id"]),
        sa.PrimaryKeyConstraint("question_id"),
    )
    op.create_table(
        "misconceptions",
        sa.Column("misconception_id", sa.String(length=40), nullable=False),
        sa.Column("concept_id", sa.String(length=20), nullable=False),
        sa.Column("misconception_description", sa.Text(), nullable=False),
        sa.Column("learner_response_example", sa.Text(), nullable=False),
        sa.Column("recommended_intervention", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["concept_id"], ["concepts.concept_id"]),
        sa.PrimaryKeyConstraint("misconception_id"),
    )
    op.create_table(
        "learner_mastery",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("learner_id", sa.String(length=64), nullable=False),
        sa.Column("concept_id", sa.String(length=20), nullable=False),
        sa.Column("mastery_score", sa.Float(), nullable=False),
        sa.Column("evidence_count", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["concept_id"], ["concepts.concept_id"]),
        sa.ForeignKeyConstraint(["learner_id"], ["learners.learner_id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_learner_mastery_learner_id"), "learner_mastery", ["learner_id"])
    op.create_table(
        "interactions",
        sa.Column("interaction_id", sa.String(length=64), nullable=False),
        sa.Column("learner_id", sa.String(length=64), nullable=False),
        sa.Column("concept_id", sa.String(length=20), nullable=False),
        sa.Column("interaction_type", sa.String(length=60), nullable=False),
        sa.Column("question_id", sa.String(length=40), nullable=True),
        sa.Column("learner_answer", sa.Text(), nullable=True),
        sa.Column("correct", sa.Boolean(), nullable=True),
        sa.Column("confidence", sa.Integer(), nullable=True),
        sa.Column("hints_used", sa.Integer(), nullable=False),
        sa.Column("misconception_id", sa.String(length=40), nullable=True),
        sa.Column("teaching_action", sa.String(length=80), nullable=True),
        sa.Column("mastery_before", sa.Float(), nullable=False),
        sa.Column("mastery_after", sa.Float(), nullable=False),
        sa.Column("evidence_summary", sa.Text(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["concept_id"], ["concepts.concept_id"]),
        sa.ForeignKeyConstraint(["learner_id"], ["learners.learner_id"]),
        sa.PrimaryKeyConstraint("interaction_id"),
    )
    op.create_index(op.f("ix_interactions_learner_id"), "interactions", ["learner_id"])
    op.create_table(
        "assessment_attempts",
        sa.Column("attempt_id", sa.String(length=64), nullable=False),
        sa.Column("learner_id", sa.String(length=64), nullable=False),
        sa.Column("question_id", sa.String(length=40), nullable=False),
        sa.Column("concept_id", sa.String(length=20), nullable=False),
        sa.Column("learner_answer", sa.Text(), nullable=False),
        sa.Column("correct", sa.Boolean(), nullable=False),
        sa.Column("confidence", sa.Integer(), nullable=False),
        sa.Column("hints_used", sa.Integer(), nullable=False),
        sa.Column("misconception_id", sa.String(length=40), nullable=True),
        sa.Column("feedback", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["concept_id"], ["concepts.concept_id"]),
        sa.ForeignKeyConstraint(["learner_id"], ["learners.learner_id"]),
        sa.ForeignKeyConstraint(["question_id"], ["questions.question_id"]),
        sa.PrimaryKeyConstraint("attempt_id"),
    )
    op.create_index(op.f("ix_assessment_attempts_learner_id"), "assessment_attempts", ["learner_id"])
    op.create_table(
        "educator_alerts",
        sa.Column("alert_id", sa.String(length=64), nullable=False),
        sa.Column("learner_id", sa.String(length=64), nullable=False),
        sa.Column("concept_id", sa.String(length=20), nullable=False),
        sa.Column("alert_type", sa.String(length=80), nullable=False),
        sa.Column("evidence", sa.Text(), nullable=False),
        sa.Column("recommended_action", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["concept_id"], ["concepts.concept_id"]),
        sa.ForeignKeyConstraint(["learner_id"], ["learners.learner_id"]),
        sa.PrimaryKeyConstraint("alert_id"),
    )
    op.create_index(op.f("ix_educator_alerts_learner_id"), "educator_alerts", ["learner_id"])
    op.create_table(
        "ai_usage_logs",
        sa.Column("log_id", sa.String(length=64), nullable=False),
        sa.Column("learner_id", sa.String(length=64), nullable=True),
        sa.Column("endpoint", sa.String(length=120), nullable=False),
        sa.Column("model_name", sa.String(length=120), nullable=False),
        sa.Column("prompt_summary", sa.Text(), nullable=False),
        sa.Column("source_metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("log_id"),
    )
    op.create_table(
        "adaptation_rules",
        sa.Column("rule_id", sa.String(length=40), nullable=False),
        sa.Column("trigger_condition", sa.Text(), nullable=False),
        sa.Column("learner_evidence_used", sa.Text(), nullable=False),
        sa.Column("selected_action", sa.String(length=120), nullable=False),
        sa.Column("expected_profile_update", sa.Text(), nullable=False),
        sa.Column("educator_visibility", sa.Text(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("rule_id"),
    )


def downgrade() -> None:
    op.drop_table("adaptation_rules")
    op.drop_table("ai_usage_logs")
    op.drop_index(op.f("ix_educator_alerts_learner_id"), table_name="educator_alerts")
    op.drop_table("educator_alerts")
    op.drop_index(op.f("ix_assessment_attempts_learner_id"), table_name="assessment_attempts")
    op.drop_table("assessment_attempts")
    op.drop_index(op.f("ix_interactions_learner_id"), table_name="interactions")
    op.drop_table("interactions")
    op.drop_index(op.f("ix_learner_mastery_learner_id"), table_name="learner_mastery")
    op.drop_table("learner_mastery")
    op.drop_table("misconceptions")
    op.drop_table("hint_ladders")
    op.drop_table("questions")
    op.drop_table("content_chunks")
    op.drop_table("learning_outcomes")
    op.drop_table("source_documents")
    op.drop_table("concepts")
    op.drop_table("learners")
