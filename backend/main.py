# the central controller/orchestrator of entire AI pipeline.:maun.py

# uvicorn main:app --reload --port 8000

from calendar import week
from email.mime import text
import os
from pydoc import text
from datetime import datetime, timezone
import token
from typing import Any

from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware # to allow cross-origin requests from frontend; decides which websites are allowed to talk to your API
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel # to define the shape of incoming request data (question, history, etc.)
from dotenv import load_dotenv
from rag import search
import pdfplumber
import uuid
import io
import base64
from llm import build_prompt, call_llm, call_llm_stream
from auth import verify_token, verify_admin_token
from firebase_admin import db
from firebase_admin import auth as firebase_auth
import asyncio
import json
from safety import check_safety
from docs_store import (
    admin_docs_view,
    default_docs,
    docs_access_state,
    is_docs_public,
    load_docs_state,
    public_docs_view,
    save_docs_state,
)
from starlette.concurrency import iterate_in_threadpool

# EMERGENCY_RESPONSE = (
#     "I've noticed symptoms that may require urgent attention. "
#     "Please contact your doctor or local emergency services immediately.\n\n"
#     "While you wait: stay calm "
#     "and have someone with you if possible.\n\n"
#     "This is not a substitute for professional medical advice."
# )

load_dotenv() # loads the env variables from .env file so you can access them via os.getenv("VAR_NAME")

# Disable FastAPI's built-in /docs route so our app can own /docs.
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None) # creates fastapi instance, the main entry point for all API calls

app.add_middleware(
    CORSMiddleware,
    # only these urls can call backend API
    allow_origins=[
        "http://localhost:8081",
        "http://localhost:8080",
        "http://localhost:5173",
        # add production domain here later
    ],
    allow_credentials=True, #Allows cookies/auth headers.
    allow_methods=["*"], #Allows all HTTP methods (GET, POST, etc.).
    allow_headers=["*"], #Allows all headers in requests (like Content-Type, Authorization, etc.
)


class QueryRequest(BaseModel): #Defines the shape of data your API 
    question: str
    top_k: int = 5
    history: list = []
    week: int = 24   # default fallback
    uid: str =""
    token: str=""

class ReportQueryRequest(BaseModel):
    """Shape of incoming request when user asks a follow-up question about an uploaded report."""
    question: str
    reportId: str        # which report they're asking about
    uid: str             # user's Firebase UID
    week: int = 24       # pregnancy week for context
    history: list = []   # conversation history so far in this report chat
    token: str = ""      # Firebase auth token for verification

class DocsSaveRequest(BaseModel):
    docs: dict[str, Any]
    publish: bool = False


class DocsVisibilityRequest(BaseModel):
    enabled: bool | None = None
    mode: str | None = None
    timezone: str | None = None
    startAt: str | None = None
    endAt: str | None = None
    durationHours: int | None = None


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

def _verify_token(token: str, expected_uid: str) -> None:
    try:
        decoded = firebase_auth.verify_id_token(token)
        if decoded["uid"] != expected_uid:
            raise HTTPException(status_code=401, detail="Token UID does not match")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
@app.get("/")
def root():
    return { "status": "Maya backend running" }


@app.post("/query/stream") # new streaming endpoint that sends partial LLM tokens as they are generated, for a more dynamic frontend experience
async def query_stream(req: QueryRequest):
    _verify_token(req.token, req.uid)
    safety = check_safety(req.question)
    is_emergency = safety["emergency"]

    chunks = search(req.question, req.top_k)


    # print(f"[query/stream] Retrieved {len(chunks)} chunks:")
    # for i, c in enumerate(chunks):
    #     print(f"  [{i+1}] score={c['score']} | source={c['source_org']} | doc={c['doc_id']} | page={c['page']}")
    #     print(f"       content: {c['content'][:200]}...")  # first 200 chars only
    #     print()
    
    if not chunks:
        async def no_result():
            yield "data: " + json.dumps({"type": "error", "content": "I couldn't find relevant information. Please consult your healthcare provider."}) + "\n\n"
        return StreamingResponse(no_result(), media_type="text/event-stream")

    # emergency flag passed into prompt — LLM handles the tone
    prompt = build_prompt(req.question, chunks, req.history, week=req.week, emergency=is_emergency)

    def generate():
        yield "data: " + json.dumps({"type": "sources", "content": chunks}) + "\n\n"
        for token in call_llm_stream(prompt):
            yield "data: " + json.dumps({"type": "token", "content": token}) + "\n\n"

    return StreamingResponse(iterate_in_threadpool(generate()), media_type="text/event-stream")


UNITS = {
    "hb": "g/dL",
    "tsh": "mIU/L",
    "glucose": "mg/dL",
    "ferritin": "ng/mL",
    "urine_protein": "",
    "weight": "kg",
}

@app.post("/upload-report")
async def upload_report(
    file: UploadFile = File(...),
    uid: str = Form(...),
    week: int = Form(24),
    token: str = Form(...),
):
    # Verify token
    try:
        decoded = firebase_auth.verify_id_token(token)
        if decoded["uid"] != uid:
            raise HTTPException(status_code=401, detail="Token UID does not match provided UID")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Read PDF
    file_bytes = await file.read()
    if len(file_bytes) > 3 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 3MB limit")

    # Extract text
    extracted_text = ""
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse PDF: {str(e)}")

    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="Uploaded PDF does not contain extractable text.")

    # Generate report ID early (needed for weight_entry linking)
    report_id = str(uuid.uuid4())
    trimester = "first" if week <= 12 else "second" if week <= 26 else "third"

    # prompts
    unified_prompt = f"""You are a medical data extractor. Analyze this document and extract structured data.

    Document text (first 4000 chars):
    {extracted_text[:4000]}

    Determine if this is a LAB REPORT, PRESCRIPTION, or BOTH.

    For LAB REPORTS, extract:
    - reportDate: collection date (YYYY-MM-DD or null)
    - values: array of {{type, value, reportRange}}

    Extract value as NUMBER ONLY. No units, no text.
    Use ONLY these exact type strings:
    - "hb" for haemoglobin
    - "tsh" for thyroid stimulating hormone
    - "glucose" for blood sugar
    - "ferritin" for serum ferritin
    - "urine_protein" for urine protein
    - "weight" for body weight

    Example: {{"type": "hb", "value": 10.4, "reportRange": "11.0 – 16.0"}}

    For PRESCRIPTIONS, extract:
    - medications: array with name, brand (if any), dosage, frequency, duration, instructions

    Return ONLY this JSON structure:
    {{
    "reportType": "lab" | "prescription" | "both",
    "reportDate": "2025-05-28",
    "values": [
        {{"type": "hb", "value": 10.4, "reportRange": "11.0 – 16.0"}}
    ],
    "medications": [
        {{"name": "Ferrous Sulphate", "brand": "Ferlin-F", "dosage": "200 mg", "frequency": "once daily", "duration": null, "instructions": "take with orange juice"}}
    ]
    }}

If a field is not present, use null or empty array. No markdown, no explanations."""

    summary_prompt = f"""You are Maya, a warm maternal health AI assistant.
        A pregnant woman at week {week} ({trimester} trimester) has uploaded a medical report.

        Your job:
        1. Summarize what this report contains in simple, reassuring language
        2. Highlight any values that seem notable for her stage of pregnancy
        3. Gently remind her to discuss results with her doctor
        4. Do NOT diagnose. Do NOT alarm unnecessarily.
        5. Keep it concise — 3 to 5 sentences.

        Report contents:
        {extracted_text}

        Summary:"""

    # ── RUN BOTH LLM CALLS IN PARALLEL ──
    try:
        extraction_raw, summary = await asyncio.gather(
            asyncio.to_thread(call_llm, unified_prompt),
            asyncio.to_thread(call_llm, summary_prompt)
        )
    except Exception as e:
        print(f"[upload-report] LLM calls failed: {e}")
        # Fallback: save report with minimal data
        summary = "I couldn't analyze this report. Please consult your doctor."
        extraction_raw = None

    # ── PARSE EXTRACTION RESULT ──
    lab_values = []
    medications = []
    weight_entry = None
    report_date_str = None

    if extraction_raw:
        try:
            # Clean markdown formatting
            clean_json = extraction_raw.strip()
            if clean_json.startswith("```json"):
                clean_json = clean_json[7:]
            if clean_json.startswith("```"):
                clean_json = clean_json[3:]
            if clean_json.endswith("```"):
                clean_json = clean_json[:-3]
            clean_json = clean_json.strip()

            # Parse JSON
            parsed = json.loads(clean_json)
            report_type = parsed.get("reportType", "lab").lower().strip()
            report_date_str = parsed.get("reportDate")

            # ── LAB VALUES ──
            if report_type in ["lab", "both"]:
                extracted_values = parsed.get("values", [])
                for val in extracted_values:
                    if not val.get("type") or val.get("value") is None:
                        continue
                        # Clean value - extract number from strings like "10.4" or "10.4 g/dL"
                    raw_val = val["value"]
                    if isinstance(raw_val, str):
                        import re
                        m = re.search(r"[\d.]+", raw_val)
                        if not m:
                            continue
                        raw_val = m.group()
                    
                    try:
                        num_val = float(raw_val)
                    except ValueError:
                        continue
                    # Standard values
                    lab_values.append({
                        "id": str(uuid.uuid4()),
                        "type": val["type"],
                        "value": val["value"] if val["type"] == "urine_protein" else float(val["value"]),
                        "unit": UNITS.get(val["type"], ""),
                        "reportRange": val.get("reportRange"),
                        "date": report_date_str or datetime.now(timezone.utc).isoformat(),
                        "extractedAt": datetime.now(timezone.utc).isoformat()
                    })

                    # Weight tracking
                    if val["type"] == "weight":
                        weight_kg = float(val["value"])
                        if val.get("unit", "").lower() in ["lbs", "lb", "pounds"]:
                            weight_kg = weight_kg * 0.453592

                        weight_entry = {
                            "id": str(uuid.uuid4()),
                            "weight": round(weight_kg, 1),
                            "date": report_date_str or datetime.now(timezone.utc).isoformat(),
                            "source": "report",
                            "reportId": report_id
                        }

                # Save lab values
                if lab_values:
                    lab_ref = db.reference(f"users/{uid}/labValues")
                    existing = lab_ref.get() or {}
                    for lv in lab_values:
                        existing[lv["id"]] = lv
                    lab_ref.set(existing)

                # Save weight
                if weight_entry:
                    wh_ref = db.reference(f"users/{uid}/weightHistory")
                    existing_wh = wh_ref.get() or {}
                    existing_wh[weight_entry["id"]] = weight_entry
                    wh_ref.set(existing_wh)

                    # Update profile weight if most recent
                    profile_ref = db.reference(f"users/{uid}/profile/health")
                    profile_data = profile_ref.get() or {}
                    last_manual_update = profile_data.get("lastWeightUpdate")

                    report_date = datetime.fromisoformat(report_date_str.replace("Z", "+00:00")) if report_date_str else datetime.now(timezone.utc)

                    should_update = True
                    if last_manual_update:
                        last_manual_dt = datetime.fromisoformat(last_manual_update.replace("Z", "+00:00"))
                        if last_manual_dt >= report_date:
                            should_update = False

                    if should_update:
                        profile_ref.update({
                            "weightKg": weight_entry["weight"],
                            "lastWeightUpdate": weight_entry["date"]
                        })

            # ── MEDICATIONS (NEW) ──
            if report_type in ["prescription", "both"]:
                extracted_meds = parsed.get("medications", [])
                for med in extracted_meds:
                    if not med.get("name"):
                        continue

                    medications.append({
                        "id": str(uuid.uuid4()),
                        "name": med["name"],
                        "brand": med.get("brand") or None,
                        "dosage": med.get("dosage", ""),
                        "frequency": med.get("frequency", ""),
                        "duration": med.get("duration") or None,
                        "instructions": med.get("instructions") or None,
                        "source": "prescription",
                        "reportId": report_id,
                        "extractedAt": datetime.now(timezone.utc).isoformat()
                    })

                # Save medications to Firebase
                if medications:
                    med_ref = db.reference(f"users/{uid}/medications")
                    existing_meds = med_ref.get() or {}
                    for m in medications:
                        existing_meds[m["id"]] = m
                    med_ref.set(existing_meds)

        except Exception as e:
            print(f"[upload-report] Extraction parsing error: {e}")

    # Encode and save report
    pdf_base64 = base64.b64encode(file_bytes).decode('utf-8')

    report_data = {
        "id": report_id,
        "fileName": file.filename,
        "uploadedAt": datetime.now(timezone.utc).isoformat(),
        "week": week,
        "summary": summary,
        "extractedText": extracted_text[:10000],
        "pdfBase64": pdf_base64,
    }
    
    ref = db.reference(f"users/{uid}/reports/{report_id}")
    ref.set(report_data)

    return {
        "reportId": report_id,
        "summary": summary,
        "medications": medications,  #  Return to frontend
    }


@app.post("/query-report")
async def query_report(req: ReportQueryRequest):
    "Handles follow-up question about a specific report"

    _verify_token(req.token, req.uid)
    # fetch stored report
    ref = db.reference(f"users/{req.uid}/reports/{req.reportId}")
    report = ref.get()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    extracted_text = report.get("extractedText", "")
    
    # run rag to find relevant chunks 
    chunks = search(req.question, top_k=3)

    print(f"[query-report] Retrieved {len(chunks)} chunks:")
    for i, c in enumerate(chunks):
        print(f"  [{i+1}] score={c['score']} | source={c['source_org']} | doc={c['doc_id']} | page={c['page']}")
        print(f"       content: {c['content'][:200]}...")  # first 200 chars only
        print()


    rag_context = "\n\n".join([
        f"[Source: {c['source']}, {c['source_org']}]\n{c['content']}"
        for c in chunks
    ]) if chunks else ""


    # build convo string
    history_text = ""
    if req.history:
        history_text = "Conversation so far:\n" + "\n".join([
            f"{'User' if m['role'] == 'user' else 'Maya'}: {m['content']}"
            for m in req.history
        ])
    trimester = "first" if req.week <= 12 else "second" if req.week <= 26 else "third"
    # build prompt by combining report +rag +history
    prompt = f"""You are Maya, a warm maternal health AI assistant.
                The user is at week {req.week} ({trimester} trimester).

                The user has uploaded a medical report. Here are its contents:
                --- REPORT START ---
                {extracted_text[:10000]}
                --- REPORT END ---

                {"Relevant medical guidelines from WHO/NHS:" + rag_context if rag_context else ""}

                {history_text}

                Answer the user's question about their report.
                Be specific to their actual values where possible.
                Do NOT diagnose. Suggest discussing results with their doctor.

                Question: {req.question}
                Answer:"""

    # Check for emergency keywords in the question
    safety = check_safety(req.question)
    if safety["emergency"]:
        # Reuse your existing emergency prompt logic
        prompt = prompt.replace(
            "Answer the user's question",
            "URGENT: The user may be describing an emergency. Respond with urgency and tell them to contact their doctor immediately. Then answer the question."
        )

    # 6. Stream the response back to frontend (same pattern as /query/stream)
    def generate():
        # yield returns value from a function but does not terminates
        yield "data: " + json.dumps({"type": "sources", "content": chunks}) + "\n\n" # dump converts object to string
        for token in call_llm_stream(prompt):
            yield "data: " + json.dumps({"type": "token", "content": token}) + "\n\n"

    return StreamingResponse(iterate_in_threadpool(generate()), media_type="text/event-stream")










def _docs_available_or_403() -> dict[str, Any]:
    state = load_docs_state()
    access = docs_access_state(state)
    if not access["active"]:
        raise HTTPException(status_code=403, detail={"message": "Docs are not available right now.", "access": access})
    return public_docs_view(state)


def _docs_to_markdown(docs: dict[str, Any]) -> str:
    lines: list[str] = []
    lines.append(f"# {docs.get('title', 'Docs')}")
    if docs.get("subtitle"):
        lines.append(f"_{docs['subtitle']}_")
    if docs.get("summary"):
        lines.append(docs["summary"])

    lines.append("\n## YC-style Pitch Deck")
    for section in docs.get("pitchDeck", []):
        lines.append(f"\n### {section.get('title', 'Section')}")
        if section.get("summary"):
            lines.append(section["summary"])
        for bullet in section.get("bullets", []):
            lines.append(f"- {bullet}")

    overview = docs.get("productOverview", {})
    lines.append("\n## Product Overview")
    if overview.get("whatItDoes"):
        lines.append(f"- What it does: {overview['whatItDoes']}")
    for item in overview.get("targetUsers", []):
        lines.append(f"- Target user: {item}")
    for item in overview.get("coreUseCases", []):
        lines.append(f"- Use case: {item}")

    lines.append("\n## Team")
    team = docs.get("team", {})
    if team.get("name"):
        lines.append(f"- Team name: {team['name']}")
    for member in team.get("members", []):
        lines.append(f"- {member.get('fullName', '')} — {member.get('role', '')} — {member.get('email', '')}")

    lines.append("\n## Change log")
    for entry in docs.get("changelog", []):
        lines.append(f"- {entry.get('version', '')} ({entry.get('date', '')})")
        for change in entry.get("changes", []):
            lines.append(f"  - {change}")

    return "\n".join(lines)

@app.get("/docs")
def get_docs():
    return _docs_available_or_403()


@app.get("/docs/admin")
def get_docs_admin(decoded=Depends(verify_admin_token)):
    state = load_docs_state()
    return admin_docs_view(state, claims=decoded)


@app.put("/docs/admin")
def save_docs_admin(payload: DocsSaveRequest, decoded=Depends(verify_admin_token)):
    incoming = {k: v for k, v in (payload.docs or default_docs()).items() if k not in {"access", "admin"}}
    current = load_docs_state()
    current.update(incoming)
    current["updatedAt"] = _now_iso()
    current["updatedBy"] = decoded.get("uid") or decoded.get("email") or decoded.get("user_id")
    if payload.publish or current.get("status") == "published":
        current["status"] = "published"
        current["publishedAt"] = _now_iso()
        versions = list(current.get("versions") or [])
        versions.insert(0, {"version": int(current.get("version", 1)) + 1, "publishedAt": _now_iso(), "note": "Published from admin panel"})
        current["versions"] = versions[:10]
        current["version"] = int(current.get("version", 1)) + 1
    else:
        current["status"] = "draft"
    saved = save_docs_state(current)
    return admin_docs_view(saved, claims=decoded)


@app.patch("/docs/admin/visibility")
def update_docs_visibility(payload: DocsVisibilityRequest, decoded=Depends(verify_admin_token)):
    current = load_docs_state()
    visibility = dict(current.get("visibility") or {})
    if payload.enabled is not None:
        visibility["enabled"] = payload.enabled
    if payload.mode is not None:
        visibility["mode"] = payload.mode
    if payload.timezone is not None:
        visibility["timezone"] = payload.timezone
    if payload.startAt is not None:
        visibility["startAt"] = payload.startAt
    if payload.endAt is not None:
        visibility["endAt"] = payload.endAt
    if payload.durationHours is not None:
        visibility["durationHours"] = payload.durationHours
    current["visibility"] = visibility
    current["updatedAt"] = _now_iso()
    current["updatedBy"] = decoded.get("uid") or decoded.get("email") or decoded.get("user_id")
    saved = save_docs_state(current)
    return admin_docs_view(saved, claims=decoded)


@app.get("/docs/export/markdown")
def export_docs_markdown():
    docs = _docs_available_or_403()
    markdown = _docs_to_markdown(docs)
    return Response(
        content=markdown,
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="maya-docs.md"'},
    )
