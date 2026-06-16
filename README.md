# LearnShift AI - Adaptive Java OOP Learning Agent

## Competition-Ready Web Demo

LearnShift AI now includes a FastAPI + Next.js adaptive learning prototype for the SkillVerse 2026 AI Rapid Forge LearnShift AI challenge. The original CLI RAG files remain in the repository, but the competition demo uses:

- Backend: `services/ai/app/`
- Frontend: `apps/web/`
- Reproducible dataset: `data/`
- Validation and smoke scripts: `scripts/`

The app demonstrates this learning cycle:

```text
Observe learner evidence -> Diagnose current need -> Decide next teaching action -> Act -> Evaluate response -> Update learner state
```

### Environment Variables

Copy `.env.example` or set these values:

```bash
GOOGLE_API_KEY=optional_key_for_live_generation
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
DATABASE_URL=sqlite:///./learnshift_ai.db
```

`GOOGLE_API_KEY` is optional. Without it, the backend uses deterministic grounded fallback responses.

### Backend Setup

```bash
cd services/ai
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Seed the demo dataset:

```bash
curl -X POST http://localhost:8000/api/demo/seed
```

### Frontend Setup

```bash
cd apps/web
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

### Seeded Learners

After `/api/demo/seed`, use:

- `demo_beginner`: weak prerequisite knowledge.
- `demo_confident_wrong`: confident but incorrect learner.
- `demo_repeater`: repeated overriding/overloading misconception.
- `demo_fast_careless`: strong learner with careless mistakes.
- `demo_advanced`: advanced learner ready for challenge work.

### Validation

From the repo root, after seeding:

```bash
python scripts/validate_competition_readiness.py
```

The script prints PASS/FAIL checks and writes:

```text
data/validation/dataset_inventory.json
```

### Smoke Test

Start the backend first, then run:

```bash
python scripts/smoke_test_demo_flow.py
```

The smoke test seeds data, calls learner, diagnostic, teach, assessment, hint, tutor, RAG, educator, alert, detail, and AI log endpoints. It does not require an external API key.

### Live Demo Script

Use:

```text
docs/live-demo-script.md
```

Core flow:

1. Open home page.
2. Start as learner.
3. Seed demo data.
4. Pick beginner learner.
5. Show profile and recommendation.
6. Teach the same concept to beginner and advanced learners.
7. Take adaptive assessment, request hints, and submit an incorrect answer.
8. Open tutor mode and show misconception reframe.
9. Open educator dashboard and show alerts/evidence.
10. Open safeguard demo and test out-of-scope/direct-answer behavior.
11. Open disclosure page.

### Competition Documentation

- `docs/competition-readiness-checklist.md`
- `docs/dataset-report.md`
- `docs/technical-report.md`
- `docs/architecture.md`
- `docs/live-demo-script.md`

---

# Original CLI RAG Agent Notes

## Project Overview

This project is a command-line Retrieval-Augmented Generation (RAG) learning assistant for Object-Oriented Programming (OOP). It builds a small academic knowledge base from PDF/text chunks, converts those chunks into Gemini embeddings, and then uses semantic search plus Gemini generation to answer learner questions.

The system also includes a tutor mode that generates OOP quiz questions, provides progressive hints, evaluates learner answers, and gives misconception-based feedback.

## What This Project Does

The project has two main purposes:

1. It prepares an OOP learning dataset by extracting, cleaning, filtering, and embedding academic text chunks.
2. It runs an adaptive AI tutor that answers OOP questions or conducts an interactive quiz session.

In simple words, the project takes OOP study material, stores it as searchable vector data, and uses that data to give more relevant learning responses.

## Key Features

- Extracts OOP content from local or online PDF files.
- Filters text into concept-based learning chunks such as classes, objects, encapsulation, inheritance, overriding, and polymorphism.
- Cleans noisy academic PDF text and removes duplicate or irrelevant rows.
- Generates vector embeddings for each academic chunk using Gemini embeddings.
- Uses cosine similarity to retrieve the most relevant chunk for a user query.
- Detects the learner level as `BEGINNER`, `INTERMEDIATE`, or `ADVANCED`.
- Generates concise, level-aware explanations for OOP questions.
- Provides an interactive tutor mode with generated multiple-choice questions.
- Supports progressive hint ladders using `Hint_ladders.csv`.
- Diagnoses common misconceptions using `Misconception.csv`.

## Project Structure

| File | Purpose |
| --- | --- |
| `Rag_Agent.py` | Main command-line application with Agent Mode and Tutor Mode. |
| `functions.py` | Core helper functions for cleaning text, RAG search, user-level detection, hints, misconception diagnosis, and concept extraction. |
| `main.py` | Combines extracted chunk CSV files, removes duplicates/noise, and creates `pure_academic_chunks.csv`. |
| `APi_setup_and_embedding_setup.py` | Generates Gemini embeddings for cleaned academic chunks and saves them to `pure_academic_chunks_with_vectors.csv`. |
| `file_extractor.py` | Extracts OOP chunks from a local PDF file. |
| `url_extractor.py` | Downloads an online OOP PDF and extracts concept-based chunks. |
| `concepts.csv` | Maps concept IDs to concept names and descriptions. |
| `Misconception.csv` | Stores common misconceptions and recommended interventions. |
| `Hint_ladders.csv` | Stores progressive hints for quiz questions. |
| `local_extracted_chunks*.csv` | Intermediate extracted datasets from source material. |
| `pure_academic_chunks.csv` | Cleaned academic content used for embedding generation. |
| `pure_academic_chunks_with_vectors.csv` | Final RAG knowledge base containing text chunks and vector embeddings. |

## System Workflow

### 1. Content Extraction

The extractor scripts read OOP material from PDFs:

- `url_extractor.py` downloads an online PDF and extracts paragraphs.
- `file_extractor.py` reads a local PDF path and extracts paragraphs.

Each paragraph is matched against OOP concept keywords and saved as structured CSV rows with:

- Chunk ID
- Concept ID
- Source page
- Chunk text content

### 2. Dataset Cleaning

`main.py` loads the extracted CSV files:

- `local_extracted_chunks.csv`
- `local_extracted_chunks_2.csv`
- `local_extracted_chunks_3.csv`
- `local_extracted_chunks_4.csv`

It then:

- Combines all rows.
- Drops duplicate chunks.
- Cleans corrupted PDF characters.
- Removes headers, syllabus text, copyright text, and weak content.
- Saves the final cleaned dataset as `pure_academic_chunks.csv`.

### 3. Embedding Generation

`APi_setup_and_embedding_setup.py` reads `pure_academic_chunks.csv` and sends each chunk to the Gemini embedding model:

```text
gemini-embedding-2
```

The generated vectors are stored in:

```text
pure_academic_chunks_with_vectors.csv
```

### 4. RAG Agent Response

`Rag_Agent.py` loads the vectorized CSV file, parses the stored embeddings, and waits for user input.

In Agent Mode:

1. The user enters an OOP question.
2. The question is converted into an embedding.
3. Cosine similarity finds the closest academic chunk.
4. Gemini generates a concise answer using the retrieved context.
5. The explanation style is adapted to the detected learner level.

### 5. Tutor Mode

In Tutor Mode:

1. The user chooses an OOP topic.
2. Gemini generates a multiple-choice question.
3. The learner answers or asks for hints.
4. The system checks the answer.
5. If the answer is wrong, the system diagnoses possible misconceptions and recommends a corrective explanation.

## Main Modes

### Agent Mode

Agent Mode is used for direct question answering.

Example:

```text
What is method overriding in OOP?
```

The system retrieves the most relevant academic chunk and returns a short structured explanation.

### Tutor Mode

Tutor Mode is used for interactive practice.

The user selects a topic such as:

```text
Encapsulation
Overriding
Classes and Objects
```

The tutor generates quiz questions, gives hints, evaluates answers, and provides diagnostic feedback.

## Technologies Used

- Python
- pandas
- NumPy
- scikit-learn
- Google GenAI / Gemini API
- pypdf
- requests
- CSV-based local knowledge base
- Cosine similarity for retrieval

## Installation

Create and activate a virtual environment:

```bash
python -m venv .venv
.venv\Scripts\activate
```

Install the required packages:

```bash
pip install pandas numpy scikit-learn google-genai pypdf requests
```

## API Key Setup

This project uses the Google Gemini API for embeddings, answer generation, quiz generation, and evaluation.

Before sharing or deploying the project, avoid storing API keys directly in Python files. A safer approach is to load the key from an environment variable:

```bash
set GOOGLE_API_KEY=your_api_key_here
```

Then initialize the client from that environment variable in the code.

## How to Run

### Run the Main RAG/Tutor Application

```bash
python Rag_Agent.py
```

You will see a menu:

```text
1. Agent Mode
2. Tutor Mode
3. Exit Program
```

Choose `1` for direct OOP question answering or `2` for quiz-based tutoring.

### Rebuild the Clean Dataset

Run this if the extracted chunk CSV files have changed:

```bash
python main.py
```

This recreates:

```text
pure_academic_chunks.csv
```

### Regenerate Embeddings

Run this after rebuilding the clean dataset:

```bash
python APi_setup_and_embedding_setup.py
```

This recreates:

```text
pure_academic_chunks_with_vectors.csv
```

## Important Data Files

### `concepts.csv`

Defines the learning concepts supported by the tutor.

Current concepts include:

- Classes and Objects
- Encapsulation
- Inheritance and Polymorphism

### `Hint_ladders.csv`

Stores three-step hint ladders for quiz questions. The tutor shows hints progressively instead of revealing the answer immediately.

### `Misconception.csv`

Stores common wrong understandings and recommended interventions. This helps the tutor respond more like a diagnostic learning assistant instead of only saying an answer is wrong.

## Example Use Case

A beginner asks:

```text
What is encapsulation?
```

The system:

1. Detects the learner level.
2. Searches the vector database for the closest OOP explanation.
3. Uses the retrieved academic chunk as context.
4. Generates a short explanation with simple vocabulary and examples.

## Project Report Summary

This project demonstrates how RAG can improve an educational chatbot by grounding its answers in prepared academic material. Instead of depending only on a language model's general knowledge, the system retrieves the closest matching OOP content from a local dataset and uses it as reference material.

The project also extends beyond simple Q&A by adding adaptive learning behavior. It detects learner level, provides progressive hints, evaluates quiz answers, and diagnoses misconceptions. This makes the system useful as a small intelligent tutoring prototype for OOP learning.

## Limitations

- The application is currently command-line based and has no graphical interface.
- The knowledge base is limited to the provided OOP chunks.
- Some concept and question mappings are hard-coded in the tutor flow.
- The extractor scripts depend on specific PDF paths or URLs.
- There is no automated test suite in the current project.
- API usage requires an active Gemini API key and internet connection.

## Future Improvements

- Add a web interface using Streamlit, Flask, or FastAPI.
- Move API keys fully into environment variables.
- Add a `requirements.txt` file.
- Replace hard-coded question mappings with a dynamic quiz database.
- Add more OOP concepts and programming language examples.
- Store embeddings in a vector database such as FAISS, ChromaDB, or Pinecone.
- Add automated tests for text cleaning, hint retrieval, and misconception diagnosis.
- Add learner history tracking to personalize future questions.

## Conclusion

The Adaptive RAG Agent is an educational AI prototype for learning Object-Oriented Programming. It combines PDF-based content extraction, data cleaning, vector embeddings, semantic retrieval, and Gemini-powered response generation to create a personalized tutoring experience.
