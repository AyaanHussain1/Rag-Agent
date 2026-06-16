from pathlib import Path

import pandas as pd
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from . import adaptive, models


REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_ROOT = REPO_ROOT / "data"


def seed_reference_data(db: Session) -> None:
    for concept in adaptive.CONCEPTS:
        db.merge(models.Concept(**concept))
    _load_chunks(db)
    _load_misconceptions(db)
    _load_questions(db)
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

    db.add(models.AIUsageLog(
        learner_id=None,
        endpoint="/api/rag/answer",
        model_name="deterministic-fallback",
        prompt_summary="Seeded out-of-scope demo: Explain photosynthesis",
        source_metadata={"safeguard_triggered": True, "source_grounding_used": False},
    ))
    for learner_id in learner_ids:
        adaptive.refresh_alerts_for_learner(db, learner_id)
    db.commit()
    return {
        "seeded": True,
        "learners": learner_ids,
        "questions": db.scalar(select(func.count()).select_from(models.Question)),
        "interactions": len(interaction_rows),
        "adaptation_rules": db.scalar(select(func.count()).select_from(models.AdaptationRule)),
    }


def ensure_seeded(db: Session) -> None:
    concept_count = db.scalar(select(func.count()).select_from(models.Concept)) or 0
    question_count = db.scalar(select(func.count()).select_from(models.Question)) or 0
    hint_count = db.scalar(select(func.count()).select_from(models.HintLadder)) or 0
    rule_count = db.scalar(select(func.count()).select_from(models.AdaptationRule)) or 0
    if concept_count < len(adaptive.CONCEPTS) or question_count < 36 or hint_count < 12 or rule_count < 12:
        seed_reference_data(db)


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
