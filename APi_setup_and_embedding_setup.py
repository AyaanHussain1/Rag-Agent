import google.genai as genai
import pandas as pd
import json

import os
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
print("Generating embeddings via Gemini API...")

df = pd.read_csv("pure_academic_chunks.csv")
vectors = []

for index , row in df.iterrows():
    try:
        text_data = str(row["Chunk Text Content"])

        response = client.models.embed_content(
            model="gemini-embedding-2",
            contents=text_data
        )

        vector_array = response.embeddings[0].values
        vectors.append(vector_array)

    except Exception as e:
        print(f"Error Processing row{index}: {e}")
        vectors.append([])

df["vector_embeddings"] = [json.dumps(x) for x in vectors ]

df.to_csv("pure_academic_chunks_with_vectors.csv", index=False, encoding="utf-8-sig")
print("Success! Your vectors are generated and saved inside pure_academic_chunks_with_vectors.csv.")