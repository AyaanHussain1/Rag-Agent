import io
import requests
import pandas as pd
from pypdf import PdfReader

# 1. URL of the first PDF link
url = "https://ebooks.lpude.in/management/mba/term_4/DCAP107_DCAP404_OBJECT_ORIENTED_PROGRAMMING.pdf"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

print("Downloading PDF... Please wait.")
# Add the headers parameter here
response = requests.get(url, headers=headers)
pdf_file = io.BytesIO(response.content)
reader = PdfReader(pdf_file)
print(f"Successfully loaded PDF with {len(reader.pages)} pages.\n")

# 2. Define the exact OOP concepts from your spreadsheet template
concepts = {
    "C001": ["class", "object"],
    "C002": ["encapsulation", "data hiding"],
    "C003": ["inheritance", "subclass", "superclass"],
    "C004": ["overloading", "compile-time polymorphism"],
    "C005": ["overriding", "runtime polymorphism"],
    "C006": ["polymorphism"]
}

extracted_chunks = []
chunk_counter = 1

print("Extracting text and filtering by core OOP concepts...")

# 3. Loop through the pages to extract paragraphs
# Focus heavily on chapters covering fundamentals (e.g., first 50-80 pages)
for page_num, page in enumerate(reader.pages[:100]):
    text = page.extract_text()
    if not text:
        continue
        
    # Split the page text into paragraphs/sections
    paragraphs = text.split("\n\n")
    
    for para in paragraphs:
        cleaned_para = para.strip().replace("\n", " ")
        
        # Ensure the chunk has enough academic depth (longer than 120 characters)
        if len(cleaned_para) > 120:
            lower_para = cleaned_para.lower()
            
            # Check which concept this paragraph belongs to
            for concept_id, keywords in concepts.items():
                if any(keyword in lower_para for keyword in keywords):
                    extracted_chunks.append({
                        "Chunk ID": f"CH{str(chunk_counter).zfill(3)}",
                        "Concept ID": concept_id,
                        "Source Page": page_num + 1,
                        "Chunk Text Content": cleaned_para
                    })
                    chunk_counter += 1
                    break # Assign to one concept only

# 4. Convert to DataFrame and save to CSV
df = pd.DataFrame(extracted_chunks)

# Drop any duplicate paragraphs found during parsing
df = df.drop_duplicates(subset=["Chunk Text Content"])

# Save file
output_file = "oop_content_chunks.csv"
df.to_csv(output_file, index=False)

print(f"\nExtraction Complete! Found {len(df)} potential content chunks.")
print(f"Data saved cleanly to '{output_file}'. Open this file to fill your spreadsheet.")