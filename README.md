<p align="left">
  <img src="frontend/src/assets/icon.svg" alt="Maya logo" width="120" />
</p>

# Maya — Smart Maternal Health Assistant

> A safety-first, trimester-aware AI companion for pregnant women — delivering evidence-backed answers, tracking health vitals, managing medications, and escalating emergencies before any generative step runs.

**Live Demo:** [maya.orebayet.workers.dev](https://maya.orebayet.workers.dev/) &nbsp;|&nbsp; **Concept video:** [Watch on YouTube](https://youtu.be/5fSn9PKbyHI?si=dudIN9NcpjU6J7mc)

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

### Personalised Onboarding Survey
When a user signs in for the first time, Maya walks them through a structured health survey collecting:
- Age, blood group
- Current medications and supplements
- Due date and gestational week
- Existing conditions (gestational diabetes, hypertension, thyroid disorders, anaemia, etc.)
- Multiple pregnancy indicators

All of this is saved as a persistent health profile that informs every AI interaction going forward. These settings are editable at any time from the profile panel.

---

### RAG-Powered AI Chat
- Answers sourced exclusively from WHO, ACOG, CDC, NHS, and other verified clinical guidelines and health websites
- Trimester-aware prompts — the system knows exactly where you are in your pregnancy and tailors responses accordingly
- Streaming responses token-by-token for a fast, natural feel
- Every answer comes with traceable citations 
- **Voice input** — speak your question instead of typing, fully supported as an alternative input method

---

### Medical Report Upload & Analysis
Upload a lab report or prescription PDF and Maya handles the rest:

**Lab Reports**
- Automatically extracts key clinical values: Haemoglobin (Hb), TSH, Fasting Glucose, Serum Ferritin, Urine Protein, Creatinine, and Weight
- Extracted values are stored directly in the user's health profile and always reflect the latest upload
- Follow-up questions about any uploaded report are supported in a dedicated report-aware chat context

**Prescriptions**
- Automatically parses medications prescribed by the doctor — name, brand, dosage, frequency, duration, and instructions
- Parsed medications are injected directly into the unified medication management system

Lab extraction and report summarisation run **in parallel** via `asyncio.gather()`, cutting upload processing time roughly in half.

---

### Unified Medication Management
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
A dedicated classifier runs on every message *before* RAG or the LLM is invoked. If an emergency symptom pattern is detected, the system short-circuits the generative pipeline entirely and returns a structured emergency response — no hallucinated reassurance, ever. 

---

### Multilingual & Accessible
- Bengali (বাংলা) / English language toggle with full UI translation
- Dark / Light mode with system sync
- Responsive layout with accessible dialog sizing

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
            → rag.search()                  ← Pinecone multi-namespace retrieval (23 namespaces)
            → llm.build_prompt()            ← Trimester context + chat history + retrieved chunks
            → llm.call_llm_stream()         ← Token-delta SSE stream to client
            → Sources returned separately   ← title, excerpt, URL, relevance score
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, TypeScript, TanStack Router, Tailwind CSS, shadcn/ui |
| Backend | FastAPI, Uvicorn |
| Auth / Database | Firebase Authentication (Google Sign-In), Firebase Realtime Database |
| LLM | Groq API — Llama 3.3 70B (versatile) |
| Embedding Model |  `BAAI/bge-m3` (multilingual semantic search) |
| Vector DB / RAG | Pinecone |
| PDF Extraction | pdfplumber |
| Web Scraping | BeautifulSoup, Requests|
| Infra | Docker, SSE streaming, Cloudflare Workers (frontend hosting) |

---

## Knowledge Base

Maya's RAG pipeline is built over **23 Pinecone namespaces** spanning two complementary data source types — authoritative clinical PDF documents and verified health websites scraped and chunked at the section level. All content is embedded using `BAAI/bge-m3` for strong multilingual semantic search. Every vector stores rich metadata (source org, heading, URL, section path) so every citation is fully traceable.

### Clinical PDF Documents

| Namespace | Source | Chunks |
|---|---|---|
| `WHO_MATERNAL_HEALTH_2017` | WHO Antenatal Care Guidelines, 2nd Edition (2017) | 321 |
| `WHO_PCPNC_3rdEd_2015(MAIN)` | WHO PCPNC 3rd Edition (2015) | 742 |
| `WHO_for_diabetes-patients` | WHO Recommendations for Diabetes Patients | 584 |
| `WHO_recommendations_2nd_edition` | WHO Recommendations, 2nd Edition (2025) | 2,254 |
| `ACOG_FAQ` | ACOG Prenatal Care Guidelines & FAQs (2025) | 310 |
| `levels_of_maternal_care` | Levels of Maternal Care Guidelines | 162 |
| `Prepregnancy_Counselling` | Prepregnancy Counselling Guidelines | 151 |
| `Prenatal_Care` | Prenatal Care Reference Document | 136 |
| `SURGEON_GENERAL_CALL_TO_ACTION` | U.S. Surgeon General's Call to Action on Maternal Health (2020) | 1,118 |
| `The_Pregnancy_Book` | UK Department of Health — The Pregnancy Book (2009) | 1,949 |
| `PREGNANCY_BOOK_UK_2022` | Public Health Agency — Pregnancy Care Guide (2022) | 1,589 |
| `PREGNANCY_VACCINES` | Pregnancy Vaccines Reference Guidelines | 337 |
| `WEEK_BY_WEEK_PREGNANCY_INFO` | Week-by-Week Pregnancy Information | 1,091 |

### Verified Health Websites (Web-Scraped)

All web content is scraped using a structured section-by-section pipeline (BeautifulSoup), cleaned of noise, chunked by heading, and upserted into dedicated Pinecone namespaces.

| Namespace | Source | Chunks |
|---|---|---|
| `CDC_PREGNANCY_FAQ` | CDC — Pregnancy FAQs | 215 |
| `CDC_MATERNAL_BIRTH_DEFECTS` | CDC — Maternal Birth Defects | 11 |
| `CDC_MATERNAL_DIABETES` | CDC — Maternal Diabetes | 40 |
| `CDC_PREGNANCY_COMPLICATIONS` | CDC — Pregnancy Complications | 374 |
| `CDC_SAFER_FOOD_PREGNANCY` | CDC — Safer Food During Pregnancy | 23 |
| `NHS_PREGNANCY` | NHS — Pregnancy Hub | 597 |
| `NHS_BEST_START_IN_LIFE` | NHS — Best Start in Life (Labour, Nutrition, Mental Health) | 109 |
| `NHS_COMMON_PROBLEMS` | NHS — Common Pregnancy Problems | 82 |
| `NHS_ULTRASOUND_SCANS` | NHS — Ultrasound Scans in Pregnancy | 13 |
| `NHS_MISCARRIAGE` | NHS — Miscarriage | 16 |

> **Total indexed chunks: ~12,879** across 23 namespaces from WHO, ACOG, CDC, NHS, the U.S. Surgeon General, and UK health authorities.

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

This design eliminates the risk of a generative model producing reassuring-sounding text during a genuine obstetric emergency — the most safety-critical decision in the entire system.

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
- Prepare clinical source PDFs (WHO, ACOG, Surgeon General, etc.)
- Use `backend/rag.py` utilities to embed and upsert into Pinecone, one namespace per document

**Web content:**
- Run the NHS scraper notebook (`Maya_web_scraping.ipynb`) to crawl, clean, and chunk NHS pregnancy pages
- Run equivalent scrapers for CDC namespaces (`CDC_PREGNANCY_FAQ`, `CDC_PREGNANCY_COMPLICATIONS`, etc.)
- Upsert each source into its corresponding Pinecone namespace

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
