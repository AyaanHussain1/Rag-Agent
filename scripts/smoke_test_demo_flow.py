import json
import sys
import urllib.error
import urllib.request


BASE_URL = "http://localhost:8000"


def call(method: str, path: str, payload: dict | None = None) -> dict | list:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=data,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            body = res.read().decode("utf-8")
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8")
        raise RuntimeError(f"{method} {path} failed: {exc.code} {detail}") from exc


def main() -> int:
    seed = call("POST", "/api/demo/seed")
    learners = call("GET", "/api/learners")
    assert len(learners) >= 5, "expected at least 5 learners"
    beginner = "demo_beginner"
    advanced = "demo_advanced"
    profile = call("GET", f"/api/learners/{beginner}/profile")
    assert profile["learner_id"] == beginner

    diagnostic = call("POST", "/api/diagnostic/start")
    answers = [
        {"question_id": q["question_id"], "learner_answer": "A", "confidence": 3, "time_spent_seconds": 5}
        for q in diagnostic["questions"]
    ]
    call("POST", "/api/diagnostic/submit", {"learner_id": beginner, "answers": answers})

    teach_beginner = call("POST", "/api/teach", {"learner_id": beginner, "concept_id": "C005"})
    teach_advanced = call("POST", "/api/teach", {"learner_id": advanced, "concept_id": "C005"})
    assert teach_beginner.get("teaching_action") != teach_advanced.get("teaching_action"), "teaching actions should differ"

    next_question = call("POST", "/api/assessment/next", {"learner_id": beginner, "concept_id": "C005"})
    question_id = next_question["question"]["question_id"]
    for count in range(3):
        call("POST", "/api/hints/next", {"learner_id": beginner, "question_id": question_id, "current_hint_count": count})
    call("POST", "/api/assessment/submit", {
        "learner_id": beginner,
        "question_id": question_id,
        "learner_answer": "wrong answer",
        "confidence": 2,
        "hints_used": 3,
    })

    tutor = call("POST", "/api/tutor/confusion", {
        "learner_id": beginner,
        "message": "Overriding is when one class has methods with different parameters.",
        "confidence": 4,
    })
    assert tutor.get("reframe") and tutor.get("guiding_question") and tutor.get("source_references"), "tutor response missing structured fields"

    in_scope = call("POST", "/api/rag/answer", {"question": "What is encapsulation in Java?"})
    assert in_scope.get("in_scope") is True
    out_scope = call("POST", "/api/rag/answer", {"question": "Explain photosynthesis"})
    assert out_scope.get("in_scope") is False

    overview = call("GET", "/api/educator/overview")
    alerts = call("GET", "/api/educator/alerts")
    detail = call("GET", f"/api/educator/learners/{beginner}")
    logs = call("GET", "/api/educator/ai-logs")
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
