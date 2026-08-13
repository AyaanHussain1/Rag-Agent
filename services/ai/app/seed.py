import json
from datetime import datetime
from pathlib import Path

import pandas as pd
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from . import adaptive, auth, models


REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_ROOT = REPO_ROOT / "data"


def seed_reference_data(db: Session) -> None:
    # Insert parent rows before child rows. MySQL/InnoDB enforces foreign keys at
    # statement time, so concepts must exist before chunks/questions, and questions
    # before hint_ladders. Explicit flushes guarantee that ordering on every backend.
    for concept in adaptive.CONCEPTS:
        db.merge(models.Concept(**concept))
    db.flush()
    _load_source_documents(db)
    _load_learning_outcomes(db)
    _load_chunks(db)
    _load_misconceptions(db)
    _load_questions(db)
    db.flush()
    _load_hint_ladders(db)
    _load_adaptation_rules(db)
    db.commit()


def seed_demo(db: Session) -> dict:
    seed_reference_data(db)
    learner_rows = _read_csv(DATA_ROOT / "learners" / "learner_profiles.csv")
    interaction_rows = _read_csv(DATA_ROOT / "interactions" / "demo_interactions.csv")
    learner_ids = [str(row["learner_id"]) for _, row in learner_rows.iterrows()]

    db.execute(delete(models.EducatorAlert).where(models.EducatorAlert.learner_id.in_(learner_ids)))
    db.execute(delete(models.AssessmentAttempt).where(models.AssessmentAttempt.learner_id.in_(learner_ids)))
    db.execute(delete(models.AIUsageLog).where(models.AIUsageLog.learner_id.in_(learner_ids)))
    db.execute(delete(models.AIUsageLog).where(models.AIUsageLog.endpoint.like("/seed/%")))
    db.execute(delete(models.AIUsageLog).where(models.AIUsageLog.prompt_summary == "Seeded out-of-scope demo: Explain photosynthesis"))
    db.execute(update(models.User).where(models.User.learner_id.in_(learner_ids)).values(learner_id=None))
    for learner_id in learner_ids:
        learner = db.get(models.Learner, learner_id)
        if learner:
            db.delete(learner)
    db.flush()

    learners: dict[str, models.Learner] = {}
    for _, row in learner_rows.iterrows():
        learner = models.Learner(
            learner_id=str(row["learner_id"]),
            display_name=str(row["display_name"]),
            current_level=str(row["current_level"]).upper(),
            is_demo=_bool(row.get("is_demo", True)),
            diagnostic_completed=False,
            diagnostic_completed_at=None,
        )
        db.add(learner)
        db.flush()
        adaptive.ensure_mastery_records(db, learner)
        _set_mastery(db, learner.learner_id, {concept["concept_id"]: float(row[concept["concept_id"]]) for concept in adaptive.CONCEPTS})
        learners[learner.learner_id] = learner

    for _, row in interaction_rows.iterrows():
        learner = learners[str(row["learner_id"])]
        correct = _optional_bool(row.get("correct"))
        confidence = _optional_int(row.get("confidence"))
        hints_used = int(row.get("hints_used") or 0)
        question_id = _optional_str(row.get("question_id"))
        misconception_id = _optional_str(row.get("misconception_id"))
        feedback = str(row.get("evidence_summary") or "")
        interaction = adaptive.record_interaction(
            db,
            learner,
            str(row["concept_id"]),
            str(row["interaction_type"]),
            question_id,
            _optional_str(row.get("learner_answer")),
            correct,
            confidence,
            hints_used,
            misconception_id,
            _optional_str(row.get("teaching_action")),
            feedback,
            {"seed_interaction_id": str(row["interaction_id"])},
        )
        if str(row["interaction_type"]) == "assessment" and question_id:
            db.add(models.AssessmentAttempt(
                learner_id=learner.learner_id,
                question_id=question_id,
                concept_id=str(row["concept_id"]),
                learner_answer=_optional_str(row.get("learner_answer")) or "",
                correct=bool(correct),
                confidence=confidence or 3,
                hints_used=hints_used,
                misconception_id=misconception_id,
                feedback=feedback,
            ))
        if str(row["interaction_type"]) in {"teaching", "tutor_confusion", "assessment_safeguard"}:
            db.add(models.AIUsageLog(
                learner_id=learner.learner_id,
                endpoint=f"/seed/{row['interaction_type']}",
                model_name="deterministic-fallback",
                prompt_summary=feedback[:300],
                source_metadata={
                    "seed_interaction_id": str(row["interaction_id"]),
                    "interaction_id": interaction.interaction_id,
                    "safeguard_triggered": str(row["interaction_type"]) == "assessment_safeguard",
                    "source_grounding_used": str(row["interaction_type"]) != "assessment_safeguard",
                },
            ))

    diagnostic_evidence = {str(row["learner_id"]) for _, row in interaction_rows.iterrows() if str(row["interaction_type"]) == "diagnostic"}
    for learner_id, learner in learners.items():
        learner.diagnostic_completed = learner_id in diagnostic_evidence
        learner.diagnostic_completed_at = datetime.utcnow() if learner.diagnostic_completed else None
    learners["demo_beginner"].diagnostic_completed = False
    learners["demo_beginner"].diagnostic_completed_at = None

    db.add(models.AIUsageLog(
        learner_id=None,
        endpoint="/api/rag/answer",
        model_name="deterministic-fallback",
        prompt_summary="Seeded out-of-scope demo: Explain photosynthesis",
        source_metadata={"safeguard_triggered": True, "source_grounding_used": False},
    ))
    for learner_id in learner_ids:
        adaptive.refresh_alerts_for_learner(db, learner_id)
    seed_demo_users(db)
    db.commit()
    return {
        "seeded": True,
        "learners": learner_ids,
        "questions": db.scalar(select(func.count()).select_from(models.Question)),
        "interactions": len(interaction_rows),
        "adaptation_rules": db.scalar(select(func.count()).select_from(models.AdaptationRule)),
        "demo_users": ["beginner@learnshift.ai", "advanced@learnshift.ai", "educator@learnshift.ai"],
    }


def ensure_seeded(db: Session) -> None:
    concept_count = db.scalar(select(func.count()).select_from(models.Concept)) or 0
    question_count = db.scalar(select(func.count()).select_from(models.Question)) or 0
    hint_count = db.scalar(select(func.count()).select_from(models.HintLadder)) or 0
    rule_count = db.scalar(select(func.count()).select_from(models.AdaptationRule)) or 0
    if concept_count < len(adaptive.CONCEPTS) or question_count < 36 or hint_count < 12 or rule_count < 12:
        seed_reference_data(db)


def seed_demo_users(db: Session) -> None:
    demo_accounts = [
        {
            "email": "beginner@learnshift.ai",
            "name": "Demo Beginner",
            "role": "learner",
            "learner_id": "demo_beginner",
        },
        {
            "email": "advanced@learnshift.ai",
            "name": "Demo Advanced",
            "role": "learner",
            "learner_id": "demo_advanced",
        },
        {
            "email": "educator@learnshift.ai",
            "name": "Demo Educator",
            "role": "educator",
            "learner_id": None,
        },
    ]
    password_hash = auth.hash_password("password123")
    for account in demo_accounts:
        user = db.scalar(select(models.User).where(models.User.email == account["email"]))
        if user:
            user.name = account["name"]
            user.role = account["role"]
            user.learner_id = account["learner_id"]
            continue
        db.add(models.User(password_hash=password_hash, **account))


def _load_source_documents(db: Session) -> None:
    manifest_path = DATA_ROOT / "sources" / "source_manifest.json"
    if not manifest_path.exists():
        return
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    for entry in manifest.get("sources", []):
        db.merge(models.SourceDocument(
            source_id=str(entry["source_id"]),
            title=str(entry.get("title", "")),
            file_name=str(entry.get("file", "")),
            verification_status=str(entry.get("verification_status", "")),
            concepts=list(entry.get("concepts", [])),
        ))


def _load_learning_outcomes(db: Session) -> None:
    path = DATA_ROOT / "outcomes" / "learning_outcomes.csv"
    if not path.exists():
        return
    frame = _read_csv(path)
    for _, row in frame.iterrows():
        db.merge(models.LearningOutcome(
            outcome_id=str(row["outcome_id"]),
            concept_id=str(row["concept_id"]).upper(),
            description=str(row["description"]),
            bloom_level=str(row.get("bloom_level") or "Understand"),
        ))


def _load_chunks(db: Session) -> None:
    frame = _read_csv(DATA_ROOT / "chunks" / "oop_knowledge_chunks.csv")
    for _, row in frame.iterrows():
        db.merge(models.ContentChunk(
            chunk_id=str(row["chunk_id"]),
            concept_id=str(row["concept_id"]).upper(),
            source_page=str(row["page_or_section"]),
            source_title=str(row["source_title"]),
            chunk_text=str(row["content"]),
        ))


def _load_misconceptions(db: Session) -> None:
    frame = _read_csv(DATA_ROOT / "misconceptions" / "oop_misconceptions.csv")
    for _, row in frame.iterrows():
        db.merge(models.Misconception(
            misconception_id=str(row["misconception_id"]),
            concept_id=str(row["concept_id"]).upper(),
            misconception_description=str(row["misconception_description"]),
            learner_response_example=str(row["learner_response_example"]),
            recommended_intervention=str(row["recommended_intervention"]),
        ))


def _load_questions(db: Session) -> None:
    frame = _read_csv(DATA_ROOT / "questions" / "oop_question_bank.csv")
    for _, row in frame.iterrows():
        options = _split_options(row.get("options"))
        db.merge(models.Question(
            question_id=str(row["question_id"]),
            concept_id=str(row["concept_id"]).upper(),
            prompt=str(row["prompt"]),
            question_type=str(row["question_type"]),
            difficulty=str(row["difficulty"]),
            options=options,
            correct_answer=str(row["correct_answer"]),
            explanation=str(row["explanation"]),
            misconception_id=_optional_str(row.get("misconception_id")),
        ))


def _load_hint_ladders(db: Session) -> None:
    frame = _read_csv(DATA_ROOT / "hints" / "oop_hint_ladders.csv")
    for _, row in frame.iterrows():
        db.merge(models.HintLadder(
            question_id=str(row["question_id"]),
            concept_id=str(row["concept_id"]).upper(),
            hint_step_1=str(row["hint_step_1"]),
            hint_step_2=str(row["hint_step_2"]),
            hint_step_3=str(row["hint_step_3"]),
        ))


def _load_adaptation_rules(db: Session) -> None:
    frame = _read_csv(DATA_ROOT / "adaptation" / "adaptation_rules.csv")
    for _, row in frame.iterrows():
        db.merge(models.AdaptationRule(
            rule_id=str(row["rule_id"]),
            trigger_condition=str(row["trigger_condition"]),
            learner_evidence_used=str(row["learner_evidence_used"]),
            selected_action=str(row["selected_action"]),
            expected_profile_update=str(row["expected_profile_update"]),
            educator_visibility=str(row["educator_visibility"]),
            explanation=str(row["explanation"]),
        ))


def _set_mastery(db: Session, learner_id: str, values: dict[str, float]) -> None:
    for concept_id, score in values.items():
        row = adaptive.get_mastery_row(db, learner_id, concept_id)
        row.mastery_score = score
        row.evidence_count = max(row.evidence_count, 1)


def _read_csv(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Required seed data file not found: {path}")
    return pd.read_csv(path).fillna("")


def _split_options(value: object) -> list[str] | None:
    text = str(value or "").strip()
    if not text:
        return None
    return [item.strip() for item in text.split("|") if item.strip()]


def _optional_str(value: object) -> str | None:
    text = str(value).strip() if value is not None else ""
    return text or None


def _optional_int(value: object) -> int | None:
    text = str(value).strip() if value is not None else ""
    return int(text) if text else None


def _optional_bool(value: object) -> bool | None:
    text = str(value).strip().lower() if value is not None else ""
    if text in {"true", "1", "yes"}:
        return True
    if text in {"false", "0", "no"}:
        return False
    return None


def _bool(value: object) -> bool:
    parsed = _optional_bool(value)
    return True if parsed is None else parsed
