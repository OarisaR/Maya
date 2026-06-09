from dotenv import load_dotenv
load_dotenv()
# the central controller/orchestrator of entire AI pipeline.
import os
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware # to allow cross-origin requests from frontend; decides which websites are allowed to talk to your API
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel # to define the shape of incoming request data (question, history, etc.)
from dotenv import load_dotenv
from rag import search
from llm import build_prompt, call_llm, call_llm_stream
from auth import verify_token, verify_admin_token
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


class EmergencyHospitalRequest(BaseModel):
    lat: float | None = None
    lng: float | None = None
    region: str | None = None
    radius_km: float = 15.0
    limit: int = 3


class Hospital(BaseModel):
    name: str
    address: str
    contact: str
    ambulance: str
    lat: float
    lng: float
    region: str | None = None


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


REGION_MAPPING = {
    "dhaka": "Dhaka Division",
    "uttara": "Dhaka Division",
    "gazipur": "Dhaka Division",
    "chittagong": "Chattogram Division",
    "chattogram": "Chattogram Division",
    "sylhet": "Sylhet Division",
    "rajshahi": "Rajshahi Division",
    "khulna": "Khulna Division",
    "barishal": "Barishal Division",
    "barisal": "Barishal Division",
    "rangpur": "Rangpur Division",
    "mymensingh": "Mymensingh Division",
}

HOSPITAL_DATABASE: list[Hospital] = [
    Hospital(name="Dhaka Medical College Hospital", address="Shahbagh, Dhaka", contact="+88 02 9665110", ambulance="+88 02 9665110", lat=23.7357, lng=90.3939, region="Dhaka Division"),
    Hospital(name="Square Hospital", address="Panthapath, Dhaka", contact="+88 02 9115231", ambulance="+88 02 9115231", lat=23.7516, lng=90.3848, region="Dhaka Division"),
    Hospital(name="Apollo Hospitals Dhaka", address="Bashundhara, Dhaka", contact="+88 09666778855", ambulance="+88 09666778855", lat=23.8088, lng=90.4245, region="Dhaka Division"),
    Hospital(name="Chittagong Medical College Hospital", address="Pahartali, Chattogram", contact="+88 031 2517614", ambulance="+88 031 2517614", lat=22.3475, lng=91.8116, region="Chattogram Division"),
    Hospital(name="Parkview Hospital", address="Panchlaish, Chattogram", contact="+88 031 2877871", ambulance="+88 031 2877871", lat=22.3402, lng=91.8150, region="Chattogram Division"),
    Hospital(name="Sylhet MAG Osmani Medical College Hospital", address="Mirboxtula, Sylhet", contact="+88 0821 722740", ambulance="+88 0821 722740", lat=24.8949, lng=91.8687, region="Sylhet Division"),
    Hospital(name="Rajshahi Medical College Hospital", address="Shah Makhdum Avenue, Rajshahi", contact="+88 0721 776236", ambulance="+88 0721 776236", lat=24.3801, lng=88.6046, region="Rajshahi Division"),
    Hospital(name="Khulna Medical College Hospital", address="Khulna", contact="+88 041 731110", ambulance="+88 041 731110", lat=22.8342, lng=89.5636, region="Khulna Division"),
    Hospital(name="Rangpur Medical College Hospital", address="Rangpur", contact="+88 0521 61025", ambulance="+88 0521 61025", lat=25.7439, lng=89.2752, region="Rangpur Division"),
    Hospital(name="Mymensingh Medical College Hospital", address="Mymensingh", contact="+88 091 666391", ambulance="+88 091 666391", lat=24.7471, lng=90.4203, region="Mymensingh Division"),
]

def _normalize_region(text: str) -> str | None:
    lookup = text.lower().strip()
    for key, region in REGION_MAPPING.items():
        if key in lookup:
            return region
    return None

def _distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    from math import radians, cos, sin, atan2, sqrt
    dlat = radians(lat2 - lat1)
    dlon = radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 6371 * 2 * atan2(sqrt(a), sqrt(1 - a))

def _find_nearest_hospitals(lat: float, lng: float, radius_km: float, limit: int) -> list[Hospital]:
    nearby = [
        (h, _distance_km(lat, lng, h.lat, h.lng))
        for h in HOSPITAL_DATABASE
    ]
    filtered = [h for h, d in nearby if d <= radius_km]
    filtered.sort(key=lambda hospital: _distance_km(lat, lng, hospital.lat, hospital.lng))
    return filtered[:limit]

def _find_hospitals_by_region(region: str, limit: int) -> list[Hospital]:
    normalized = region.lower()
    matches = [h for h in HOSPITAL_DATABASE if h.region and normalized in h.region.lower()]
    if matches:
        return matches[:limit]
    return []

def _find_hospitals_by_text(text: str, limit: int) -> list[Hospital]:
    normalized = text.lower()
    matches = [
        h for h in HOSPITAL_DATABASE
        if normalized in h.name.lower()
        or normalized in h.address.lower()
        or (h.region and normalized in h.region.lower())
    ]
    return matches[:limit]



@app.get("/")
def root():
    return { "status": "Maya backend running" }


@app.post("/query") #Frontend sends questions here.
async def query(req: QueryRequest):
    safety = check_safety(req.question)
    # 1. search pinecone
    chunks = search(req.question, req.top_k)

    if not chunks:
        return {
            "answer": "I couldn't find relevant information for your question. Please consult your healthcare provider.",
            "sources": []
        }

    # 2. build prompt
    prompt = build_prompt(req.question, chunks, req.history, week=req.week, emergency=safety["emergency"])
    answer = call_llm(prompt)

    # 3. call LLM
    answer = call_llm(prompt)

    return {
        "answer": answer,
        "sources": chunks,
        # "user_uid": user["uid"]  # optional, useful for logging later
    }
@app.post("/query/stream") # new streaming endpoint that sends partial LLM tokens as they are generated, for a more dynamic frontend experience
async def query_stream(req: QueryRequest):
    safety = check_safety(req.question)
    is_emergency = safety["emergency"]

    chunks = search(req.question, req.top_k)

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

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/emergency/hospitals")
async def emergency_hospitals(req: EmergencyHospitalRequest):
    hospitals: list[Hospital] = []
    if req.region:
        region = _normalize_region(req.region) or req.region
        hospitals = _find_hospitals_by_region(region, req.limit)
        if not hospitals:
            hospitals = _find_hospitals_by_text(req.region, req.limit)
    if not hospitals and req.lat is not None and req.lng is not None:
        hospitals = _find_nearest_hospitals(req.lat, req.lng, req.radius_km, req.limit)
    if not hospitals:
        hospitals = HOSPITAL_DATABASE[:req.limit]
    return {"hospitals": hospitals}


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