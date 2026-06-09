#rag.py
import os
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

print("Loading embedding model...")
model = SentenceTransformer("BAAI/bge-m3")
print("Model loaded.")

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("PINECONE_INDEX"))

def search(question: str, top_k: int = 5) -> list:
    embedding = model.encode(question).tolist()

    namespaces = [
    "SURGEON_GENERAL_CALL_TO_ACTION",
    "CDC_PREGNANCY_FAQ",
    "NHS_PREGNANCY",
    "The_Pregnancy_Book",
    "PREGNANCY_VACCINES",
    "CDC_MATERNAL_BIRTH_DEFECTS",
    "CDC_MATERNAL_DIABETES",
    "PREGNANCY_BOOK_UK_2022",
    "CDC_PREGNANCY_COMPLICATIONS",
    "NHS_COMMON_PROBLEMS",
    "Prenatal_Care",
    "levels_of_maternal_care",
    "NHS_BEST_START_IN_LIFE",
    "WHO_MATERNAL_HEALTH_2017",
    "ACOG_FAQ",
    "WHO_PCPNC_3rdEd_2015(MAIN)",
    "WEEK_BY_WEEK_PREGNANCY_INFO",
    "WHO_for_diabetes-patients",
    "CDC_SAFER_FOOD_PREGNANCY",
    "WHO_recommendations_2nd_edition",
    "NHS_ULTRASOUND_SCANS",
    "NHS_MISCARRIAGE",
    "Prepregnancy_Counselling"
]

    all_chunks = []

    for ns in namespaces:
        results = index.query(
            vector=embedding,
            top_k=top_k,
            include_metadata=True,
            namespace=ns
        )
        for match in results.matches:
            all_chunks.append({
                "score": round(match.score, 4),
                "content": match.metadata.get("content", ""),
                "source": match.metadata.get("source", ""),
                "source_org": match.metadata.get("source_org", ""),
                "page": match.metadata.get("page", ""),
                "section_title": match.metadata.get("section_title", ""),
                "pub_year": match.metadata.get("pub_year", ""),
                "doc_id": match.metadata.get("doc_id", ""),
                "week": match.metadata.get("week", ""), 
                "namespace": ns,
            })

    # sort by score and return top_k overall
    all_chunks.sort(key=lambda x: x["score"], reverse=True)
    return all_chunks[:top_k]