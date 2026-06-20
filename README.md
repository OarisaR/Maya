<p align="left">
	<img src="frontend/src/assets/icon.svg" alt="Maya logo" width="120" />
</p>


# Maya — Smart Maternal Health Assistant

Maya is an evidence‑backed, safety‑first conversational assistant for pregnancy care. It pairs a short, auditable safety classifier with retrieval‑augmented generation so answers cite trusted clinical sources and emergencies are escalated before any generative step.

**Built with:**  
![React](https://img.shields.io/badge/-React-61DAFB?logo=react&logoColor=black) ![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/-Vite-646CFF?logo=vite&logoColor=white) ![FastAPI](https://img.shields.io/badge/-FastAPI-009688?logo=fastapi&logoColor=white) ![Python](https://img.shields.io/badge/-Python-3776AB?logo=python&logoColor=white) ![Firebase](https://img.shields.io/badge/-Firebase-FFCA28?logo=firebase&logoColor=black) ![Groq](https://img.shields.io/badge/-Groq%20LLaMA-000?logo=groq) ![Pinecone](https://img.shields.io/badge/-Pinecone-000?logo=pinecone)

---

## Project tagline

Maya — a safety-first, trimester-aware maternal health assistant that gives evidence-backed answers, shows sources, and escalates emergencies before any generative step.

---

## Features

- Google Sign-In with pregnancy profile setup (gestational week, due date, health conditions, preferred language)
- RAG-powered chat using curated clinical sources (WHO, ACOG, NHS, local MOHs)
- Safety escalation layer that detects emergency symptoms before RAG/LLM runs
- Streaming LLM responses via `call_llm_stream()` for snappy progressive UX
- Source citations returned separately with each answer (title, excerpt, URL, score)
- Trimester-aware personalization injected into every prompt
- Persistent user/session state in Firebase (auth + Realtime DB / Firestore patterns)

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, TypeScript, TanStack Router, Tailwind-like utilities |
| Backend | FastAPI, Uvicorn, Pydantic |
| Auth / Data | Firebase Authentication (Google Sign-In), Realtime Database / Firestore patterns |
| LLM | Groq LLaMA — Llama 3.3 70B (versatile) via Groq API for response generation |
| Vector DB / RAG | Pinecone (multi-namespace RAG, 10 namespaces). Embeddings produced with SentenceTransformer `BAAI/bge-m3` for semantic search. Custom RAG pipeline implemented in `backend/rag.py`.
| Infra / Dev | Docker (Dockerfiles included), SSE streaming for token stream, local .env support |

---

## System architecture flow

![Architecture diagram](https://i.imgur.com/nIvwyLH.png)

React → Firebase login → POST /query or /query/stream → FastAPI → Safety check (Groq safety classifier) → RAG retrieval (Pinecone + embeddings) → Prompt assembly (trimester + history + retrieved context) → LLM (Groq LLaMA) → Response (streamed tokens + separate sources)

Sequence notes:
- Frontend authenticates the user with Google and includes pregnancy profile details (week) in chat requests.
- Backend `POST /query` and `POST /query/stream` are the primary chat entrypoints.
- `safety.check_safety()` runs a deterministic classifier to surface emergencies and short‑circuit RAG/LLM when needed.
- `rag.search()` queries the Pinecone index(s) and returns top chunks with metadata used as citations.
- `llm.build_prompt()` composes a trimmed prompt including trimester-aware instructions and an emergency override when necessary.
- `llm.call_llm_stream()` yields token deltas for SSE streaming to the client.

---

## Getting started

Prerequisites
- Python 3.10+
- Node.js 16+ and npm (or pnpm)
- A Firebase project (Google Sign-In enabled)
- Pinecone (or alternate vector DB) account and index
- GROQ API key for Groq LLaMA

1) Clone

```bash
git clone https://github.com/your-org/maya.git
cd maya
```

2) Backend (FastAPI)

```bash
cd backend
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# create a .env file with the variables listed below
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

3) Frontend (React / Vite)

```bash
cd frontend
npm install
npm run dev
# open the Vite URL (default http://localhost:5173)
```

4) Seeding the knowledge base (high-level)

- Prepare source documents (PDFs / markdown) from WHO or other sites.
- Use or adapt `backend/rag.py` utilities to embed documents and upsert vectors to Pinecone.
- Confirm index content by querying via Pinecone dashboard or `rag.search()` locally.

Notes & quick tips
- The backend expects a service account JSON for Firebase admin (`serviceAccount.json`) for token verification — keep it private and don’t commit it.
- The frontend currently contains a Firebase config in `frontend/src/lib/firebase.ts`; for production move these values to env variables and avoid committing secrets.

---

## Environment variables (.env keys)

Create a `.env` in `backend/` (and `frontend/.env` for client-side config) and DO NOT commit secrets to git. Use secret managers for production.

Required backend keys (examples):

| Key | Purpose |
|---:|---|
| GROQ_API_KEY | Groq LLaMA API key (LLM + safety classifier) |
| PINECONE_API_KEY | Pinecone API key for vector DB access |
| PINECONE_INDEX | Pinecone index name used by RAG |
| GOOGLE_SERVICE_ACCOUNT_JSON | Path to Firebase service account JSON (for backend admin SDK) |
| DOCS_ADMIN_EMAILS | Comma-separated admin emails for docs admin access |

Example `backend/.env` (do NOT paste real keys into repo):

```env
GROQ_API_KEY=sk_...
PINECONE_API_KEY=pc_...
PINECONE_INDEX=maternal-health
GOOGLE_SERVICE_ACCOUNT_JSON=./serviceAccount.json
DOCS_ADMIN_EMAILS=you@example.com
```

Frontend environment (Vite) — place in `frontend/.env` or `frontend/.env.local`:

| Key | Purpose |
|---:|---|
| VITE_FIREBASE_API_KEY | Firebase web API key (frontend only) |
| VITE_FIREBASE_AUTH_DOMAIN | Firebase auth domain |
| VITE_FIREBASE_PROJECT_ID | Firebase project id |
| VITE_API_URL | Backend URL (e.g. http://localhost:8000) |

Example `frontend/.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_API_URL=http://localhost:8000
```

Security reminder: the backend `.env` contains sensitive keys (Pinecone, Groq). Treat them as secrets.

---

## Knowledge base sources

Primary documents embedded and indexed for RAG (stored across 10 Pinecone namespaces):

1. WHO Antenatal Care Guidelines (2017, 2nd Edition)
2. WHO PCPNC 3rd Edition
3. UK Department of Health - The Pregnancy Book (2009)
4. Public Health Agency - Pregnancy Care Guide (2022)
5. U.S. Surgeon General's Call to Action on Maternal Health (2020)
6. WHO Recommendations for Diabetes Patients
7. Prepregnancy Counselling Guidelines
8. ACOG Prenatal Care Guidelines (2025)
9. WHO Recommendations 2nd Edition (2025)
10. Levels of Maternal Care Guidelines

Technical notes:
- All documents were embedded using the SentenceTransformer model `BAAI/bge-m3` (multilingual embeddings) and upserted into Pinecone across 10 namespaces (see `backend/rag.py` for namespace list).
- LLM used for answer generation: Llama 3.3 70B (versatile) via the Groq API (`llm.call_llm` / `llm.call_llm_stream`).
- RAG pipeline: custom retrieval implemented in `backend/rag.py` (embedding -> Pinecone query -> chunk aggregation) and orchestrated by `backend/main.py`.

The repository stores metadata with each vector so the backend can return traceable citations (title, excerpt, URL, score) alongside generated answers.

---

## Safety escalation (how it works)

1. Incoming chat text is first passed to `backend/safety.py` which runs a deterministic LLM-based safety classifier (Groq) using a system prompt tuned to maternal red flags.
2. If the classifier returns `{"emergency": true}`, the backend short-circuits the normal RAG → LLM flow and returns an emergency template (or forces the LLM to respond with emergency instructions for streaming endpoints).
3. Emergency responses emphasize: seek immediate care, contact emergency services, what to do while waiting (calm language), and clearly state _this is not a substitute for in‑person medical assessment_.

Design rationale:
- Avoids hallucinated reassurance by preventing the RAG/LLM from generating non-audited text during emergencies.
- Classifier operates with low temperature and a constrained output format to improve determinism and auditability.

---


