<p align="left">
  <img src="frontend/src/assets/icon.svg" alt="Maya logo" width="120" />
</p>

# Maya — Smart Maternal Health Assistant

> A safety-first, trimester-aware AI companion for pregnant women — delivering evidence-backed answers, tracking health vitals, managing medications, and escalating emergencies before any generative step runs.

🌐 **Live Demo:** [maya.orebayet.workers.dev](https://maya.orebayet.workers.dev/) &nbsp;|&nbsp; **Presentation:** [View on Canva](https://canva.link/vr3uci1cw2psg4w)

![React](https://img.shields.io/badge/-React-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/-Vite-646CFF?logo=vite&logoColor=white)
![FastAPI](https://img.shields.io/badge/-FastAPI-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/-Python-3776AB?logo=python&logoColor=white)
![Firebase](https://img.shields.io/badge/-Firebase-FFCA28?logo=firebase&logoColor=black)
![Groq](https://img.shields.io/badge/-Groq%20LLaMA-000?logo=groq)
![Pinecone](https://img.shields.io/badge/-Pinecone-000?logo=pinecone)

---

## Table of Contents

- [What is Maya?](#what-is-maya)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Knowledge Base](#knowledge-base)
- [Safety Escalation](#safety-escalation)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## What is Maya?

Maya is an AI-powered maternal health companion built from the ground up for pregnant women. It combines a **retrieval-augmented generation (RAG)** pipeline over curated clinical documents and verified health websites with a **deterministic safety classifier** that intercepts emergencies *before* any generative step runs — ensuring mothers never receive a hallucinated reassurance when they need real help.

From the moment a user signs in, Maya personalises every interaction around their pregnancy week, health conditions, and uploaded medical history. It isn't just a chatbot — it's a full health management layer: tracking vitals, parsing lab reports, managing medications, sending daily reminders, and visualising health trends across the entire pregnancy journey.

---

## Key Features

### 🧾 Personalised Onboarding Survey
When a user signs in for the first time, Maya walks them through a structured health survey collecting:
- Age, blood group, known allergies
- Current medications and supplements
- Due date and gestational week
- Existing conditions (gestational diabetes, hypertension, thyroid disorders, anaemia, etc.)
- Multiple pregnancy indicators

All of this is saved as a persistent health profile that informs every AI interaction going forward. These settings are editable at any time from the profile panel.

---

### 💬 RAG-Powered AI Chat
- Answers sourced exclusively from WHO, ACOG, NHS, and other verified clinical guidelines and health websites
- Trimester-aware prompts — the system knows exactly where you are in your pregnancy and tailors responses accordingly
- Streaming responses token-by-token for a fast, natural feel
- Every answer comes with traceable citations (title, excerpt, source URL, relevance score)
- **Voice input** — speak your question instead of typing, fully supported as an alternative input method

---

### Medical Report Upload & Analysis
Upload a lab report or prescription PDF and Maya handles the rest:

**Lab Reports**
- Automatically extracts key clinical values: Haemoglobin (Hb), TSH, Fasting Glucose, Blood Pressure (systolic/diastolic), Serum Ferritin, Urine Protein, Creatinine, and Weight
- Extracted values are stored directly in the user's health profile and always reflect the latest upload
- Follow-up questions about any uploaded report are supported in a dedicated report-aware chat context

**Prescriptions**
- Automatically parses medications prescribed by the doctor — name, brand, dosage, frequency, duration, and instructions
- Parsed medications are injected directly into the unified medication management system

Lab extraction and report summarisation run **in parallel** via `asyncio.gather()`, cutting upload processing time roughly in half.

---

###  Unified Medication Management
- Medications from three sources unified in one list: manually added, auto-extracted from prescriptions, and added during onboarding
- **Daily reminders** shown as a banner on every login — e.g. *"Good morning! Don't forget to take Folic Acid and Iron today"* — rotating through all active medications
- Full add/delete control over manual medications; prescription medications are read-only to preserve clinical accuracy
- Single-fire per day — reminders don't spam on multiple logins

---

### Pregnancy & Health Tracker

**Weekly Progress**
- Baby size comparisons with trimester-aware emoji icons (🥕 week 21, 🍉 week 39, and so on)
- Visual progress bar with trimester detection (first / second / third)
- Countdown in days to due date

**Weight Graph**
- A plotted Recharts line chart pulling weight from multiple sources: manual user input and weights extracted automatically during lab report uploads — all merged into a single weight history with a continuous trend line

**Health Panel**
- BMI auto-calculated from profile height and weight, with status labels
- Structured display of all extracted lab values for quick reference
- Blood type and due date quick-reference cards

**Appointments Tracker**
- Auto-suggested appointments based on gestational week (dating scan, anomaly scan, GTT, etc.)
- Full add / complete / dismiss workflow with countdown to each appointment
- Unread appointment notification badges in the sidebar

---

### Safety Escalation
A dedicated classifier runs on every message *before* RAG or the LLM is invoked. If an emergency symptom pattern is detected, the system short-circuits the generative pipeline entirely and returns a structured emergency response — no hallucinated reassurance, ever. See [Safety Escalation](#safety-escalation) for full details.

---

### 🌐 Multilingual & Accessible
- Bengali (বাংলা) / English language toggle with full UI translation via `tr()` function
- Dark / Light mode with system sync
- Responsive layout with accessible dialog sizing (`w-[680px] max-w-[90vw]`)

---

### Chat Management
- New Chat, Pin, Archive, Delete — full control over conversation history
- Search / filter chats by title
- Auto-sort by latest activity — most recently active chats float to top
- All history persisted to Firebase
- PDF file attachments supported (up to 3MB, drag-and-drop or click)

---

## System Architecture

![Architecture diagram](https://i.imgur.com/nIvwyLH.png)

```
React Frontend
    → Firebase Google Sign-In + Pregnancy Profile
    → POST /query/stream  (or /query-report for report-aware chat)
        → FastAPI Backend
            → safety.check_safety()         ← Emergency classifier (Groq, low temp, constrained output)
                ↓ safe
            → rag.search()                  ← Pinecone multi-namespace retrieval (10 namespaces)
            → llm.build_prompt()            ← Trimester context + chat history + retrieved chunks
            → llm.call_llm_stream()         ← Token-delta SSE stream to client
            → Sources returned separately   ← title, excerpt, URL, relevance score
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, TypeScript, TanStack Router, Tailwind CSS, shadcn/ui |
| Backend | FastAPI, Uvicorn, Pydantic |
| Auth / Database | Firebase Authentication (Google Sign-In), Firebase Realtime Database |
| LLM | Groq API — Llama 3.3 70B (versatile) |
| Embeddings | SentenceTransformer `BAAI/bge-m3` (multilingual semantic search) |
| Vector DB / RAG | Pinecone — 10 namespaces, custom pipeline in `backend/rag.py` |
| PDF Extraction | pdfplumber |
| Charts | Recharts |
| Web Scraping | BeautifulSoup, Requests (for NHS knowledge base ingestion) |
| Infra | Docker, SSE streaming, Cloudflare Workers (frontend hosting) |

---

## Knowledge Base

Maya's RAG pipeline is built over two complementary data sources — **clinical PDF documents** and **verified health websites** — all embedded using `BAAI/bge-m3` and stored across Pinecone namespaces. Every vector includes metadata (title, heading, excerpt, URL) so citations are always traceable.

### 📄 Clinical PDF Documents

| # | Source |
|---|---|
| 1 | WHO Antenatal Care Guidelines (2017, 2nd Edition) |
| 2 | WHO PCPNC 3rd Edition |
| 3 | UK Department of Health — The Pregnancy Book (2009) |
| 4 | Public Health Agency — Pregnancy Care Guide (2022) |
| 5 | U.S. Surgeon General's Call to Action on Maternal Health (2020) |
| 6 | WHO Recommendations for Diabetes Patients |
| 7 | Prepregnancy Counselling Guidelines |
| 8 | ACOG Prenatal Care Guidelines (2025) |
| 9 | WHO Recommendations 2nd Edition (2025) |
| 10 | Levels of Maternal Care Guidelines |

### Verified Health Websites (Web-Scraped)

NHS Best Start in Life — pregnancy content scraped, cleaned, and chunked into the RAG index:

| Topic Area | Pages Indexed |
|---|---|
| Preparing for Labour & Birth | Pain relief during labour, signs of labour, hospital bag checklist, choosing where to give birth, giving birth, using a birthing ball, antenatal classes, what to buy for newborn, birth plan, overdue guidance, tips for birthing partners |
| Healthy Living in Pregnancy | Healthy eating, vitamins and supplements, smoking and alcohol, exercising in pregnancy |
| Mental & General Health | Mental health in pregnancy, morning sickness, hair dye safety |
| Partner Support | Advice for partners |

> Scraping uses a polite crawl delay, structured section extraction (heading + body), and noise filtering. Each chunk is stored with full metadata: source org, URL, heading, section path, and relevance level.

---

## Safety Escalation

Maya's safety layer runs on **every single user message** — before RAG, before the LLM.

1. `backend/safety.py` sends the message to a Groq-powered classifier with a system prompt tuned specifically to maternal red-flag symptoms
2. The classifier runs at **low temperature** with a constrained output format (`{"emergency": true/false}`) for maximum determinism and auditability
3. If `emergency: true` — the backend short-circuits entirely and returns a structured emergency response that:
   - Directs the user to seek immediate in-person care
   - Advises contacting emergency services
   - Provides calm guidance on what to do while waiting
   - Clearly states this is not a substitute for medical assessment
4. Only when `emergency: false` does the normal RAG → prompt assembly → LLM flow proceed

This design eliminates the risk of a generative model producing reassuring-sounding text during a genuine obstetric emergency — the most safety-critical design decision in the entire system.

---

## Getting Started

**Prerequisites**
- Python 3.10+
- Node.js 16+ and npm (or pnpm)
- Firebase project with Google Sign-In enabled
- Pinecone account and index
- Groq API key

### 1. Clone

```bash
git clone https://github.com/your-org/maya.git
cd maya
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Create backend/.env — see Environment Variables below
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

### 4. Seed the Knowledge Base

**PDFs:**
- Prepare clinical source PDFs (WHO, ACOG, etc.)
- Use `backend/rag.py` utilities to embed and upsert into Pinecone across your configured namespaces

**Web content:**
- Run the NHS scraper notebook (`Maya_web_scraping.ipynb`) to crawl, clean, and chunk NHS pregnancy pages
- Upsert chunks into the `NHS_BEST_START_IN_LIFE` Pinecone namespace

Verify content via the Pinecone dashboard or `rag.search()` locally.

---

## Environment Variables

### `backend/.env`

| Key | Purpose |
|---|---|
| `GROQ_API_KEY` | Groq API key (LLM + safety classifier) |
| `PINECONE_API_KEY` | Pinecone API key |
| `PINECONE_INDEX` | Pinecone index name |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Path to Firebase service account JSON |
| `DOCS_ADMIN_EMAILS` | Comma-separated admin emails |

```env
GROQ_API_KEY=sk_...
PINECONE_API_KEY=pc_...
PINECONE_INDEX=maternal-health
GOOGLE_SERVICE_ACCOUNT_JSON=./serviceAccount.json
DOCS_ADMIN_EMAILS=you@example.com
```

### `frontend/.env`

| Key | Purpose |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_API_URL` | Backend URL (e.g. `http://localhost:8000`) |

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_API_URL=http://localhost:8000
```

> Never commit `.env` files or `serviceAccount.json` to version control. Use a secret manager for production deployments.

---

## Contributing

Contributions are welcome! To get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "feat: describe your change"`
4. Push to your branch: `git push origin feature/your-feature-name`
5. Open a Pull Request with a clear description of what changed and why

For major features, please open an issue first to discuss the approach before investing time in implementation.

---

<p align="center">Built with ❤️ for mothers, by a team that cares about maternal health.</p>
