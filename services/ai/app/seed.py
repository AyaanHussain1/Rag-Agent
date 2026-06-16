from pathlib import Path

import pandas as pd
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import adaptive, models


REPO_ROOT = Path(__file__).resolve().parents[3]


QUESTIONS = [
    ("Q_C001_B", "C001", "Which Java statement creates an object from the Student class?", "Multiple choice", "Basic", ["A. Student s = new Student();", "B. class Student {}", "C. Student = class();", "D. object Student;"], "A", "new Student() creates an instance of the Student class.", "M001"),
    ("Q_C001_I", "C001", "Short answer: explain the difference between a class and an object.", "Short answer", "Intermediate", None, "class blueprint|object instance", "A class defines structure/behavior; an object is a runtime instance.", "M001"),
    ("Q_C001_A", "C001", "Bug fixing: complete the missing Java object creation: Student s = ____ Student();", "Bug fixing or fill-in-code", "Advanced", None, "new", "The new keyword allocates an object instance.", "M001"),
    ("Q_C002_B", "C002", "Which modifier best hides a field from direct outside access in Java?", "Multiple choice", "Basic", ["A. public", "B. private", "C. static", "D. void"], "B", "private restricts direct access to the declaring class.", "M002"),
    ("Q_C002_I", "C002", "Bug fixing: class Account { private int balance; public int getBalance(){ return ____; } }", "Bug fixing or fill-in-code", "Intermediate", None, "balance", "A getter can expose controlled read access to private state.", "M002"),
    ("Q_C002_A", "C002", "Short answer: why do getters/setters support encapsulation?", "Short answer", "Advanced", None, "controlled access|validate|private", "They preserve private state while allowing controlled or validated access.", "M002"),
    ("Q_C003_B", "C003", "Which Java keyword declares that Dog inherits from Animal?", "Multiple choice", "Basic", ["A. implements", "B. inherits", "C. extends", "D. imports"], "C", "extends creates a subclass relationship in Java.", "M003"),
    ("Q_C003_I", "C003", "Code tracing: class A { void f(){System.out.print(\"A\");}} class B extends A {} new B().f(); What prints?", "Code tracing", "Intermediate", None, "A", "B inherits f() from A when it does not override it.", "M003"),
    ("Q_C003_A", "C003", "Short answer: when should inheritance not be used?", "Short answer", "Advanced", None, "not is-a|composition|unrelated", "Inheritance is best for true is-a relationships; otherwise composition is safer.", "M003"),
    ("Q_C004_B", "C004", "Which pair is method overloading?", "Multiple choice", "Basic", ["A. void pay(int x) and void pay(double x)", "B. void pay() in parent and child", "C. private int pay", "D. class Pay extends Bill"], "A", "Overloading uses the same method name with different parameter lists.", "M004"),
    ("Q_C004_I", "C004", "Fill in code: void print(int x) and void print(____ x) overload print by parameter type.", "Bug fixing or fill-in-code", "Intermediate", None, "String", "Changing parameter type creates a different signature.", "M004"),
    ("Q_C004_A", "C004", "Short answer: is changing only the return type enough for overloading in Java?", "Short answer", "Advanced", None, "no|parameter", "Java overloading requires different parameter lists, not return type alone.", "M004"),
    ("Q_C005_B", "C005", "What annotation often marks a Java method that replaces a parent method?", "Multiple choice", "Basic", ["A. @Static", "B. @Override", "C. @Private", "D. @Object"], "B", "@Override marks that a subclass method overrides a superclass method.", "M005"),
    ("Q_C005_I", "C005", "Code tracing: Parent p = new Child(); p.speak(); Which speak runs if Child overrides speak?", "Code tracing", "Intermediate", None, "Child", "Dynamic dispatch calls the overriding method on the actual object.", "M005"),
    ("Q_C005_A", "C005", "Bug fixing: to override, the child method must keep the same method name and compatible ____.", "Bug fixing or fill-in-code", "Advanced", None, "signature", "Overriding depends on a matching method signature.", "M005"),
    ("Q_C006_B", "C006", "Polymorphism lets one reference type point to objects that behave how?", "Multiple choice", "Basic", ["A. Always identically", "B. Differently at runtime", "C. Only as integers", "D. Without methods"], "B", "Polymorphism allows runtime-specific behavior through a common type.", "M006"),
    ("Q_C006_I", "C006", "Code tracing: Animal a = new Dog(); a.sound(); Dog overrides sound. Which version runs?", "Code tracing", "Intermediate", None, "Dog", "Runtime dispatch uses the actual Dog object.", "M006"),
    ("Q_C006_A", "C006", "Short answer: how does overriding enable polymorphism?", "Short answer", "Advanced", None, "runtime|subclass|common reference|dynamic", "A common reference can call subclass-specific overriding behavior at runtime.", "M006"),
]


MISCONCEPTIONS = [
    ("M001", "C001", "Confusing a class definition with an instantiated object", "A class allocates memory before you create anything.", "Clarify that a class is a blueprint; an object is created when Java executes new ClassName()."),
    ("M002", "C002", "Believing private means data can never be safely exposed", "If a field is private nobody can read it.", "Show how getters expose controlled access while keeping direct field mutation blocked."),
    ("M003", "C003", "Using inheritance for any code reuse, even without an is-a relationship", "A Car should inherit Engine because it uses one.", "Contrast is-a inheritance with has-a composition before continuing."),
    ("M004", "C004", "Thinking return type alone overloads a method", "int total() and double total() are overloaded.", "Emphasize that Java method overloading requires a different parameter list."),
    ("M005", "C005", "Confusing method overriding with method overloading", "Overriding is two methods with different parameters in the same class.", "Contrast overriding as replacing a parent method with overloading as same-name different parameters."),
    ("M006", "C006", "Thinking polymorphism uses the variable type instead of the object type", "Animal a = new Dog() calls Animal sound.", "Use dynamic dispatch: the actual object type decides the overriding method at runtime."),
]


def seed_reference_data(db: Session) -> None:
    for concept in adaptive.CONCEPTS:
        db.merge(models.Concept(**concept))

    for misconception in MISCONCEPTIONS:
        db.merge(models.Misconception(
            misconception_id=misconception[0],
            concept_id=misconception[1],
            misconception_description=misconception[2],
            learner_response_example=misconception[3],
            recommended_intervention=misconception[4],
        ))

    _load_existing_csv_misconceptions(db, {item[0] for item in MISCONCEPTIONS})
    _load_content_chunks(db)

    for question_id, concept_id, prompt, qtype, difficulty, options, correct, explanation, misconception_id in QUESTIONS:
        db.merge(models.Question(
            question_id=question_id,
            concept_id=concept_id,
            prompt=prompt,
            question_type=qtype,
            difficulty=difficulty,
            options=options,
            correct_answer=correct,
            explanation=explanation,
            misconception_id=misconception_id,
        ))
        db.merge(models.HintLadder(
            question_id=question_id,
            concept_id=concept_id,
            hint_step_1=_hint(concept_id, 1),
            hint_step_2=_hint(concept_id, 2),
            hint_step_3=_hint(concept_id, 3),
        ))
    db.commit()


def seed_demo(db: Session) -> dict:
    seed_reference_data(db)
    for learner_id in ["demo_beginner", "demo_advanced"]:
        learner = db.get(models.Learner, learner_id)
        if learner:
            db.delete(learner)
            db.flush()

    beginner = models.Learner(
        learner_id="demo_beginner",
        display_name="Demo Learner A - Beginner",
        current_level="BEGINNER",
        is_demo=True,
    )
    advanced = models.Learner(
        learner_id="demo_advanced",
        display_name="Demo Learner B - Advanced",
        current_level="ADVANCED",
        is_demo=True,
    )
    db.add_all([beginner, advanced])
    db.flush()
    adaptive.ensure_mastery_records(db, beginner)
    adaptive.ensure_mastery_records(db, advanced)

    _set_mastery(db, beginner.learner_id, {"C001": 32, "C002": 28, "C003": 42, "C004": 36, "C005": 30, "C006": 38})
    _set_mastery(db, advanced.learner_id, {"C001": 88, "C002": 82, "C003": 85, "C004": 78, "C005": 86, "C006": 84})

    adaptive.record_interaction(db, beginner, "C005", "assessment", "Q_C005_B", "Different parameters", False, 5, 1, "M005", None, "High-confidence confusion between overloading and overriding.")
    adaptive.record_interaction(db, beginner, "C005", "assessment", "Q_C005_I", "Parent speak", False, 4, 2, "M005", None, "Repeated misconception: selected parent method despite child override.")
    adaptive.record_interaction(db, beginner, "C005", "assessment", "Q_C005_A", "different params", False, 4, 1, "M005", None, "Third incorrect overriding attempt creates repeated incorrect evidence.")
    adaptive.record_interaction(db, beginner, "C002", "assessment", "Q_C002_I", "idk", False, 1, 3, "M002", None, "Low confidence and heavy hints in encapsulation.")
    adaptive.record_interaction(db, beginner, "C002", "assessment", "Q_C002_B", "A", False, 2, 3, "M002", None, "Excessive hint usage continued.")
    adaptive.record_interaction(db, beginner, "C002", "assessment", "Q_C002_A", "not sure", False, 2, 1, "M002", None, "Third low-confidence encapsulation response creates a teacher alert.")
    adaptive.record_interaction(db, advanced, "C006", "assessment", "Q_C006_A", "runtime subclass method through common reference", True, 5, 0, None, None, "Advanced learner correctly explained runtime polymorphism.")
    adaptive.record_interaction(db, advanced, "C005", "assessment", "Q_C005_A", "signature", True, 5, 0, None, None, "Advanced learner answered overriding signature question unaided.")
    db.commit()
    return {"seeded": True, "learners": [beginner.learner_id, advanced.learner_id]}


def _load_existing_csv_misconceptions(db: Session, skip_ids: set[str]) -> None:
    path = REPO_ROOT / "Misconception.csv"
    if not path.exists():
        return
    frame = pd.read_csv(path)
    frame.columns = [col.strip().lower() for col in frame.columns]
    for _, row in frame.iterrows():
        misconception_id = str(row["misconception_id"]).strip()
        if misconception_id in skip_ids:
            continue
        concept_id = str(row.get("concept_id", "")).strip().upper()
        if concept_id not in {item["concept_id"] for item in adaptive.CONCEPTS}:
            continue
        db.merge(models.Misconception(
            misconception_id=misconception_id,
            concept_id=concept_id,
            misconception_description=str(row["misconception_description"]),
            learner_response_example=str(row.get("learner_response_example", "")),
            recommended_intervention=str(row["recommended_intervention"]),
        ))


def _load_content_chunks(db: Session) -> None:
    path = REPO_ROOT / "pure_academic_chunks.csv"
    if not path.exists():
        return
    frame = pd.read_csv(path)
    frame.columns = [col.strip() for col in frame.columns]
    for _, row in frame.head(400).iterrows():
        chunk_id = str(row.get("Chunk ID", "")).strip()
        concept_id = str(row.get("Concept ID", "")).strip().upper()
        text = str(row.get("Chunk Text Content", "")).strip()
        if not chunk_id or concept_id not in {item["concept_id"] for item in adaptive.CONCEPTS} or not text:
            continue
        db.merge(models.ContentChunk(
            chunk_id=chunk_id,
            concept_id=concept_id,
            source_page=str(row.get("Source Page", "") or ""),
            source_title="OOP academic source pack",
            chunk_text=text,
        ))


def _set_mastery(db: Session, learner_id: str, values: dict[str, float]) -> None:
    for concept_id, score in values.items():
        row = adaptive.get_mastery_row(db, learner_id, concept_id)
        row.mastery_score = score
        row.evidence_count = max(row.evidence_count, 1)


def _hint(concept_id: str, level: int) -> str:
    concept_name = next(item["concept_name"] for item in adaptive.CONCEPTS if item["concept_id"] == concept_id)
    hints = {
        1: f"Identify the OOP concept first: this question is about {concept_name}.",
        2: "Compare the answer with the Java rule: focus on class/object relationships, access, inheritance, signatures, or runtime dispatch.",
        3: "Use the exact Java clue in the prompt, then eliminate answers that describe a different OOP concept.",
    }
    return hints[level]


def ensure_seeded(db: Session) -> None:
    concept_count = db.scalar(select(func.count()).select_from(models.Concept))
    question_count = db.scalar(select(func.count()).select_from(models.Question))
    hint_ladder_count = db.scalar(select(func.count()).select_from(models.HintLadder))
    if (
        (concept_count or 0) < len(adaptive.CONCEPTS)
        or (question_count or 0) < len(QUESTIONS)
        or (hint_ladder_count or 0) < len(QUESTIONS)
    ):
        seed_reference_data(db)
