import os
import pandas as pd
from pypdf import PdfReader

# 1. Define the exact path to your locally downloaded file
# Change this filename if you named it something else
local_pdf_path = r"C:\Users\DELL\Desktop\Skill Verse Project\Pdf\🔹OOPS CONCEPTS 🔹.pdf" 

# Check if the file exists in the directory before opening
if not os.path.exists(local_pdf_path):
    raise FileNotFoundError(f"Could not find '{local_pdf_path}'. Make sure it's in the same folder as this script!")

print(f"Loading local file: {local_pdf_path}")
reader = PdfReader(local_pdf_path)
print(f"Loaded successfully! Total pages: {len(reader.pages)}\n")

# 2. Define your target mapping variables (From your Excel template)
concepts = {
    "C001": ["class", "object", "instantiation"],
    "C002": ["encapsulation", "data hiding", "private modifier"],
    "C003": ["inheritance", "subclass", "superclass", "extends"],
    "C004": ["overloading", "compile-time polymorphism"],
    "C005": ["overriding", "runtime polymorphism", "dynamic dispatch"],
    "C006": ["polymorphism"]
}

extracted_chunks = []
chunk_counter = 1

print("Analyzing pages and sorting academic paragraphs...")

# 3. Process the downloaded document page by page
for page_num, page in enumerate(reader.pages):
    text = page.extract_text()
    if not text:
        continue
        
    # Split the raw text of the page into distinct paragraphs
    paragraphs = text.split("\n\n")
    
    for para in paragraphs:
        # Strip trailing white spaces and flatten multi-line blocks into clean rows
        cleaned_para = para.strip().replace("\n", " ")
        
        # Keep paragraphs that have enough text depth for a dataset chunk (over 120 characters)
        if len(cleaned_para) > 120:
            lower_para = cleaned_para.lower()
            
            # Check keywords against our dictionary mapping
            for concept_id, keywords in concepts.items():
                if any(keyword in lower_para for keyword in keywords):
                    extracted_chunks.append({
                        "Chunk ID": f"CH{str(chunk_counter).zfill(3)}",
                        "Concept ID": concept_id,
                        "Source Page": page_num + 1,
                        "Chunk Text Content": cleaned_para
                    })
                    chunk_counter += 1
                    break  # Associate paragraph to the first matching concept priority

# 4. Filter duplicates and drop them out
df = pd.DataFrame(extracted_chunks)
if not df.empty:
    df = df.drop_duplicates(subset=["Chunk Text Content"])

# Save output to file path
output_file = "local_extracted_chunks_4.csv"
df.to_csv(output_file, index=False)

print(f"\nExecution finished! Cleaned dataset saved to '{output_file}'")
print(f"Total structured content rows generated: {len(df)}")