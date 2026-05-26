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
        "WHO_PCPNC_3rdEd",
        "WHO_ANTENATAL_CARE_2017",
        "Prenatal_Care",
        "MATERNAL_PREGNANCY_CARE_GUIDE",
        "SURGEON_GENERAL_CALL_TO_ACTION",
        "WHO_for_diabetes-patients",
        "Prepregnancy_Counselling",
        "WHO_recommendations_2nd_edition",
        "The_Pregnancy_Book",
        "levels_of_maternal_care",
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
                "namespace": ns,
            })

    # sort by score and return top_k overall
    all_chunks.sort(key=lambda x: x["score"], reverse=True)
    return all_chunks[:top_k]