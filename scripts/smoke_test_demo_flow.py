import json
import sys
import urllib.error
import urllib.request


BASE_URL = "http://localhost:8000"


def call(method: str, path: str, payload: dict | None = None, token: str | None = None, expected_status: int = 200) -> dict | list:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=data,
        method=method,
        headers=headers,
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as res:
            body = res.read().decode("utf-8")
            if res.status != expected_status:
                raise RuntimeError(f"{method} {path} expected {expected_status}, got {res.status}: {body}")
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8")
        if exc.code == expected_status:
            return json.loads(detail) if detail else {}
        raise RuntimeError(f"{method} {path} failed: {exc.code} {detail}") from exc


def main() -> int:
    seed = call("POST", "/api/demo/seed")
    call("GET", "/api/learners", expected_status=401)
    learner_token = call("POST", "/api/auth/login", {"email": "beginner@learnshift.ai", "password": "password123"})["access_token"]
    educator_token = call("POST", "/api/auth/login", {"email": "educator@learnshift.ai", "password": "password123"})["access_token"]

    me = call("GET", "/api/auth/me", token=learner_token)
    assert me["role"] == "learner" and me["learner_id"] == "demo_beginner"
    assert me["diagnostic_completed"] is False, "demo beginner should require first-login diagnostic"
    learners = call("GET", "/api/learners", token=learner_token)
    assert len(learners) == 1 and learners[0]["learner_id"] == "demo_beginner", "learner should only see their own profile"
    beginner = "demo_beginner"
    advanced = "demo_advanced"
    call("GET", f"/api/learners/{beginner}/profile", token=learner_token, expected_status=403)
    call("GET", f"/api/learners/{advanced}/profile", token=learner_token, expected_status=403)
    call("POST", "/api/teach", {"learner_id": beginner, "concept_id": "C005"}, token=learner_token, expected_status=403)

    diagnostic = call("POST", "/api/diagnostic/start", token=learner_token)
    answers = [
        {"question_id": q["question_id"], "learner_answer": "A", "confidence": 3, "time_spent_seconds": 5}
        for q in diagnostic["questions"]
    ]
    call("POST", "/api/diagnostic/submit", {"learner_id": beginner, "answers": answers}, token=learner_token)
    me = call("GET", "/api/auth/me", token=learner_token)
    assert me["diagnostic_completed"] is True and me["diagnostic_completed_at"], "diagnostic submit should mark completion"
    profile = call("GET", f"/api/learners/{beginner}/profile", token=learner_token)
    assert profile["learner_id"] == beginner and profile["diagnostic_completed"] is True

    teach_beginner = call("POST", "/api/teach", {"learner_id": beginner, "concept_id": "C005"}, token=learner_token)
    call("POST", "/api/teach", {"learner_id": advanced, "concept_id": "C005"}, token=learner_token, expected_status=403)
    teach_advanced = call("POST", "/api/teach", {"learner_id": advanced, "concept_id": "C005"}, token=educator_token)
    assert teach_beginner.get("teaching_action") != teach_advanced.get("teaching_action"), "teaching actions should differ"

    next_question = call("POST", "/api/assessment/next", {"learner_id": beginner, "concept_id": "C005"}, token=learner_token)
    question_id = next_question["question"]["question_id"]
    for count in range(3):
        call("POST", "/api/hints/next", {"learner_id": beginner, "question_id": question_id, "current_hint_count": count}, token=learner_token)
    call("POST", "/api/assessment/submit", {
        "learner_id": beginner,
        "question_id": question_id,
        "learner_answer": "wrong answer",
        "confidence": 2,
        "hints_used": 3,
    }, token=learner_token)

    tutor = call("POST", "/api/tutor/confusion", {
        "learner_id": beginner,
        "message": "Overriding is when one class has methods with different parameters.",
        "confidence": 4,
    }, token=learner_token)
    assert tutor.get("reframe") and tutor.get("guiding_question") and tutor.get("source_references"), "tutor response missing structured fields"

    in_scope = call("POST", "/api/rag/answer", {"question": "What is encapsulation in Java?"}, token=learner_token)
    assert in_scope.get("in_scope") is True
    out_scope = call("POST", "/api/rag/answer", {"question": "Explain photosynthesis"}, token=learner_token)
    assert out_scope.get("in_scope") is False

    call("GET", "/api/educator/overview", token=learner_token, expected_status=403)
    overview = call("GET", "/api/educator/overview", token=educator_token)
    alerts = call("GET", "/api/educator/alerts", token=educator_token)
    detail = call("GET", f"/api/educator/learners/{beginner}", token=educator_token)
    logs = call("GET", "/api/educator/ai-logs", token=educator_token)
    assert overview["learner_count"] >= 5 and alerts and detail["timeline"] and logs
    print("Smoke test passed.")
    print(json.dumps({"seed": seed, "learners": len(learners), "alerts": len(alerts), "ai_logs": len(logs)}, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Smoke test failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
