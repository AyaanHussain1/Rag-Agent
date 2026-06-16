import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import google.genai as genai
import pandas as pd
import json
from functions import run_rag_agent, get_user_level, get_hint, diagnose_misconception, extract_concept_id
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

df = pd.read_csv(os.path.join(BASE_DIR, "pure_academic_chunks_with_vectors.csv"))

# File paths perfectly matched to your files
concepts_file = os.path.join(BASE_DIR, "concepts.csv")
misconception_file = os.path.join(BASE_DIR, "Misconception.csv")
hint_file = os.path.join(BASE_DIR, "Hint_ladders.csv")

vector_col = "Vector_Embeddings" if "Vector_Embeddings" in df.columns else "vector_embeddings"

# Parse vectors and drop rows that are empty or broken
parsed_vectors = []
valid_row_indices = []

for idx, raw_vector in enumerate(df[vector_col]):
    try:
        vec = json.loads(raw_vector)
        if isinstance(vec, list) and len(vec) > 0:
            parsed_vectors.append(vec)
            valid_row_indices.append(idx)
    except:
        continue

# Filter original DataFrame to match only the valid vectors
df_clean = df.iloc[valid_row_indices].reset_index(drop=True)
stored_vectors_2d = np.array(parsed_vectors)

client = genai.Client(api_key="AQ.Ab8RN6K-zevlwUWuvD_YerPyryOqg5Ld5hnZUEUtZzXYvPREnw")

level_rules = {
    "BEGINNER": """
    - Focus heavily on conceptual intuition using real-world analogies (e.g., blueprints, boxes).
    - Keep code syntax minimalist, highly commented, and simple.
    - Avoid complex jargon or deep memory management details.
    """,
    "INTERMEDIATE": """
    - Focus directly on standard clean syntax layouts and code structure rules.
    - Explain 'why' code is written this way (e.g., scoping rules, parameters).
    - Maintain the tight, point-by-point markdown formatting.
    """,
    "ADVANCED": """
    - Skip basic analogies entirely. 
    - Focus on low-level execution mechanics, memory allocation (stack vs heap), and optimization performance.
    - Show edge cases, advanced syntax configurations, or compiler behaviors if applicable.
    """
}

# --- INTERACTIVE MODE SYSTEM CONTROLLER ---
while True:
    print("\n" + "="*50)
    print("      ADAPTIVE LEARNING PORTAL - MAIN MENU")
    print("="*50)
    print("1. Agent Mode (Direct Explanation & Syntax Response)")
    print("2. Tutor Mode (Interactive Topic Quiz & Progressive Hints)")
    print("3. Exit Program")
    print("="*50)
    
    choice = input("\nSelect Mode (1, 2, or 3): ").strip()
    
    if choice == "3":
        print("\nExiting system. Best of luck with your hackathon presentation!")
        break
        
    # ==================================================
    # MODE 1: AGENT MODE (SIMPLE Q&A)
    # ==================================================
    elif choice == "1":
        print("\n--- [AGENT MODE ACTIVATED] ---")
        user_query = input("Enter your programming query: ").strip()
        if not user_query:
            continue
            
        result_text = run_rag_agent(client, user_query, df_clean, stored_vectors_2d, level_rules)
        print("\n=== AGENT RESPONSE ===")
        print(result_text)
        
    # ==================================================
    # MODE 2: TUTOR MODE (INTERACTIVE QUIZ)
    # ==================================================
    elif choice == "2":
        print("\n--- [TUTOR MODE ACTIVATED] ---")
        topic = input("What OOP topic would you like to be quizzed on? (e.g., Overriding, Encapsulation): ").strip()
        if not topic:
            continue
            
        try:
            total_questions = int(input("How many total questions would you like to tackle? ").strip())
        except ValueError:
            print("Invalid number. Defaulting to 3 questions.")
            total_questions = 3
            
        score = 0
        
        for q_num in range(1, total_questions + 1):
            print(f"\n==================================================")
            print(f" GENERATING QUESTION {q_num} OF {total_questions}")
            print(f"==================================================")
            
            generation_prompt = f"""
            You are an interactive OOP Tutor. Generate ONE concise multiple-choice question testing the concept of '{topic}'. 
            Provide 4 options clearly marked as A), B), C), and D). Make it unique. Do not output the answer key or explanation text.
            """
            quiz_response = client.models.generate_content(model="gemini-2.5-flash", contents=generation_prompt)
            quiz_question_text = quiz_response.text.strip()
            
            print(f"\n{quiz_question_text}")
            print("-" * 50)
            
            attempt = 1
            hint_level = 1  
            answered_correctly = False
            
            while attempt <= 3:
                user_answer = input(f"\n[Attempt {attempt}/3] Your Answer (or type 'hint'): ").strip()
                
                if not user_answer:
                    continue
                    
                # Progressive hint pulling using the hint_level pointer matched dynamically
                if user_answer.lower().startswith("hint") or "h" in user_answer.lower():
                    if hint_level > 3:
                        print("\n [HINT]: You've exhausted all available structured hints! Try your best guess.")
                    else:
                        current_concept = extract_concept_id(client, topic, concepts_file)
                        question_mapping_id = "Q025" if "C005" in current_concept else ("Q002" if "C002" in current_concept else "Q001")
                        
                        hint_text = get_hint(hint_file, question_mapping_id, current_attempt=hint_level)
                        print(f"\n [HINT LADDER LEVEL {hint_level}]: {hint_text}")
                        hint_level += 1  
                    continue
                    
                # --- ROBUST MCQ EVALUATION PROMPT ---
                evaluation_prompt = f"""
                You are a strict academic evaluator grading a quiz answer.
                
                Quiz Question Context:
                {quiz_question_text}
                
                Learner's Provided Response: "{user_answer}"
                
                Instructions:
                1. Carefully evaluate if the learner's response aligns with the single correct option for the question context above.
                2. Accept single character labels (e.g., 'A', 'b', 'C') or the complete text string variant. Case-insensitive.
                3. If the answer is accurate, your output must begin strictly with the word: CORRECT
                4. If the answer is incorrect, your output must begin strictly with the word: INCORRECT followed by a one-sentence critique explaining the discrepancy.
                """
                eval_res = client.models.generate_content(model="gemini-2.5-flash", contents=evaluation_prompt).text.strip()
                
                if "CORRECT" in eval_res.upper() and "INCORRECT" not in eval_res.upper():
                    print(f"\n Excellent! {eval_res}")
                    score += 1
                    answered_correctly = True
                    break
                else:
                    print(f"\n {eval_res}")
                    
                    # Call diagnostic misconception block on failure
                    detected_concept_node = extract_concept_id(client, user_answer, concepts_file)
                    test_diagnosis = diagnose_misconception(
                        client=client, 
                        concept_id=detected_concept_node, 
                        learner_wrong_answer=user_answer, 
                        misconceptions_csv_path=misconception_file
                    )
                    print(f" [Diagnostic Analysis Intercepted]: {test_diagnosis}")
                    
                    attempt += 1
            
            if not answered_correctly:
                print(f"\n[Tutor] Moving on to the next problem...")
        
        # Quiz Summary Section
        print("\n" + "═"*50)
        print("                QUIZ COMPLETE!                ")
        print("" + "═"*50)
        print(f"Your Final Score: {score} / {total_questions}")
        print("═"*50)
        
    else:
        print("Invalid choice! Please select 1, 2, or 3.")