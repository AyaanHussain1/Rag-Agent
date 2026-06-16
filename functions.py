import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import google.genai as genai
import pandas as pd
import json
import re

def clean_text(text):
    if not isinstance(text, str):
        text_str = str(text).strip()
    else:
        text_str = text    
    
    replacements = {
        "â€œ": '"', "â€\x9d": '"', "â€": '"', "â€": '"', 
        "âElement": " ", "â€“": "-", "â€”": "--", 
        "â€˜": "'", "â€™": "'", "\xa0": " ", "\uf06c": " "
    }
    for bad_char, good_char in replacements.items():
        text_str = text_str.replace(bad_char, good_char)
    text_str = text_str.replace("â", " ")

    text_str = text_str.replace("\n", " ").replace("\r", " ").replace("\t", " ")
    text_str = re.sub(r'(\w+)-\s+(\w+)', r'\1\2', text_str) # Fix hyphenated line breaks
    
    # Strip all these (Lovely Professional, MRCET, Units, and Syllabus markers)
    header_pattern = r"(LOVELY\s+PROFESSIONAL\s+UNIVERSITY\d*|MRCET\s+CAMPUS|R-22|UNIT-\s*[V|I|X|\d]+|SYLLABUS|Department\s+of\s+Computer\s+Science)\s*(Unit\s*\d+\s*:\s*)?(Review\s+of\s+)?(Object-oriented\s+ProgrammingNotes)?"
    text_str = re.sub(header_pattern, "", text_str, flags=re.IGNORECASE)
    
    text_str = re.sub(r'\s+', ' ', text_str).strip()
    return text_str


def keep_valid_educational_content(text):
    
    text_str = str(text).strip().lower() 
    
    garbage_words = [
        "organizer", "official", "submission", "pack", "participant", "page", "copyright",
        "iqra university", "june 2026", "suggested source", "field, suggested value", "organizing team",
        "vision ", "mission ", "course outcomes:", "text book:", "reference books:", 
        "syllabusobject-oriented", "self assessment", "fill in the blanks", "task in a group",
        "internationally accepted", "holistic technical education", "competent and confident engineers",
        "department of computer science", "mrcet campus", "vision", "mission"
    ]
    
    if any(word in text_str for word in garbage_words):
        return False  # Drops the entire row from the dataset
        
    if "........" in text_str or "_____" in text_str or "…………" in text_str:
        return False
        
    # Drop single-line  code 
    if ("{" in text_str or "}" in text_str or "();" in text_str) and len(text_str) < 60:
        return False
        
    # academic conceptual depth (Must have at least 12 real words)
    word_count = len(text_str.split())
    if word_count < 12:
        return False
        
    original_text = str(text).strip()
    if original_text.endswith(".") or original_text.endswith(";") or original_text.endswith("}") or original_text.endswith('"'):
        return True
        
    return False

def get_user_level(client: genai.Client, user_query: str) -> str: 
    """Classifies user input query into BEGINNER, INTERMEDIATE, or ADVANCED."""
    level_detector_prompt = f"""
    Analyze the following user programming query and classify the user's technical expertise level 
    into exactly one of these categories: BEGINNER, INTERMEDIATE, ADVANCED.

    Query: "{user_query}"

    Respond with ONLY the single category name.
    """
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=level_detector_prompt
        )
        level_text = response.text.strip().upper()
        if "BEGINNER" in level_text: return "BEGINNER"
        if "ADVANCED" in level_text: return "ADVANCED"
        return "INTERMEDIATE"
    except:
        return "INTERMEDIATE"
    
def run_rag_agent(client: genai.Client, user_query: str, df_clean, stored_vectors_2d, level_instructions: dict) -> str:
    """Executes semantic search and generates the ultra-concise, level-aware response."""
    # 1. Get query embedding
    response = client.models.embed_content(
        model="gemini-embedding-2", 
        contents=user_query
    )
    query_vector = response.embeddings[0].values
    query_vector_2d = np.array(query_vector).reshape(1, -1)
    
    # 2. Calculate cosine similarity to find the best academic chunk
    similarity_score = cosine_similarity(query_vector_2d, stored_vectors_2d)[0]
    best_match_idx = np.argmax(similarity_score)
    raw_context = df_clean.iloc[best_match_idx]["Chunk Text Content"]
    
    # 3. Detect user level automatically
    user_level = get_user_level(client, user_query)
    print(f"Detected User Level: {user_level}")
    
    # 4. Construct the master system prompt with your strict constraints
    base_system_instruction = f"""
You are a strict, ultra-concise Object-Oriented Programming tutor. Your goal is to give direct, clear, and bullet-point-driven answers with absolutely zero fluff.

Adapt your vocabulary and explanation depths to a user with an **{user_level}** background.
Follow these specific constraints:
{level_instructions[user_level]}

CRITICAL FORMATTING RULES:
1. MAX 1 SENTENCE PER POINT: Keep all descriptions down to a single crisp line.
2. NO INTRODUCTION/CONCLUSION: Start directly with the first markdown header and stop immediately after the last point.
3. PRISTINE CODE BLOCKS: Use minimal, essential syntax layouts inside standard markdown blocks (e.g., ```cpp or ```python).
4. BREAKDOWN PATTERN: Always structure your content precisely like this:
   - **Concept**: [Single sentence description]
   - **Syntax**: [Clean code block]
   - **Execution**: [Single sentence explaining how it runs]
"""
    
    # 5. Generate final tailored markdown response
    chat_completion = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=f"User Question: {user_query}\n\nReference Material:\n{raw_context}",
        config={"system_instruction": base_system_instruction}
    )
    return chat_completion.text

def get_hint(hint_csv_path: str, question_id: str, current_attempt: int) -> str:
    try:
        hint_df = pd.read_csv(hint_csv_path)
        hint_df.columns = hint_df.columns.str.strip().str.lower()
        
        # Match question ID row logic here and return the relevant ladder column
        match = hint_df[hint_df['question_id'].astype(str).str.strip().str.upper() == str(question_id).strip().upper()]
        if not match.empty:
            hint_col = f"hint_step_{current_attempt}"
            if hint_col in match.columns:
                return str(match.iloc[0][hint_col])
        return "Keep attempting! Think about breaking the logic down step-by-step."
    except Exception as e:
        return f"Error retrieving hint: {str(e)}"
    
def diagnose_misconception(client, concept_id: str, learner_wrong_answer: str, misconceptions_csv_path: str) -> str:
    try:
        import pandas as pd
        mis_df = pd.read_csv(misconceptions_csv_path)
        
        # Clean column names by stripping spaces and forcing lowercase
        mis_df.columns = mis_df.columns.str.strip().str.lower()
        
        target_id = str(concept_id).strip().upper()
        
        # Cross-match concept IDs securely
        concept_misconceptions = mis_df[mis_df['concept_id'].astype(str).str.strip().str.upper() == target_id]
        
        if concept_misconceptions.empty:
            concept_misconceptions = mis_df
            
        misconception_context = ""
        for _, row in concept_misconceptions.iterrows():
            misconception_context += f"- Error: {row['misconception_description']}\n  Intervention: {row['recommended_intervention']}\n\n"
            
        prompt = f"""
        A learner has provided an incorrect answer: "{learner_wrong_answer}"
        Review this list of recorded misconceptions and return the 'recommended_intervention' text that best addresses their confusion:
        {misconception_context}
        Keep your answer brief (under 2 sentences). Do not mention IDs.
        """
        response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        return response.text.strip()
    except Exception as e:
        return f"Could not complete diagnosis. Error: {str(e)}"
    
def extract_concept_id(client, user_query: str, concepts_csv_path: str) -> str:
    try:
        concepts_df = pd.read_csv(concepts_csv_path)
        concepts_df.columns = concepts_df.columns.str.strip().str.lower()
        
        concept_list = ""
        for _, row in concepts_df.iterrows():
            concept_list += f"- ID: {row['concept_id']}, Name: {row['concept_name']}\n"
            
        prompt = f"Analyze: '{user_query}'. Return ONLY the matching Concept ID from this list:\n{concept_list}"
        response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        return response.text.strip()
    
    except Exception as e:
        print(f"Extraction Error: {e}")
        return "C005"