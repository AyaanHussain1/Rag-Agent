# Dataset Report

## Purpose

LearnShift AI uses a compact, reproducible Java OOP dataset designed for a competition prototype. The dataset supports the full adaptive loop: observe learner evidence, diagnose the current need, choose a teaching action, act, evaluate the response, and update learner state. All learners are fictional and all interaction records are synthetic demo records.

## Source Material

The repository did not contain official external source PDFs or the challenge brief during implementation, so the project now includes three reviewed local source documents under `data/sources/`. The source manifest honestly labels these files as team-authored reviewed source material for prototype demo use. No external academic citation is fabricated.

The three source files are:

- `oop_source_01_classes_objects.md`
- `oop_source_02_encapsulation_inheritance.md`
- `oop_source_03_polymorphism_overloading_overriding.md`

These files cover the six required concepts:

- `C001` Classes and Objects
- `C002` Encapsulation
- `C003` Inheritance
- `C004` Method Overloading
- `C005` Method Overriding
- `C006` Polymorphism

## Knowledge Chunks

The balanced RAG chunk file is `data/chunks/oop_knowledge_chunks.csv`. It contains 24 chunks, with 4 chunks per concept. Each chunk includes a chunk ID, concept ID, concept name, source title, source document, section marker, content, and keywords. The backend RAG service prefers this balanced chunk file and falls back to deterministic keyword retrieval when embeddings or a Gemini API key are unavailable.

## Question Bank

The question bank is `data/questions/oop_question_bank.csv`. It contains 36 questions, 6 per concept. Each concept has Basic, Intermediate, and Advanced coverage. The bank includes five question formats:

- MCQ
- Short answer
- Code tracing
- Code completion
- Scenario explanation

Question explanations are stored with each item so assessment feedback can explain why an answer is correct or incorrect.

## Misconceptions and Hints

The misconception bank is `data/misconceptions/oop_misconceptions.csv`. It contains 12 misconceptions, 2 per concept. These records support tutor diagnosis, corrective feedback, and educator recurring-misconception alerts.

The hint ladder file is `data/hints/oop_hint_ladders.csv`. It contains 36 hint ladders. Each ladder has three progressive hints plus a final explanation. Runtime hint storage uses the three hint steps in the existing `hint_ladders` table, while the full CSV retains final explanations for validation and reporting.

## Learner Profiles and Interactions

The learner profile file is `data/learners/learner_profiles.csv`. It defines five fictional learners:

- Beginner with weak prerequisite knowledge
- Confident but incorrect learner
- Learner repeating the same misconception
- Fast learner with careless mistakes
- Advanced learner who should not receive basic material

The interaction file is `data/interactions/demo_interactions.csv`. It contains 75 synthetic learner interactions. More than 30% are incorrect and more than 20% involve hints. The interactions are designed to trigger meaningful profile changes, different teaching actions, assessment adaptations, tutor responses, and educator alerts.

## Adaptation Rules

The adaptation rule file is `data/adaptation/adaptation_rules.csv`. It contains 12 formal rules covering low mastery, medium mastery, high mastery, confidence patterns, repeated misconception, repeated errors, careless errors, high hint usage, advanced learners, and safeguards. The backend exposes matched rule IDs in teach and assessment responses.

## Validation

Run:

```bash
python scripts/validate_competition_readiness.py
```

The script checks source counts, chunk balance, question coverage, misconception coverage, hint completeness, learner and interaction minimums, adaptation rules, alert types, AI usage logs, and database seed results. It writes machine-readable output to `data/validation/dataset_inventory.json`.

## AI Assistance and Limitations

The dataset was generated as reviewed prototype content for a competition demo. It is suitable for demonstrating adaptive learning behavior, source grounding, and educator evidence workflows. It is not a substitute for a full curriculum review, psychometric validation, or classroom deployment process.

Known limitations:

- Source documents are local reviewed prototype material, not independently published academic sources.
- Grading uses lightweight keyword and option matching rather than a full programming-language evaluator.
- Learner profiles are fictional and intentionally constructed to exercise system behavior.
- The no-API-key mode is deterministic and grounded, but less expressive than a configured Gemini response.
