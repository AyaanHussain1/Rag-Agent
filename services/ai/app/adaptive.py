from collections import Counter, defaultdict
from statistics import mean

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import models


CONCEPTS = [
    {"concept_id": "C001", "concept_name": "Classes and Objects", "description": "Blueprints, instances, fields and methods."},
    {"concept_id": "C002", "concept_name": "Encapsulation", "description": "Protecting state with access control and methods."},
    {"concept_id": "C003", "concept_name": "Inheritance", "description": "Sharing and extending behavior through parent and child classes."},
    {"concept_id": "C004", "concept_name": "Method Overloading", "description": "Same method name with different parameter lists in one class."},
    {"concept_id": "C005", "concept_name": "Method Overriding", "description": "A subclass replacing a parent method implementation."},
    {"concept_id": "C006", "concept_name": "Polymorphism", "description": "One interface or reference producing different runtime behavior."},
]

CONCEPT_KEYWORDS = {
    "C001": ["class", "object", "instance", "constructor", "field"],
    "C002": ["encapsulation", "private", "public", "getter", "setter", "access"],
    "C003": ["inheritance", "extends", "superclass", "subclass", "parent", "child"],
    "C004": ["overload", "overloading", "same method", "different parameter", "signature"],
    "C005": ["override", "overriding", "@override", "parent method", "super."],
    "C006": ["polymorphism", "dynamic binding", "runtime", "interface", "virtual"],
}


def clamp(value: float, low: float = 0, high: float = 100) -> float:
    return max(low, min(high, value))


def mastery_label(score: float) -> str:
    if score < 40:
        return "Weak"
    if score < 70:
        return "Developing"
    return "Mastered"


def detect_concept_id(text: str, fallback: str | None = None) -> str | None:
    lowered = text.lower()
    scores = {
        concept_id: sum(1 for keyword in keywords if keyword in lowered)
        for concept_id, keywords in CONCEPT_KEYWORDS.items()
    }
    best_id, best_score = max(scores.items(), key=lambda item: item[1])
    return best_id if best_score > 0 else fallback


def ensure_mastery_records(db: Session, learner: models.Learner) -> None:
    existing = {
        row.concept_id
        for row in db.scalars(select(models.LearnerMastery).where(models.LearnerMastery.learner_id == learner.learner_id))
    }
    for concept in CONCEPTS:
        if concept["concept_id"] not in existing:
            db.add(models.LearnerMastery(learner_id=learner.learner_id, concept_id=concept["concept_id"], mastery_score=40))
    db.flush()


def mastery_map(db: Session, learner_id: str) -> dict[str, dict]:
    rows = db.scalars(select(models.LearnerMastery).where(models.LearnerMastery.learner_id == learner_id)).all()
    concepts = {concept["concept_id"]: concept for concept in CONCEPTS}
    return {
        row.concept_id: {
            "concept_id": row.concept_id,
            "concept_name": concepts.get(row.concept_id, {}).get("concept_name", row.concept_id),
            "score": round(row.mastery_score, 1),
            "label": mastery_label(row.mastery_score),
            "evidence_count": row.evidence_count,
        }
        for row in rows
    }


def get_mastery_row(db: Session, learner_id: str, concept_id: str) -> models.LearnerMastery:
    row = db.scalar(
        select(models.LearnerMastery).where(
            models.LearnerMastery.learner_id == learner_id,
            models.LearnerMastery.concept_id == concept_id,
        )
    )
    if row is None:
        row = models.LearnerMastery(learner_id=learner_id, concept_id=concept_id, mastery_score=40)
        db.add(row)
        db.flush()
    return row


def select_teaching_action(db: Session, learner_id: str, concept_id: str) -> tuple[str, str]:
    mastery = get_mastery_row(db, learner_id, concept_id).mastery_score
    recent = db.scalars(
        select(models.Interaction)
        .where(models.Interaction.learner_id == learner_id, models.Interaction.concept_id == concept_id)
        .order_by(models.Interaction.created_at.desc())
        .limit(6)
    ).all()
    hint_total = sum(item.hints_used or 0 for item in recent)
    low_confidence = [item.confidence for item in recent if item.confidence is not None and item.confidence <= 2]
    repeated_misconception = _repeated_misconception_id(recent)
    last = recent[0] if recent else None

    if repeated_misconception:
        return "misconception-focused reframe", "Repeated misconception evidence suggests the learner needs a targeted contrast before new practice."
    if hint_total >= 4:
        return "prerequisite review", "Recent hint usage is high, so the next teaching step should rebuild prerequisite knowledge."
    if mastery < 40 or low_confidence:
        return "simplified explanation", "Weak mastery or low confidence indicates the explanation should reduce cognitive load."
    if last and last.correct is True and last.confidence is not None and last.confidence <= 2:
        return "analogy", "The learner answered correctly with low confidence, so an analogy can stabilize the idea."
    if last and last.correct is False and last.confidence is not None and last.confidence >= 4:
        return "corrective explanation plus diagnostic question", "An incorrect high-confidence answer is evidence of a confident misconception."
    if mastery >= 70:
        return "advanced application", "Recent evidence shows strong mastery, so the learner is ready for a harder application."
    return "step-by-step explanation", "Developing mastery benefits from a worked sequence before independent practice."


def profile_payload(db: Session, learner: models.Learner) -> dict:
    ensure_mastery_records(db, learner)
    mastery = mastery_map(db, learner.learner_id)
    scores = [item["score"] for item in mastery.values()] or [40]
    weak = [item for item in mastery.values() if item["label"] == "Weak"]
    developing = [item for item in mastery.values() if item["label"] == "Developing"]
    mastered = [item for item in mastery.values() if item["label"] == "Mastered"]
    learner.recommended_concept_id = recommend_concept(mastery)
    learner.next_recommendation = recommendation_text(mastery, learner.recommended_concept_id)
    return {
        "learner_id": learner.learner_id,
        "display_name": learner.display_name,
        "current_level": learner.current_level,
        "recommended_concept_id": learner.recommended_concept_id,
        "overall_mastery": round(mean(scores), 1),
        "concept_mastery": mastery,
        "weak_concepts": weak,
        "developing_concepts": developing,
        "mastered_concepts": mastered,
        "recent_correctness": learner.recent_correctness or [],
        "attempts_count": learner.attempts_count,
        "hint_count": learner.hint_count,
        "confidence_history": learner.confidence_history or [],
        "detected_misconceptions": learner.detected_misconceptions or [],
        "last_action_reason": learner.last_action_reason,
        "next_recommendation": learner.next_recommendation,
        "updated_at": learner.updated_at.isoformat() if learner.updated_at else None,
    }


def recommend_concept(mastery: dict[str, dict]) -> str:
    weak = sorted(mastery.values(), key=lambda item: item["score"])
    return weak[0]["concept_id"] if weak else "C001"


def recommendation_text(mastery: dict[str, dict], concept_id: str | None) -> str:
    if not concept_id:
        return "Start with Classes and Objects."
    concept = mastery.get(concept_id, {})
    label = concept.get("label", "Developing")
    name = concept.get("concept_name", concept_id)
    if label == "Weak":
        return f"Review {name} with a simplified explanation and basic check question."
    if label == "Mastered":
        return f"Try an advanced application question for {name}."
    return f"Continue {name} with a step-by-step Java example."


def mastery_delta(correct: bool | None, confidence: int | None, hints_used: int, repeated_misconception: bool = False) -> tuple[float, str]:
    confidence = confidence or 3
    if correct is True:
        if hints_used == 0 and confidence >= 4:
            return 10, "Correct, high confidence, no hints: strong positive evidence."
        if hints_used == 0:
            return 8, "Correct without hints: mastery increased."
        return max(2, 7 - hints_used * 2), f"Correct after {hints_used} hint(s): smaller mastery gain."
    if correct is False and confidence >= 4:
        return (-13 if repeated_misconception else -8), "Incorrect with high confidence: likely misconception."
    if correct is False and confidence <= 2:
        return -3, "Incorrect with low confidence: prerequisite review recommended."
    if correct is False:
        return -5, "Incorrect attempt: mastery adjusted downward."
    return 1, "Learning interaction recorded as light evidence."


def record_interaction(
    db: Session,
    learner: models.Learner,
    concept_id: str,
    interaction_type: str,
    question_id: str | None = None,
    learner_answer: str | None = None,
    correct: bool | None = None,
    confidence: int | None = None,
    hints_used: int = 0,
    misconception_id: str | None = None,
    teaching_action: str | None = None,
    evidence_summary: str | None = None,
    metadata_json: dict | None = None,
) -> models.Interaction:
    row = get_mastery_row(db, learner.learner_id, concept_id)
    before = row.mastery_score
    recent = db.scalars(
        select(models.Interaction)
        .where(models.Interaction.learner_id == learner.learner_id, models.Interaction.concept_id == concept_id)
        .order_by(models.Interaction.created_at.desc())
        .limit(5)
    ).all()
    repeated = bool(misconception_id and sum(1 for item in recent if item.misconception_id == misconception_id) >= 1)
    delta, rule_reason = mastery_delta(correct, confidence, hints_used, repeated)
    after = clamp(before + delta)
    row.mastery_score = after
    row.evidence_count += 1

    learner.attempts_count = (learner.attempts_count or 0) + (1 if correct is not None else 0)
    learner.hint_count = (learner.hint_count or 0) + hints_used
    learner.recent_correctness = ((learner.recent_correctness or []) + ([] if correct is None else [correct]))[-10:]
    learner.confidence_history = ((learner.confidence_history or []) + ([] if confidence is None else [confidence]))[-20:]
    if misconception_id:
        learner.detected_misconceptions = list(dict.fromkeys((learner.detected_misconceptions or []) + [misconception_id]))[-10:]
    learner.last_action_reason = evidence_summary or rule_reason
    learner.recommended_concept_id = recommend_concept(mastery_map(db, learner.learner_id))
    learner.next_recommendation = recommendation_text(mastery_map(db, learner.learner_id), learner.recommended_concept_id)

    interaction = models.Interaction(
        learner_id=learner.learner_id,
        concept_id=concept_id,
        interaction_type=interaction_type,
        question_id=question_id,
        learner_answer=learner_answer,
        correct=correct,
        confidence=confidence,
        hints_used=hints_used,
        misconception_id=misconception_id,
        teaching_action=teaching_action,
        mastery_before=before,
        mastery_after=after,
        evidence_summary=evidence_summary or rule_reason,
        metadata_json=metadata_json or {},
    )
    db.add(interaction)
    db.flush()
    refresh_alerts_for_learner(db, learner.learner_id)
    return interaction


def choose_question(db: Session, learner: models.Learner, concept_id: str | None) -> tuple[models.Question, str]:
    profile = profile_payload(db, learner)
    target_concept = concept_id or profile["recommended_concept_id"]
    mastery = get_mastery_row(db, learner.learner_id, target_concept).mastery_score
    recent = db.scalars(
        select(models.Interaction)
        .where(models.Interaction.learner_id == learner.learner_id, models.Interaction.concept_id == target_concept)
        .order_by(models.Interaction.created_at.desc())
        .limit(4)
    ).all()
    repeated_errors = sum(1 for item in recent if item.correct is False)
    low_conf = any(item.confidence is not None and item.confidence <= 2 for item in recent)
    strong_recent = len(recent) >= 2 and all(item.correct is True for item in recent[:2]) and mastery >= 70

    if repeated_errors >= 2:
        difficulty, reason = "Basic", "Repeated incorrect attempts triggered an easier consolidation question."
    elif low_conf:
        difficulty, reason = "Basic" if mastery < 60 else "Intermediate", "Low confidence triggered a confidence-building question."
    elif strong_recent:
        difficulty, reason = "Advanced", "Strong recent mastery triggered a challenge question."
    elif mastery < 40:
        difficulty, reason = "Basic", "Weak mastery triggered a basic question."
    elif mastery < 70:
        difficulty, reason = "Intermediate", "Developing mastery triggered an intermediate question."
    else:
        difficulty, reason = "Advanced", "Mastered status triggered an advanced question."

    question = db.scalar(
        select(models.Question)
        .where(models.Question.concept_id == target_concept, models.Question.difficulty == difficulty)
        .order_by(func.random())
    )
    if question is None:
        question = db.scalar(select(models.Question).where(models.Question.concept_id == target_concept).order_by(func.random()))
    if question is None:
        question = db.scalar(select(models.Question).order_by(func.random()))
    return question, reason


def grade_answer(question: models.Question, answer: str) -> tuple[bool, str]:
    normalized = _normalize(answer)
    correct = _normalize(question.correct_answer)
    if question.question_type == "Multiple choice":
        option_hit = normalized == correct or normalized[:1] == correct[:1]
        return option_hit, "Matched the expected option." if option_hit else "The selected option does not match the concept being tested."
    keywords = [part.strip() for part in correct.split("|")]
    hits = [keyword for keyword in keywords if keyword and keyword in normalized]
    needed = 1 if len(keywords) <= 2 else 2
    is_correct = len(hits) >= needed
    return is_correct, "Your answer included the key idea." if is_correct else "Your answer missed one or more key concept signals."


def safeguard_direct_answer_request(text: str) -> bool:
    lowered = text.lower()
    return any(phrase in lowered for phrase in ["just give me the answer", "give answer", "tell me the answer", "final answer only"])


def refresh_alerts_for_learner(db: Session, learner_id: str) -> None:
    db.query(models.EducatorAlert).filter(models.EducatorAlert.learner_id == learner_id).delete()
    learner = db.get(models.Learner, learner_id)
    if learner is None:
        return
    mastery = db.scalars(select(models.LearnerMastery).where(models.LearnerMastery.learner_id == learner_id)).all()
    interactions = db.scalars(
        select(models.Interaction).where(models.Interaction.learner_id == learner_id).order_by(models.Interaction.created_at.desc()).limit(80)
    ).all()
    by_concept: dict[str, list[models.Interaction]] = defaultdict(list)
    for item in interactions:
        by_concept[item.concept_id].append(item)

    for row in mastery:
        if row.mastery_score < 35:
            _add_alert(db, learner_id, row.concept_id, "Low mastery alert", f"Mastery is {row.mastery_score:.0f}/100.", "Schedule a short reteach and assign one basic check question.", "high")
        concept_items = by_concept.get(row.concept_id, [])
        if sum(item.hints_used for item in concept_items[:6]) >= 6:
            _add_alert(db, learner_id, row.concept_id, "Excessive hint usage alert", "Six or more hints used in recent attempts.", "Use prerequisite review before more assessment.", "medium")
        if sum(1 for item in concept_items[:5] if item.correct is False) >= 3:
            _add_alert(db, learner_id, row.concept_id, "Repeated incorrect attempts alert", "Three recent incorrect attempts on the same concept.", "Give a worked example, then a near-transfer question.", "high")
        low_conf = [item.confidence for item in concept_items[:6] if item.confidence is not None and item.confidence <= 2]
        if len(low_conf) >= 3:
            _add_alert(db, learner_id, row.concept_id, "Low confidence alert", "Three recent low-confidence responses.", "Pair the learner with confidence-building oral explanation.", "medium")
        misconception_counts = Counter(item.misconception_id for item in concept_items if item.misconception_id)
        for misconception_id, count in misconception_counts.items():
            if count >= 2:
                _add_alert(db, learner_id, row.concept_id, "Repeated misconception alert", f"{misconception_id} appeared {count} times.", "Use misconception contrast: ask learner to explain why the tempting answer is wrong.", "high")
        if row.mastery_score >= 82 and _recent_accuracy(concept_items[:5]) >= 0.8:
            _add_alert(db, learner_id, row.concept_id, "Advanced learner ready for challenge alert", f"Mastery is {row.mastery_score:.0f}/100 with strong recent accuracy.", "Assign an advanced Java design or debugging challenge.", "low")
    db.flush()


def educator_overview(db: Session) -> dict:
    learners = db.scalars(select(models.Learner).order_by(models.Learner.created_at.desc())).all()
    for learner in learners:
        ensure_mastery_records(db, learner)
        refresh_alerts_for_learner(db, learner.learner_id)
    db.flush()
    mastery_rows = db.scalars(select(models.LearnerMastery)).all()
    class_mastery = round(mean([row.mastery_score for row in mastery_rows]), 1) if mastery_rows else 0
    concept_summary = []
    for concept in CONCEPTS:
        rows = [row.mastery_score for row in mastery_rows if row.concept_id == concept["concept_id"]]
        concept_summary.append({
            **concept,
            "average_mastery": round(mean(rows), 1) if rows else 0,
            "weak_count": sum(1 for score in rows if score < 40),
        })
    misconceptions = db.scalars(select(models.Interaction.misconception_id).where(models.Interaction.misconception_id.is_not(None))).all()
    return {
        "learner_count": len(learners),
        "overall_class_mastery": class_mastery,
        "concept_difficulty_summary": concept_summary,
        "recurring_misconceptions": Counter(misconceptions).most_common(8),
        "learners": [profile_payload(db, learner) for learner in learners],
        "recommended_actions": [
            "Start with concepts that have the highest weak_count.",
            "Use misconception contrast for repeated high-confidence errors.",
            "Offer extension tasks to learners flagged as ready for challenge.",
        ],
    }


def _normalize(text: str) -> str:
    return " ".join(str(text).strip().lower().replace(";", "").replace(".", "").split())


def _repeated_misconception_id(recent: list[models.Interaction]) -> str | None:
    counts = Counter(item.misconception_id for item in recent if item.misconception_id)
    for key, count in counts.items():
        if count >= 2:
            return key
    return None


def _recent_accuracy(items: list[models.Interaction]) -> float:
    graded = [item for item in items if item.correct is not None]
    if not graded:
        return 0
    return sum(1 for item in graded if item.correct) / len(graded)


def _add_alert(db: Session, learner_id: str, concept_id: str, alert_type: str, evidence: str, action: str, severity: str) -> None:
    db.add(models.EducatorAlert(
        learner_id=learner_id,
        concept_id=concept_id,
        alert_type=alert_type,
        evidence=evidence,
        recommended_action=action,
        severity=severity,
    ))
