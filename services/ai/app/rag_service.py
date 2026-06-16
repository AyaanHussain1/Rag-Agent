import json
import os
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

from .adaptive import CONCEPT_KEYWORDS, CONCEPTS, detect_concept_id


REPO_ROOT = Path(__file__).resolve().parents[3]
BALANCED_CHUNK_CSV = REPO_ROOT / "data" / "chunks" / "oop_knowledge_chunks.csv"
LEGACY_CHUNK_CSV = REPO_ROOT / "pure_academic_chunks_with_vectors.csv"
SUPPORTED_CONCEPTS = {item["concept_id"]: item for item in CONCEPTS}
OUT_OF_SCOPE_MESSAGE = (
    "I cannot answer that from the current LearnShift AI OOP module. "
    "Please ask within Classes/Objects, Encapsulation, Inheritance, Method Overloading, "
    "Method Overriding, or Polymorphism."
)


class RAGService:
    def __init__(self) -> None:
        self.df = pd.DataFrame()
        self.vectors: np.ndarray | None = None
        self.client: Any | None = None
        self.model_name = "deterministic-fallback"
        self._load_chunks()
        self._load_gemini()

    def _load_chunks(self) -> None:
        chunk_csv = BALANCED_CHUNK_CSV if BALANCED_CHUNK_CSV.exists() else LEGACY_CHUNK_CSV
        if not chunk_csv.exists():
            return
        df = pd.read_csv(chunk_csv)
        df.columns = [column.strip() for column in df.columns]
        vector_col = "Vector_Embeddings" if "Vector_Embeddings" in df.columns else "vector_embeddings"
        parsed: list[list[float]] = []
        valid_indices: list[int] = []
        if vector_col in df.columns:
            for index, raw in enumerate(df[vector_col]):
                try:
                    vector = json.loads(raw)
                    if isinstance(vector, list) and vector:
                        parsed.append(vector)
                        valid_indices.append(index)
                except Exception:
                    continue
        self.df = df.iloc[valid_indices].reset_index(drop=True) if valid_indices else df.reset_index(drop=True)
        self.vectors = np.array(parsed) if parsed else None

    def _load_gemini(self) -> None:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return
        try:
            import google.genai as genai

            self.client = genai.Client(api_key=api_key)
            self.model_name = "gemini-2.5-flash"
        except Exception:
            self.client = None

    def diagnose(self) -> dict:
        """Make one real Gemini call so the key can be tested end to end.

        Distinguishes: no key set, client not initialized (SDK missing/bad key
        format), a live call that failed (raw provider error), and a working key.
        """
        info: dict = {
            "api_key_present": bool(os.getenv("GOOGLE_API_KEY")),
            "client_initialized": self.client is not None,
            "model_name": self.model_name,
        }
        if not info["api_key_present"] and self.client is None:
            info["status"] = "no_key"
            info["detail"] = "GOOGLE_API_KEY is not set; the app runs in deterministic fallback mode."
            return info
        if self.client is None:
            info["status"] = "client_unavailable"
            info["detail"] = "Key is set but the Gemini client did not initialize (is 'google-genai' installed?)."
            return info
        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents="Reply with the single word: OK",
            )
            info["status"] = "ok"
            info["sample_response"] = (getattr(response, "text", "") or "").strip()[:200]
            info["detail"] = "Live Gemini call succeeded. The key is valid and authorized."
        except Exception as exc:  # surface the raw provider error instead of swallowing it
            info["status"] = "error"
            info["error"] = f"{type(exc).__name__}: {exc}"[:600]
            info["detail"] = "Key is set and client built, but the live Gemini call failed (see error)."
        return info

    def retrieve(self, query: str, concept_id: str | None = None) -> dict:
        detected = concept_id or detect_concept_id(query)
        if detected not in SUPPORTED_CONCEPTS:
            return {"in_scope": False, "message": OUT_OF_SCOPE_MESSAGE, "sources": []}
        if self.df.empty:
            return {"in_scope": False, "message": "No academic chunks are loaded for retrieval.", "sources": []}

        candidates = self.df
        concept_col = "Concept ID" if "Concept ID" in candidates.columns else "concept_id"
        if concept_col in candidates.columns:
            narrowed = candidates[candidates[concept_col].astype(str).str.upper() == detected]
            if not narrowed.empty:
                candidates = narrowed

        if self.client and self.vectors is not None and len(candidates) == len(self.df):
            try:
                response = self.client.models.embed_content(model="gemini-embedding-2", contents=query)
                query_vector = np.array(response.embeddings[0].values).reshape(1, -1)
                scores = cosine_similarity(query_vector, self.vectors)[0]
                best_idx = int(np.argmax(scores))
                return self._source_payload(self.df.iloc[best_idx], float(scores[best_idx]), detected)
            except Exception:
                pass

        scored = []
        query_terms = set(query.lower().split())
        for _, row in candidates.iterrows():
            text = str(row.get("Chunk Text Content", row.get("chunk_text", row.get("content", "")))).lower()
            keyword_score = sum(3 for kw in CONCEPT_KEYWORDS.get(detected, []) if kw in text)
            overlap = len(query_terms.intersection(set(text.split())))
            scored.append((keyword_score + overlap, row))
        scored.sort(key=lambda item: item[0], reverse=True)
        if not scored or scored[0][0] <= 0:
            return {"in_scope": False, "message": OUT_OF_SCOPE_MESSAGE, "sources": []}
        confidence = min(0.92, 0.35 + scored[0][0] / 40)
        return self._source_payload(scored[0][1], confidence, detected)

    def answer(self, query: str, learner_level: str = "INTERMEDIATE") -> dict:
        retrieval = self.retrieve(query)
        if not retrieval.get("in_scope"):
            return retrieval
        source = retrieval["sources"][0]
        context = source["excerpt"]
        if self.client:
            prompt = (
                f"Answer this OOP-in-Java learner question for a {learner_level} learner using only the reference.\n"
                f"Question: {query}\nReference: {context}\n"
                "Keep the answer concise, include a tiny Java example when useful, and do not invent facts outside the reference."
            )
            try:
                response = self.client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
                text = response.text.strip()
            except Exception:
                text = self._fallback_answer(query, context, learner_level)
        else:
            text = self._fallback_answer(query, context, learner_level)
        return {"in_scope": True, "answer": text, "sources": retrieval["sources"], "model_name": self.model_name}

    def teach(self, concept_id: str, teaching_action: str, learner_level: str, reason: str) -> dict:
        concept = SUPPORTED_CONCEPTS.get(concept_id)
        if not concept:
            return {"in_scope": False, "message": OUT_OF_SCOPE_MESSAGE, "sources": []}
        retrieval = self.retrieve(concept["concept_name"], concept_id)
        if not retrieval.get("in_scope"):
            return retrieval
        source = retrieval["sources"][0]
        context = source["excerpt"]
        if self.client:
            prompt = (
                f"Teach {concept['concept_name']} in Java using the action '{teaching_action}'.\n"
                f"Learner level: {learner_level}. Why selected: {reason}.\n"
                f"Reference: {context}\n"
                "Return: explanation, Java example when relevant, one guiding question. Stay grounded in the reference."
            )
            try:
                text = self.client.models.generate_content(model="gemini-2.5-flash", contents=prompt).text.strip()
            except Exception:
                text = self._fallback_teach(concept, teaching_action, context)
        else:
            text = self._fallback_teach(concept, teaching_action, context)
        return {
            "in_scope": True,
            "concept_id": concept_id,
            "teaching_action": teaching_action,
            "why_selected": reason,
            "response": text,
            "guiding_question": self.guiding_question(concept_id),
            "sources": retrieval["sources"],
            "model_name": self.model_name,
        }

    def tutor_reframe(self, message: str, concept_id: str, intervention: str, learner_level: str) -> dict:
        retrieval = self.retrieve(message, concept_id)
        if not retrieval.get("in_scope"):
            return retrieval
        concept_name = SUPPORTED_CONCEPTS[concept_id]["concept_name"]
        text = (
            f"The difficulty seems to be in {concept_name}.\n\n"
            f"Reframe: {intervention}\n\n"
            f"Try this check: {self.guiding_question(concept_id)}"
        )
        if self.client:
            try:
                prompt = (
                    f"A {learner_level} Java OOP learner wrote: {message}\n"
                    f"Concept: {concept_name}. Intervention: {intervention}.\n"
                    "Reframe the explanation, ask one guiding question, and avoid repeating the same wording."
                )
                text = self.client.models.generate_content(model="gemini-2.5-flash", contents=prompt).text.strip()
            except Exception:
                pass
        return {"in_scope": True, "concept_id": concept_id, "response": text, "sources": retrieval["sources"], "model_name": self.model_name}

    def guiding_question(self, concept_id: str) -> str:
        questions = {
            "C001": "In Java, what is the difference between writing a class and creating an object with new?",
            "C002": "Which field should be private, and which method should expose controlled access?",
            "C003": "What behavior does the child class inherit, and what does it add?",
            "C004": "Which parameter list makes this method overloaded instead of duplicated?",
            "C005": "Which parent method is the child replacing, and why must the signature match?",
            "C006": "What will the program call at runtime when the reference type is different from the object type?",
        }
        return questions.get(concept_id, "What is the key OOP decision in this example?")

    def _source_payload(self, row: pd.Series, score: float, concept_id: str) -> dict:
        chunk_id = str(row.get("Chunk ID", row.get("chunk_id", "CH_UNKNOWN")))
        source_page = str(row.get("Source Page", row.get("source_page", row.get("page_or_section", ""))) or "")
        source_title = str(row.get("source_title", row.get("Source Title", "OOP academic source pack")))
        source_document = str(row.get("source_document", ""))
        text = str(row.get("Chunk Text Content", row.get("chunk_text", row.get("content", ""))))
        return {
            "in_scope": True,
            "sources": [{
                "source_title": source_title,
                "source_document": source_document,
                "chunk_id": chunk_id,
                "concept_id": concept_id,
                "source_page": source_page,
                "similarity_score": round(float(score), 3),
                "excerpt": text[:900],
            }],
        }

    def _fallback_answer(self, query: str, context: str, learner_level: str) -> str:
        return (
            f"**Concept**: This question is answered from the retrieved OOP source for a {learner_level.lower()} learner.\n\n"
            f"**Grounded explanation**: {context[:420]}...\n\n"
            "```java\n"
            "class Example {\n"
            "  void explain() { System.out.println(\"OOP concept in action\"); }\n"
            "}\n"
            "```\n"
            "**Check**: Can you point to the class, object, or method relationship involved?"
        )

    def _fallback_teach(self, concept: dict, action: str, context: str) -> str:
        name = concept["concept_name"]
        if "advanced" in action:
            lead = f"Use {name} to reason about design tradeoffs, not only syntax."
        elif "prerequisite" in action or "simplified" in action:
            lead = f"Start small: {name} is one building block in Java OOP."
        elif "analogy" in action:
            lead = f"Think of {name} as a reusable classroom rule: the same idea guides many specific examples."
        else:
            lead = f"Work through {name} one step at a time."
        return (
            f"{lead}\n\n"
            f"Grounded source idea: {context[:360]}...\n\n"
            "```java\n"
            "class Parent { void speak() { System.out.println(\"parent\"); } }\n"
            "class Child extends Parent { @Override void speak() { System.out.println(\"child\"); } }\n"
            "```\n"
            f"Quick check: {self.guiding_question(concept['concept_id'])}"
        )


rag_service = RAGService()
