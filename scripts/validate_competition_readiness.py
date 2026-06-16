import csv
import json
import sqlite3
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
CONCEPTS = {"C001", "C002", "C003", "C004", "C005", "C006"}
DB_PATHS = [ROOT / "learnshift_ai.db", ROOT / "services" / "ai" / "learnshift_ai.db"]
OUT_PATH = DATA / "validation" / "dataset_inventory.json"


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


if __name__ == "__main__":
    raise SystemExit(main())
