from datetime import datetime
import os

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import adaptive, auth, models, schemas, seed
from .auth import get_current_user, require_role
from .database import Base, engine, get_db
from .rag_service import OUT_OF_SCOPE_MESSAGE, rag_service


app = FastAPI(title="LearnShift AI Adaptive Learning API", version="1.0.0")

default_origins = {
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
}
configured_origins = {
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(configured_origins or default_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from mangum import Mangum
handler = Mangum(app)
@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "learnshift-ai", "rag_model": rag_service.model_name}


@app.get("/api/diag/gemini")
def diag_gemini(_: models.User = Depends(require_role("educator"))) -> dict:
    return rag_service.diagnose()


@app.post("/api/demo/seed")
def seed_demo(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("educator")),
) -> dict:
    return seed.seed_demo(db)


@app.post("/api/auth/register", response_model=schemas.TokenResponse)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)) -> dict:
    role = payload.role.lower().strip()
    if role not in {"learner", "educator"}:
        raise HTTPException(status_code=400, detail="Role must be learner or educator")
    email = payload.email.lower().strip()
    existing = db.scalar(select(models.User).where(models.User.email == email))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
    learner_id = None
    if role == "learner":
        seed.ensure_seeded(db)
        learner = models.Learner(display_name=payload.name, current_level="BEGINNER")
        db.add(learner)
        db.flush()
        adaptive.ensure_mastery_records(db, learner)
        learner.recommended_concept_id = "C001"
        learner.next_recommendation = "Start with the diagnostic or review Classes and Objects."
        learner_id = learner.learner_id
    user = models.User(
        email=email,
        password_hash=auth.hash_password(payload.password),
        name=payload.name,
        role=role,
        learner_id=learner_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"access_token": auth.create_access_token(user)}


@app.post("/api/auth/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)) -> dict:
    user = auth.authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return {"access_token": auth.create_access_token(user)}


@app.get("/api/auth/me", response_model=schemas.CurrentUserResponse)
def me(current_user: models.User = Depends(get_current_user)) -> dict:
    return user_payload(current_user)


@app.post("/api/auth/logout")
def logout() -> dict:
    return {"ok": True}


@app.post("/api/learners")
def create_learner(
    payload: schemas.LearnerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("learner", "educator")),
) -> dict:
    if current_user.role == "learner" and current_user.learner_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Learner account already has a linked profile")
    seed.ensure_seeded(db)
    learner = models.Learner(display_name=payload.display_name, current_level=payload.current_level.upper())
    db.add(learner)
    db.flush()
    adaptive.ensure_mastery_records(db, learner)
    learner.recommended_concept_id = "C001"
    learner.next_recommendation = "Start with the diagnostic or review Classes and Objects."
    if current_user.role == "learner":
        current_user.learner_id = learner.learner_id
    db.commit()
    db.refresh(learner)
    return learner_payload(db, learner)


@app.get("/api/learners")
def list_learners(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("learner", "educator")),
) -> list[dict]:
    seed.ensure_seeded(db)
    if current_user.role == "learner":
        if not current_user.learner_id:
            return []
        learners = [require_learner_for_user(db, current_user.learner_id, current_user)]
    else:
        learners = db.scalars(select(models.Learner).order_by(models.Learner.created_at.desc())).all()
    return [learner_payload(db, learner) for learner in learners]


@app.get("/api/learners/{learner_id}")
def get_learner(
    learner_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("learner", "educator")),
) -> dict:
    learner = require_learner_for_user(db, learner_id, current_user)
    return learner_payload(db, learner)


@app.get("/api/learners/{learner_id}/profile")
def get_profile(
    learner_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("learner", "educator")),
) -> dict:
    learner = require_learner_for_user(db, learner_id, current_user)
    return adaptive.profile_payload(db, learner) | {"recent_interactions": recent_interactions(db, learner_id)}


@app.post("/api/diagnostic/start")
def diagnostic_start(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("learner", "educator")),
) -> dict:
    seed.ensure_seeded(db)
    question_ids = ["Q_C001_B1", "Q_C002_B1", "Q_C003_I1", "Q_C004_I1", "Q_C005_I1", "Q_C006_B1"]
    questions = db.scalars(select(models.Question).where(models.Question.question_id.in_(question_ids))).all()
    ordered = sorted(questions, key=lambda q: question_ids.index(q.question_id))
    return {"questions": [question_payload(question) for question in ordered]}


@app.post("/api/diagnostic/submit")
def diagnostic_submit(
    payload: schemas.DiagnosticSubmit,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("learner", "educator")),
) -> dict:
    learner = require_learner_for_user(db, payload.learner_id, current_user)
    expected_question_ids = {
        "Q_C001_B1",
        "Q_C002_B1",
        "Q_C003_I1",
        "Q_C004_I1",
        "Q_C005_I1",
        "Q_C006_B1",
    }
    submitted_question_ids = [answer.question_id for answer in payload.answers]
    if len(submitted_question_ids) != len(set(submitted_question_ids)) or set(submitted_question_ids) != expected_question_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please submit each initial diagnostic question exactly once.",
        )
    results = []
    for answer in payload.answers:
        question = require_question(db, answer.question_id)
        correct, feedback = adaptive.grade_answer(question, answer.learner_answer)
        misconception_id = None if correct else question.misconception_id
        adaptive.record_interaction(
            db,
            learner,
            question.concept_id,
            "diagnostic",
            question.question_id,
            answer.learner_answer,
            correct,
            answer.confidence,
            0,
            misconception_id,
            None,
            feedback,
            {"time_spent_seconds": answer.time_spent_seconds},
        )
        results.append({"question_id": question.question_id, "correct": correct, "feedback": feedback})
    learner.diagnostic_completed = True
    learner.diagnostic_completed_at = datetime.utcnow()
    db.commit()
    profile = adaptive.profile_payload(db, learner)
    return {"results": results, "profile": profile, "starting_concept_id": profile["recommended_concept_id"]}


@app.post("/api/rag/answer")
def rag_answer(
    payload: schemas.RAGAnswerRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("learner", "educator")),
) -> dict:
    learner_level = "INTERMEDIATE"
    learner_id_for_log = payload.learner_id
    if payload.learner_id:
        learner = require_learner_for_user(db, payload.learner_id, current_user, require_diagnostic=True)
        learner_level = learner.current_level
    elif current_user.role == "learner":
        if not current_user.learner_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Learner account has no linked profile")
        learner = require_learner_for_user(db, current_user.learner_id, current_user, require_diagnostic=True)
        learner_level = learner.current_level
        learner_id_for_log = learner.learner_id
    result = rag_service.answer(payload.question, learner_level)
    db.add(models.AIUsageLog(
        learner_id=learner_id_for_log,
        endpoint="/api/rag/answer",
        model_name=result.get("model_name", rag_service.model_name),
        prompt_summary=payload.question[:300],
        source_metadata={
            "sources": result.get("sources", []),
            "source_grounding_used": bool(result.get("sources")),
            "safeguard_triggered": not result.get("in_scope", False),
        },
    ))
    db.commit()
    return result


@app.post("/api/teach")
def teach(
    payload: schemas.TeachRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("learner", "educator")),
) -> dict:
    learner = require_learner_for_user(db, payload.learner_id, current_user, require_diagnostic=True)
    concept_id = payload.concept_id or adaptive.profile_payload(db, learner)["recommended_concept_id"]
    action, reason, rule_id = (payload.action, "Learner manually selected this teaching action.", "MANUAL") if payload.action else adaptive.select_teaching_action(db, learner.learner_id, concept_id)
    result = rag_service.teach(concept_id, action, learner.current_level, reason)
    if not result.get("in_scope"):
        db.add(models.AIUsageLog(
            learner_id=learner.learner_id,
            endpoint="/api/teach",
            model_name=result.get("model_name", rag_service.model_name),
            prompt_summary=f"{concept_id}: {action}",
            source_metadata={"safeguard_triggered": True, "source_grounding_used": False},
        ))
        db.commit()
        return result
    interaction = adaptive.record_interaction(
        db,
        learner,
        concept_id,
        "teaching",
        None,
        None,
        None,
        None,
        0,
        None,
        action,
        reason,
        {"sources": result.get("sources", []), "matched_adaptation_rule_id": rule_id},
    )
    db.add(models.AIUsageLog(
        learner_id=learner.learner_id,
        endpoint="/api/teach",
        model_name=result.get("model_name", rag_service.model_name),
        prompt_summary=f"{concept_id}: {action}",
        source_metadata={"sources": result.get("sources", []), "source_grounding_used": bool(result.get("sources")), "safeguard_triggered": False},
    ))
    db.commit()
    return result | {"profile": adaptive.profile_payload(db, learner), "interaction_id": interaction.interaction_id, "matched_adaptation_rule_id": rule_id}


@app.post("/api/tutor/confusion")
def tutor_confusion(
    payload: schemas.TutorConfusionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("learner", "educator")),
) -> dict:
    learner = require_learner_for_user(db, payload.learner_id, current_user, require_diagnostic=True)
    concept_id = adaptive.detect_concept_id(payload.message, learner.recommended_concept_id) or "C001"
    misconception = best_misconception(db, concept_id, payload.message)
    _, rule_reason, rule_id = adaptive.select_teaching_action(db, learner.learner_id, concept_id)
    result = rag_service.tutor_reframe(payload.message, concept_id, misconception.recommended_intervention, learner.current_level)
    profile_reason = f"Tutor detected {misconception.misconception_id}: {misconception.misconception_description}. {rule_reason}"
    adaptive.record_interaction(
        db,
        learner,
        concept_id,
        "tutor_confusion",
        None,
        payload.message,
        False,
        payload.confidence,
        0,
        misconception.misconception_id,
        "misconception-focused reframe",
        profile_reason,
        {"sources": result.get("sources", []), "matched_adaptation_rule_id": rule_id},
    )
    db.add(models.AIUsageLog(
        learner_id=learner.learner_id,
        endpoint="/api/tutor/confusion",
        model_name=result.get("model_name", rag_service.model_name),
        prompt_summary=payload.message[:300],
        source_metadata={"sources": result.get("sources", []), "source_grounding_used": bool(result.get("sources")), "safeguard_triggered": False},
    ))
    db.commit()
    return result | {
        "detected_concept_id": concept_id,
        "detected_misconception_id": misconception.misconception_id,
        "misconception": misconception_payload(misconception),
        "reframe": result.get("response"),
        "guiding_question": rag_service.guiding_question(concept_id),
        "follow_up_check": f"In one sentence, explain why this is {adaptive.CONCEPTS_BY_ID.get(concept_id, {}).get('concept_name', concept_id)} and not a neighboring OOP concept.",
        "profile_update_reason": profile_reason,
        "source_references": result.get("sources", []),
        "matched_adaptation_rule_id": rule_id,
        "profile": adaptive.profile_payload(db, learner),
    }


@app.post("/api/assessment/next")
def assessment_next(
    payload: schemas.AssessmentNextRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("learner", "educator")),
) -> dict:
    seed.ensure_seeded(db)
    learner = require_learner_for_user(db, payload.learner_id, current_user, require_diagnostic=True)
    question, reason, rule_id = adaptive.choose_question(db, learner, payload.concept_id)
    return {"question": question_payload(question, hide_answer=True), "why_selected": reason, "matched_adaptation_rule_id": rule_id, "profile": adaptive.profile_payload(db, learner)}


@app.post("/api/assessment/submit")
def assessment_submit(
    payload: schemas.AssessmentSubmitRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("learner", "educator")),
) -> dict:
    learner = require_learner_for_user(db, payload.learner_id, current_user, require_diagnostic=True)
    question = require_question(db, payload.question_id)
    if adaptive.safeguard_direct_answer_request(payload.learner_answer):
        message = "I cannot give the final answer during assessment. I can offer a hint or guide you through the first step."
        adaptive.record_interaction(
            db, learner, question.concept_id, "assessment_safeguard", question.question_id,
            payload.learner_answer, None, payload.confidence, payload.hints_used, None, None, message
        )
        db.add(models.AIUsageLog(
            learner_id=learner.learner_id,
            endpoint="/api/assessment/submit",
            model_name="deterministic-fallback",
            prompt_summary=payload.learner_answer[:300],
            source_metadata={"safeguard_triggered": True, "source_grounding_used": False, "question_id": question.question_id},
        ))
        db.commit()
        return {"safeguard": True, "feedback": message, "matched_adaptation_rule_id": "AR012", "profile": adaptive.profile_payload(db, learner)}

    correct, feedback = adaptive.grade_answer(question, payload.learner_answer)
    misconception_id = None if correct else question.misconception_id
    feedback, feedback_rule_id = adaptive.assessment_feedback(db, learner, question, correct, feedback, payload.confidence, payload.hints_used)
    if not correct:
        intervention = best_misconception(db, question.concept_id, payload.learner_answer).recommended_intervention
        feedback = f"{feedback} {intervention}"
    attempt = models.AssessmentAttempt(
        learner_id=learner.learner_id,
        question_id=question.question_id,
        concept_id=question.concept_id,
        learner_answer=payload.learner_answer,
        correct=correct,
        confidence=payload.confidence,
        hints_used=payload.hints_used,
        misconception_id=misconception_id,
        feedback=feedback,
    )
    db.add(attempt)
    interaction = adaptive.record_interaction(
        db,
        learner,
        question.concept_id,
        "assessment",
        question.question_id,
        payload.learner_answer,
        correct,
        payload.confidence,
        payload.hints_used,
        misconception_id,
        None,
        feedback,
    )
    db.commit()
    return {
        "correct": correct,
        "feedback": feedback,
        "attempt_id": attempt.attempt_id,
        "interaction_id": interaction.interaction_id,
        "matched_adaptation_rule_id": feedback_rule_id,
        "profile": adaptive.profile_payload(db, learner),
    }


@app.post("/api/hints/next")
def hints_next(
    payload: schemas.HintNextRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("learner", "educator")),
) -> dict:
    seed.ensure_seeded(db)
    learner = require_learner_for_user(db, payload.learner_id, current_user, require_diagnostic=True)
    question = require_question(db, payload.question_id)
    ladder = db.get(models.HintLadder, payload.question_id)
    next_count = min(payload.current_hint_count + 1, 3)
    if not ladder:
        seed.seed_reference_data(db)
        ladder = db.get(models.HintLadder, payload.question_id)
    if not ladder:
        raise HTTPException(status_code=404, detail="No hint ladder found for this question")
    hint = getattr(ladder, f"hint_step_{next_count}")
    mastery = adaptive.get_mastery_row(db, learner.learner_id, question.concept_id)
    learner.hint_count = (learner.hint_count or 0) + 1
    db.add(models.Interaction(
        learner_id=learner.learner_id,
        concept_id=question.concept_id,
        interaction_type="hint",
        question_id=question.question_id,
        hints_used=1,
        mastery_before=mastery.mastery_score,
        mastery_after=mastery.mastery_score,
        evidence_summary=f"Hint {next_count} requested; later correct answers will receive a smaller mastery gain.",
    ))
    db.commit()
    return {"hint": hint, "hint_count": next_count, "exhausted": next_count >= 3, "profile": adaptive.profile_payload(db, learner)}


@app.get("/api/educator/overview")
def educator_overview(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("educator")),
) -> dict:
    seed.ensure_seeded(db)
    overview = adaptive.educator_overview(db)
    db.commit()
    return overview


@app.get("/api/educator/alerts")
def educator_alerts(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("educator")),
) -> list[dict]:
    alerts = db.scalars(select(models.EducatorAlert).where(models.EducatorAlert.active == True).order_by(models.EducatorAlert.created_at.desc())).all()
    return [alert_payload(db, alert) for alert in alerts]


@app.get("/api/educator/ai-logs")
def educator_ai_logs(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("educator")),
) -> list[dict]:
    rows = db.scalars(select(models.AIUsageLog).order_by(models.AIUsageLog.created_at.desc()).limit(40)).all()
    return [ai_log_payload(row) for row in rows]


@app.get("/api/educator/learners/{learner_id}")
def educator_learner_detail(
    learner_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("educator")),
) -> dict:
    learner = require_learner(db, learner_id)
    adaptive.refresh_alerts_for_learner(db, learner_id)
    db.commit()
    return {
        "profile": adaptive.profile_payload(db, learner),
        "timeline": recent_interactions(db, learner_id, limit=80),
        "alerts": [alert_payload(db, alert) for alert in db.scalars(select(models.EducatorAlert).where(models.EducatorAlert.learner_id == learner_id)).all()],
        "recommended_intervention": learner.next_recommendation,
    }


def require_learner(db: Session, learner_id: str) -> models.Learner:
    learner = db.get(models.Learner, learner_id)
    if not learner:
        raise HTTPException(status_code=404, detail="Learner not found. Seed demo data or create a learner first.")
    adaptive.ensure_mastery_records(db, learner)
    return learner


def require_learner_for_user(
    db: Session,
    learner_id: str,
    current_user: models.User,
    require_diagnostic: bool = False,
) -> models.Learner:
    if current_user.role == "learner" and current_user.learner_id != learner_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Learners can only access their own profile")
    learner = require_learner(db, learner_id)
    if require_diagnostic and current_user.role == "learner" and not learner.diagnostic_completed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Initial diagnostic must be completed first")
    return learner


def require_question(db: Session, question_id: str) -> models.Question:
    question = db.get(models.Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


def learner_payload(db: Session, learner: models.Learner) -> dict:
    profile = adaptive.profile_payload(db, learner)
    return {
        "learner_id": learner.learner_id,
        "display_name": learner.display_name,
        "current_level": learner.current_level,
        "recommended_concept_id": learner.recommended_concept_id,
        "overall_mastery": profile["overall_mastery"],
        "diagnostic_completed": learner.diagnostic_completed,
        "diagnostic_completed_at": learner.diagnostic_completed_at.isoformat() if learner.diagnostic_completed_at else None,
        "recommended_next_action": profile["next_recommendation"],
        "is_demo": learner.is_demo,
    }


def user_payload(user: models.User) -> dict:
    payload = {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "learner_id": user.learner_id,
    }
    if user.learner_id:
        learner = getattr(user, "learner", None)
        payload["diagnostic_completed"] = bool(learner and learner.diagnostic_completed)
        payload["diagnostic_completed_at"] = learner.diagnostic_completed_at.isoformat() if learner and learner.diagnostic_completed_at else None
    return payload


def question_payload(question: models.Question, hide_answer: bool = False) -> dict:
    payload = {
        "question_id": question.question_id,
        "concept_id": question.concept_id,
        "prompt": question.prompt,
        "question_type": question.question_type,
        "difficulty": question.difficulty,
        "options": question.options,
    }
    if not hide_answer:
        payload["correct_answer"] = question.correct_answer
        payload["explanation"] = question.explanation
    return payload


def misconception_payload(item: models.Misconception) -> dict:
    return {
        "misconception_id": item.misconception_id,
        "concept_id": item.concept_id,
        "description": item.misconception_description,
        "recommended_intervention": item.recommended_intervention,
    }


def alert_payload(db: Session, alert: models.EducatorAlert) -> dict:
    learner = db.get(models.Learner, alert.learner_id)
    concept = db.get(models.Concept, alert.concept_id)
    return {
        "alert_id": alert.alert_id,
        "alert_type": alert.alert_type,
        "severity": alert.severity,
        "learner_id": alert.learner_id,
        "learner_name": learner.display_name if learner else alert.learner_id,
        "concept_id": alert.concept_id,
        "concept_name": concept.concept_name if concept else alert.concept_id,
        "evidence": alert.evidence,
        "recommended_action": alert.recommended_action,
        "created_at": alert.created_at.isoformat() if alert.created_at else None,
    }


def ai_log_payload(row: models.AIUsageLog) -> dict:
    metadata = row.source_metadata or {}
    return {
        "log_id": row.log_id,
        "timestamp": row.created_at.isoformat() if row.created_at else None,
        "feature_area": row.endpoint,
        "learner_id": row.learner_id,
        "model_name": row.model_name,
        "prompt_summary": row.prompt_summary,
        "source_grounding_used": bool(metadata.get("source_grounding_used") or metadata.get("sources")),
        "safeguard_triggered": bool(metadata.get("safeguard_triggered")),
    }


def recent_interactions(db: Session, learner_id: str, limit: int = 12) -> list[dict]:
    rows = db.scalars(
        select(models.Interaction)
        .where(models.Interaction.learner_id == learner_id)
        .order_by(models.Interaction.created_at.desc())
        .limit(limit)
    ).all()
    return [
        {
            "interaction_id": row.interaction_id,
            "concept_id": row.concept_id,
            "interaction_type": row.interaction_type,
            "question_id": row.question_id,
            "learner_answer": row.learner_answer,
            "correct": row.correct,
            "confidence": row.confidence,
            "hints_used": row.hints_used,
            "misconception_id": row.misconception_id,
            "teaching_action": row.teaching_action,
            "mastery_before": row.mastery_before,
            "mastery_after": row.mastery_after,
            "evidence_summary": row.evidence_summary,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]


def best_misconception(db: Session, concept_id: str, text: str) -> models.Misconception:
    items = db.scalars(select(models.Misconception).where(models.Misconception.concept_id == concept_id)).all()
    if not items:
        fallback = db.scalar(select(models.Misconception))
        if fallback:
            return fallback
        raise HTTPException(status_code=404, detail="No misconception bank is seeded")
    lowered = text.lower()
    for item in items:
        words = set(item.misconception_description.lower().split())
        if any(word in lowered for word in words if len(word) > 5):
            return item
    return items[0]
