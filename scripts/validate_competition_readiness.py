import csv
import json
import os
import sqlite3
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
CONCEPTS = {"C001", "C002", "C003", "C004", "C005", "C006"}
DB_PATHS = [ROOT / "learnshift_ai.db", ROOT / "services" / "ai" / "learnshift_ai.db"]
OUT_PATH = DATA / "validation" / "dataset_inventory.json"
BASE_URL = os.getenv("VALIDATION_API_BASE_URL", "http://localhost:8000")

try:
    from dotenv import load_dotenv

    load_dotenv(ROOT / ".env", override=False)
except Exception:
    pass


def read_csv(path: Path) -> list[dict]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def check(name: str, passed: bool, detail: str, results: list[dict]) -> None:
    results.append({"check": name, "status": "PASS" if passed else "FAIL", "detail": detail})


def main() -> int:
    results: list[dict] = []
    manifest_path = DATA / "sources" / "source_manifest.json"
    chunks = read_csv(DATA / "chunks" / "oop_knowledge_chunks.csv")
    questions = read_csv(DATA / "questions" / "oop_question_bank.csv")
    misconceptions = read_csv(DATA / "misconceptions" / "oop_misconceptions.csv")
    hints = read_csv(DATA / "hints" / "oop_hint_ladders.csv")
    learners = read_csv(DATA / "learners" / "learner_profiles.csv")
    interactions = read_csv(DATA / "interactions" / "demo_interactions.csv")
    rules = read_csv(DATA / "adaptation" / "adaptation_rules.csv")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    source_entries = manifest.get("sources", [])
    existing_sources = [entry for entry in source_entries if (DATA / "sources" / entry.get("file", "")).exists()]
    check("3 source documents or manifest entries", len(source_entries) >= 3 and len(existing_sources) >= 3, f"{len(existing_sources)} source files found", results)

    chunk_counts = Counter(row["concept_id"] for row in chunks)
    check("24 chunks minimum", len(chunks) >= 24, f"{len(chunks)} chunks", results)
    check("At least 4 chunks per concept", all(chunk_counts[c] >= 4 for c in CONCEPTS), str(dict(chunk_counts)), results)
    check("RAG chunks cover all six concepts", set(chunk_counts) >= CONCEPTS, str(sorted(chunk_counts)), results)

    question_counts = Counter(row["concept_id"] for row in questions)
    difficulties = {row["difficulty"] for row in questions}
    formats = {row["question_type"] for row in questions}
    check("36 questions minimum", len(questions) >= 36, f"{len(questions)} questions", results)
    check("At least 6 questions per concept", all(question_counts[c] >= 6 for c in CONCEPTS), str(dict(question_counts)), results)
    check("Basic Intermediate Advanced coverage", {"Basic", "Intermediate", "Advanced"} <= difficulties, str(sorted(difficulties)), results)
    check("At least 4 question formats", len(formats) >= 4, str(sorted(formats)), results)

    misconception_counts = Counter(row["concept_id"] for row in misconceptions)
    check("12 misconceptions minimum", len(misconceptions) >= 12, f"{len(misconceptions)} misconceptions", results)
    check("At least 2 misconceptions per concept", all(misconception_counts[c] >= 2 for c in CONCEPTS), str(dict(misconception_counts)), results)

    complete_hints = [
        row for row in hints
        if row.get("hint_step_1") and row.get("hint_step_2") and row.get("hint_step_3") and row.get("final_explanation")
    ]
    check("12 hint ladders minimum", len(hints) >= 12, f"{len(hints)} hint ladders", results)
    check("Each hint ladder has 3 hints plus final explanation", len(complete_hints) == len(hints), f"{len(complete_hints)}/{len(hints)} complete", results)

    check("5 learners minimum", len(learners) >= 5, f"{len(learners)} learners", results)
    check("75 interactions minimum", len(interactions) >= 75, f"{len(interactions)} interactions", results)
    incorrect = [row for row in interactions if row.get("correct", "").lower() == "false"]
    hinted = [row for row in interactions if int(row.get("hints_used") or 0) > 0]
    check("At least 30 percent incorrect interactions", len(incorrect) / max(1, len(interactions)) >= 0.30, f"{len(incorrect)}/{len(interactions)} incorrect", results)
    check("At least 20 percent interactions involve hints", len(hinted) / max(1, len(interactions)) >= 0.20, f"{len(hinted)}/{len(interactions)} hinted", results)
    check("12 adaptation rules minimum", len(rules) >= 12, f"{len(rules)} rules", results)

    expected_alert_types = {
        "Repeated misconception alert",
        "Low mastery alert",
        "High confidence but incorrect alert",
        "Excessive hint usage alert",
        "No progress after repeated attempts alert",
        "Advanced learner ready for challenge alert",
    }
    db_details = validate_db(expected_alert_types)
    for item in db_details:
        results.append(item)
    for item in validate_auth_api():
        results.append(item)

    passed = sum(1 for item in results if item["status"] == "PASS")
    percentage = round(passed / len(results) * 100, 1)
    failed = [item for item in results if item["status"] == "FAIL"]
    payload = {"summary_percentage": percentage, "passed": passed, "total": len(results), "failed_checks": failed, "checks": results}
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    for item in results:
        print(f"{item['status']}: {item['check']} - {item['detail']}")
    print(f"SUMMARY: {percentage}% ({passed}/{len(results)})")
    if failed:
        print("FAILED CHECKS:")
        for item in failed:
            print(f"- {item['check']}: {item['detail']}")
        return 1
    return 0


def validate_db(expected_alert_types: set[str]) -> list[dict]:
    results: list[dict] = []
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        sqlalchemy_results = validate_db_with_sqlalchemy(database_url, expected_alert_types)
        if sqlalchemy_results:
            return sqlalchemy_results
    db_path = select_db_path()
    if db_path is None:
        check("AI usage log table has records after seed/demo", False, "SQLite DB not found; run backend seed first", results)
        check("6 educator alert types minimum", False, "SQLite DB not found; run backend seed first", results)
        return results
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    tables = {row[0] for row in cur.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    check("AI usage log table exists", "ai_usage_logs" in tables, str(sorted(tables)), results)
    ai_count = cur.execute("SELECT COUNT(*) FROM ai_usage_logs").fetchone()[0] if "ai_usage_logs" in tables else 0
    check("AI usage log table has records after seed/demo", ai_count > 0, f"{ai_count} AI log rows", results)
    alert_types = {row[0] for row in cur.execute("SELECT DISTINCT alert_type FROM educator_alerts")} if "educator_alerts" in tables else set()
    check("6 educator alert types minimum", len(alert_types) >= 6 and expected_alert_types <= alert_types, str(sorted(alert_types)), results)
    db_concepts = cur.execute("SELECT COUNT(*) FROM concepts").fetchone()[0] if "concepts" in tables else 0
    check("6 concepts exist in database", db_concepts >= 6, f"{db_concepts} concepts", results)
    db_learners = cur.execute("SELECT COUNT(*) FROM learners WHERE is_demo = 1").fetchone()[0] if "learners" in tables else 0
    check("5 demo learners after seeding", db_learners >= 5, f"{db_learners} demo learners", results)
    users_count = cur.execute("SELECT COUNT(*) FROM users").fetchone()[0] if "users" in tables else 0
    check("Users table exists", "users" in tables, str(sorted(tables)), results)
    check("3 demo users after seeding", users_count >= 3, f"{users_count} users", results)
    demo_user_rows = (
        cur.execute(
            "SELECT email, role, learner_id FROM users WHERE email IN (?, ?, ?)",
            ("beginner@learnshift.ai", "advanced@learnshift.ai", "educator@learnshift.ai"),
        ).fetchall()
        if "users" in tables
        else []
    )
    expected_users = {
        ("beginner@learnshift.ai", "learner", "demo_beginner"),
        ("advanced@learnshift.ai", "learner", "demo_advanced"),
        ("educator@learnshift.ai", "educator", None),
    }
    check("Demo users linked to learner profiles", expected_users <= set(demo_user_rows), str(demo_user_rows), results)
    db_interactions = cur.execute("SELECT COUNT(*) FROM interactions").fetchone()[0] if "interactions" in tables else 0
    check("75 interactions after seeding", db_interactions >= 75, f"{db_interactions} interactions", results)
    con.close()
    return results


def select_db_path() -> Path | None:
    candidates = [path for path in DB_PATHS if path.exists()]
    if not candidates:
        return None
    scored: list[tuple[int, Path]] = []
    for path in candidates:
        try:
            con = sqlite3.connect(path)
            cur = con.cursor()
            tables = {row[0] for row in cur.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            count = cur.execute("SELECT COUNT(*) FROM interactions").fetchone()[0] if "interactions" in tables else 0
            con.close()
            scored.append((count, path))
        except sqlite3.Error:
            scored.append((0, path))
    return sorted(scored, key=lambda item: item[0], reverse=True)[0][1]


def validate_db_with_sqlalchemy(database_url: str, expected_alert_types: set[str]) -> list[dict]:
    try:
        from sqlalchemy import create_engine, inspect, text
    except Exception:
        return []
    results: list[dict] = []
    try:
        engine = create_engine(database_url, pool_pre_ping=True)
        with engine.connect() as con:
            tables = set(inspect(con).get_table_names())
            check("AI usage log table exists", "ai_usage_logs" in tables, str(sorted(tables)), results)
            ai_count = con.execute(text("SELECT COUNT(*) FROM ai_usage_logs")).scalar() if "ai_usage_logs" in tables else 0
            check("AI usage log table has records after seed/demo", ai_count > 0, f"{ai_count} AI log rows", results)
            alert_types = {row[0] for row in con.execute(text("SELECT DISTINCT alert_type FROM educator_alerts"))} if "educator_alerts" in tables else set()
            check("6 educator alert types minimum", len(alert_types) >= 6 and expected_alert_types <= alert_types, str(sorted(alert_types)), results)
            db_concepts = con.execute(text("SELECT COUNT(*) FROM concepts")).scalar() if "concepts" in tables else 0
            check("6 concepts exist in database", db_concepts >= 6, f"{db_concepts} concepts", results)
            db_learners = con.execute(text("SELECT COUNT(*) FROM learners WHERE is_demo = 1")).scalar() if "learners" in tables else 0
            check("5 demo learners after seeding", db_learners >= 5, f"{db_learners} demo learners", results)
            users_count = con.execute(text("SELECT COUNT(*) FROM users")).scalar() if "users" in tables else 0
            check("Users table exists", "users" in tables, str(sorted(tables)), results)
            check("3 demo users after seeding", users_count >= 3, f"{users_count} users", results)
            if "users" in tables:
                demo_user_rows = {
                    tuple(row)
                    for row in con.execute(text(
                        "SELECT email, role, learner_id FROM users "
                        "WHERE email IN ('beginner@learnshift.ai', 'advanced@learnshift.ai', 'educator@learnshift.ai')"
                    ))
                }
            else:
                demo_user_rows = set()
            expected_users = {
                ("beginner@learnshift.ai", "learner", "demo_beginner"),
                ("advanced@learnshift.ai", "learner", "demo_advanced"),
                ("educator@learnshift.ai", "educator", None),
            }
            check("Demo users linked to learner profiles", expected_users <= demo_user_rows, str(sorted(demo_user_rows)), results)
            db_interactions = con.execute(text("SELECT COUNT(*) FROM interactions")).scalar() if "interactions" in tables else 0
            check("75 interactions after seeding", db_interactions >= 75, f"{db_interactions} interactions", results)
    except Exception as exc:
        check("Database URL validation", False, f"{type(exc).__name__}: {exc}", results)
    return results


def validate_auth_api() -> list[dict]:
    results: list[dict] = []
    try:
        unauth_status, _ = http_call("GET", "/api/learners")
        check("Protected learner routes return 401 unauthenticated", unauth_status == 401, f"GET /api/learners -> {unauth_status}", results)
        login_status, login_body = http_call("POST", "/api/auth/login", {"email": "beginner@learnshift.ai", "password": "password123"})
        token = login_body.get("access_token") if isinstance(login_body, dict) else None
        check("Learner login endpoint returns JWT", login_status == 200 and bool(token), f"POST /api/auth/login -> {login_status}", results)
        me_status, me_body = http_call("GET", "/api/auth/me", token=token)
        check("Current user endpoint returns learner user", me_status == 200 and me_body.get("email") == "beginner@learnshift.ai", str(me_body), results)
        educator_status, _ = http_call("GET", "/api/educator/overview", token=token)
        check("Learner token cannot access educator routes", educator_status == 403, f"GET /api/educator/overview -> {educator_status}", results)
        edu_login_status, edu_login_body = http_call("POST", "/api/auth/login", {"email": "educator@learnshift.ai", "password": "password123"})
        educator_token = edu_login_body.get("access_token") if isinstance(edu_login_body, dict) else None
        edu_status, _ = http_call("GET", "/api/educator/overview", token=educator_token)
        check("Educator token can access educator routes", edu_login_status == 200 and edu_status == 200, f"login {edu_login_status}, overview {edu_status}", results)
    except Exception as exc:
        check("Auth endpoint validation", False, f"{type(exc).__name__}: {exc}", results)
    return results


def http_call(method: str, path: str, payload: dict | None = None, token: str | None = None) -> tuple[int, dict]:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE_URL}{path}", data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            body = res.read().decode("utf-8")
            return res.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        try:
            parsed = json.loads(body) if body else {}
        except json.JSONDecodeError:
            parsed = {"detail": body}
        return exc.code, parsed


if __name__ == "__main__":
    raise SystemExit(main())
