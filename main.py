import pandas as pd 
import numpy as np 
from functions import clean_text,keep_valid_educational_content

df1 = pd.read_csv("local_extracted_chunks.csv")
df2 = pd.read_csv("local_extracted_chunks_2.csv")
df3 = pd.read_csv("local_extracted_chunks_3.csv")
df4 = pd.read_csv("local_extracted_chunks_4.csv")

new_df = pd.concat([df1,df2,df3,df4],axis=0,ignore_index= True)
new_df = new_df.drop_duplicates(subset=["Chunk Text Content"])

new_df["Chunk Text Content"] = new_df["Chunk Text Content"].apply(clean_text)
new_df = new_df[new_df["Chunk Text Content"].apply(keep_valid_educational_content)]

new_df.to_csv("pure_academic_chunks.csv", index=False,encoding="utf-8-sig")

print(f"Garbage removed! You now have {len(new_df)} pure academic explanation rows.")
