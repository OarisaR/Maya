from __future__ import annotations

import json
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent
STATE_FILE = BASE_DIR / "docs_state.json"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _parse_dt(value: Any) -> datetime | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        raw = str(value).strip().replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(raw)
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _docs_window(year: int | None = None) -> dict[str, str]:
    year = year or _utcnow().year
    start = datetime(year, 6, 10, 0, 0, tzinfo=timezone.utc)
    end = datetime(year, 6, 14, 23, 59, tzinfo=timezone.utc)
    return {"startAt": _iso(start), "endAt": _iso(end)}


def default_docs() -> dict[str, Any]:
    window = _docs_window()
    now = _iso(_utcnow())
    return {
        "id": "maya-docs",
        "slug": "docs",
        "title": "Maya Docs",
        "subtitle": "YC-style pitch deck + living technical documentation",
        "tagline": "A controlled, live documentation system for judges, investors, and the team.",
        "summary": "A public docs experience that explains the product in two minutes, the system in ten, and the governance in one glance.",
        "status": "published",
        "version": 1,
        "publishedAt": now,
        "updatedAt": now,
        "updatedBy": None,
        "visibility": {
            "enabled": True,
            "mode": "window",
            "timezone": "UTC",
            "startAt": window["startAt"],
            "endAt": window["endAt"],
            "durationHours": None,
        },
        "team": {
            "name": "Maya Core Team",
            "members": [
                {"fullName": "Ayesha Rahman", "role": "Product & Strategy", "email": "ayesha@example.com", "photoUrl": ""},
                {"fullName": "Samiul Hasan", "role": "Full-Stack Engineering", "email": "samiul@example.com", "photoUrl": ""},
                {"fullName": "Nusrat Jahan", "role": "AI / Retrieval", "email": "nusrat@example.com", "photoUrl": ""},
                {"fullName": "Tanvir Ahmed", "role": "Design Systems", "email": "tanvir@example.com", "photoUrl": ""},
            ],
        },
        "pitchDeck": [
            {
                "id": "problem",
                "title": "Problem",
                "eyebrow": "YC pitch deck",
                "summary": "Pregnant people still bounce between fragmented guidance, emergency uncertainty, and weak digital continuity.",
                "bullets": [
                    "Support is often generic, not stage-aware, and not emotionally calm.",
                    "Emergency symptoms are easy to miss when guidance is buried in long content.",
                    "Families and clinicians need a shared, understandable system view.",
                ],
            },
            {
                "id": "solution",
                "title": "Solution",
                "summary": "Maya combines maternal chat support, tracker context, safety escalation, and a live docs layer that explains the whole product.",
                "bullets": [
                    "Fast, compassionate answers tuned to pregnancy week and user context.",
                    "A tracker that keeps the journey visible and understandable.",
                    "A docs module that acts as pitch deck, whitepaper, and live dashboard.",
                ],
            },
            {
                "id": "why-now",
                "title": "Why Now",
                "summary": "AI makes continuous support affordable, while healthcare users expect clearer digital transparency and scheduled access windows.",
                "bullets": [
                    "LLMs and retrieval can turn static care guidance into on-demand support.",
                    "Low-friction publishing helps teams present to judges and investors on a schedule.",
                    "Safety, privacy, and explainability are now product differentiators.",
                ],
            },
            {
                "id": "product-demo",
                "title": "Product Demo",
                "summary": "The app pairs chat, tracker, emergency support, and documentation so a user can understand the product quickly.",
                "bullets": [
                    "Chat for guided maternal Q&A.",
                    "Tracker for pregnancy-week context.",
                    "Emergency page for fast escalation.",
                ],
            },
            {
                "id": "market",
                "title": "Market Opportunity",
                "summary": "Maternal health support spans consumers, clinics, and public-health programs that all need better digital continuity.",
                "bullets": [
                    "Direct-to-consumer mothers and caregivers.",
                    "Clinics and maternal programs that need better education surfaces.",
                    "Institutional preview and judging workflows that require controlled access.",
                ],
            },
            {
                "id": "business-model",
                "title": "Business Model",
                "summary": "The product can grow through consumer access, clinical partnerships, and hosted showcase / evaluation deployments.",
                "bullets": [
                    "Freemium support for end users.",
                    "B2B / partner licensing for organizations.",
                    "Scheduled showcase windows for demo, judging, and investor review.",
                ],
            },
            {
                "id": "traction",
                "title": "Traction",
                "summary": "The product already has a working chat experience, tracker, emergency view, and a structured frontend / backend architecture.",
                "bullets": [
                    "Authenticated chat flow with streaming responses.",
                    "Frontend state persisted per user.",
                    "Deployment-ready FastAPI backend and SSR frontend shell.",
                ],
            },
            {
                "id": "competition",
                "title": "Competition",
                "summary": "Generic health chatbots, static pregnancy apps, and docs tools each cover only one layer of the experience.",
                "bullets": [
                    "Most competitors stop at chat or content, not both.",
                    "Few systems offer controlled publishing windows for public review.",
                    "Maya unifies product narrative, engineering detail, and live state.",
                ],
            },
            {
                "id": "advantage",
                "title": "Unique Advantage",
                "summary": "Maya pairs maternal care UX with a living docs layer that stays consistent with product state.",
                "bullets": [
                    "Docs reflect current access rules, live sections, and publish status.",
                    "The team can turn the showcase on or off instantly.",
                    "The same page works as a pitch deck, technical whitepaper, and system dashboard.",
                ],
            },
            {
                "id": "go-to-market",
                "title": "Go-To-Market",
                "summary": "Start with controlled showcase periods, then expand into partner demos and broader user onboarding.",
                "bullets": [
                    "Use the June 10-14 judging window by default.",
                    "Share a single trusted /docs link for reviews.",
                    "Promote the live app once the pitch content is aligned with product state.",
                ],
            },
            {
                "id": "team",
                "title": "Team",
                "summary": "The team section is built into the docs deck so reviewers can verify the people behind the product.",
                "bullets": [
                    "Uniform member cards with fallback avatars.",
                    "Name, role, and email visible in a clean grid.",
                    "Admin-editable for showcase accuracy.",
                ],
            },
            {
                "id": "vision",
                "title": "Vision",
                "summary": "Maya becomes the trusted maternal companion and the clearest live product narrative for every audience.",
                "bullets": [
                    "A calmer, more explainable maternal care experience.",
                    "A reusable docs platform for future launches.",
                    "A global standard for controlled, live documentation.",
                ],
            },
        ],
        "productOverview": {
            "whatItDoes": "Maya helps pregnant users ask questions, understand symptoms, follow their pregnancy week by week, and escalate urgent concerns.",
            "targetUsers": ["Pregnant users", "Partners / caregivers", "Clinicians / reviewers", "Judges / investors"],
            "coreUseCases": [
                "Pregnancy Q&A and emotional reassurance",
                "Week-by-week progress tracking",
                "Emergency awareness and triage guidance",
                "Public showcase and documentation review",
            ],
        },
        "featureMatrix": [
            {"name": "Chat support", "status": "current", "source": "Live app", "notes": "Streaming maternal Q&A with safety awareness."},
            {"name": "Pregnancy tracker", "status": "current", "source": "Live app", "notes": "Week-by-week milestone experience."},
            {"name": "Emergency page", "status": "current", "source": "Live app", "notes": "Fast access to red-flag symptoms and urgent advice."},
            {"name": "Docs publishing controls", "status": "current", "source": "Docs module", "notes": "Visibility toggle and scheduled access windows."},
            {"name": "WYSIWYG editing", "status": "upcoming", "source": "Admin panel", "notes": "Section-based editing with drag/drop reorder."},
            {"name": "PDF export", "status": "upcoming", "source": "Docs module", "notes": "Browser print-to-PDF flow and shareable exports."},
            {"name": "Plugin sections", "status": "planned", "source": "Docs module", "notes": "Modular sections for future product areas."},
        ],
        "architecture": {
            "mermaid": "flowchart LR\n  UI[Frontend UI] --> API[FastAPI API]\n  API --> RAG[RAG / Safety / LLM]\n  API --> DB[(Realtime State / Docs File)]\n  API --> DOCS[Docs Renderer]\n  DOCS --> UI",
        },
        "dataFlow": {
            "mermaid": "flowchart LR\n  Input[User / Admin Input] --> Process[Validation + RBAC + Scheduling]\n  Process --> AI[LLM / Retrieval]\n  AI --> Output[Answer / Docs Payload]\n  Output --> Feedback[Usage + Version History]",
        },
        "technologyStack": {
            "frontend": ["React", "TanStack Router", "TanStack Query", "Tailwind CSS", "Firebase Auth / RTDB"],
            "backend": ["FastAPI", "Pydantic", "Firebase Admin", "Streaming SSE"],
            "data": ["Firebase Realtime Database patterns", "File-backed docs state"],
            "ai": ["RAG", "Safety checks", "Streaming LLM responses"],
            "infra": ["Vite / SSR shell", "Docker", "Cloud deployment-ready"],
        },
        "apiDocumentation": [
            {"method": "GET", "path": "/docs", "auth": "public", "description": "Public docs payload if visibility window is open.", "status": "live"},
            {"method": "GET", "path": "/docs/admin", "auth": "admin", "description": "Full docs payload for editing and publishing.", "status": "live"},
            {"method": "PUT", "path": "/docs/admin", "auth": "admin", "description": "Save the full docs draft or publish snapshot.", "status": "live"},
            {"method": "PATCH", "path": "/docs/admin/visibility", "auth": "admin", "description": "Toggle visibility or reschedule availability.", "status": "live"},
            {"method": "GET", "path": "/docs/export/markdown", "auth": "public when open", "description": "Download the docs as Markdown.", "status": "live"},
        ],
        "dataLayer": {
            "sources": ["Feature module", "Users", "API routes", "Admin events"],
            "storage": ["Docs state file", "Firebase user profile patterns"],
            "privacy": ["Public docs only show approved content", "Admin auth required for editing", "Visibility windows can hide content completely"],
        },
        "aiLayer": {
            "models": ["RAG retrieval", "Streaming generation", "Safety classifier"],
            "retrieval": ["Questions to chunks", "Context-aware prompt building", "Citations / source payloads"],
            "personalization": ["Pregnancy week context", "Emergency-aware tone", "User history"],
            "explainability": ["Source snippets", "Transparent docs sections", "Version history"],
        },
        "roadmap": {
            "shortTerm": ["Section editor polish", "Better markdown export", "Public read-only share links"],
            "midTerm": ["Plugin-based section registry", "Version compare", "Reviewer annotations"],
            "longTerm": ["Multi-language docs publishing", "GraphRAG system map", "Investor packet automation"],
        },
        "performance": {
            "loadExpectations": ["Fast initial render", "Lazy-loaded admin controls", "Static section navigation"],
            "optimization": ["Cache docs payload", "Avoid repeated auth lookups", "Render heavy sections on demand"],
        },
        "security": {
            "auth": ["Firebase token verification", "Admin custom claims / allow-list fallback"],
            "rbac": ["Public reader vs admin editor", "Visibility windows enforced on the server"],
            "dataProtection": ["No public editing", "Sanitized payload updates", "Private draft snapshots"],
        },
        "analytics": {
            "kpis": ["Docs visits", "Section clicks", "Admin publish actions", "Export downloads"],
            "metrics": ["Time to understand product", "Engagement with team section", "Window compliance"],
        },
        "extensibility": {
            "modules": ["Pitch deck", "Technical whitepaper", "System dashboard", "Team showcase"],
            "pluginSupport": ["Section registry", "Custom cards", "External data hooks"],
        },
        "changelog": [
            {"version": "1.0.0", "date": now, "changes": ["Initial live docs deck", "Admin visibility scheduling", "Team showcase and exports"]},
        ],
        "live": {
            "lastSyncedAt": now,
            "recentEvents": [
                "Docs state loaded from backend store",
                "Visibility checks computed on request",
                "Admin editor can publish a new snapshot",
            ],
        },
        "versions": [
            {"version": 1, "publishedAt": now, "note": "Initial seed"},
        ],
    }


def load_docs_state() -> dict[str, Any]:
    if STATE_FILE.exists():
        try:
            with STATE_FILE.open("r", encoding="utf-8") as f:
                data = json.load(f)
                return _normalize_docs_state(data)
        except Exception:
            pass
    state = default_docs()
    save_docs_state(state)
    return state


def save_docs_state(data: dict[str, Any]) -> dict[str, Any]:
    normalized = _normalize_docs_state(data)
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with STATE_FILE.open("w", encoding="utf-8") as f:
        json.dump(normalized, f, indent=2, ensure_ascii=False)
    return normalized


def _normalize_docs_state(data: dict[str, Any]) -> dict[str, Any]:
    state = deepcopy(default_docs())
    state.update({k: v for k, v in data.items() if k not in {"visibility", "team", "live"}})

    visibility = {**state["visibility"], **(data.get("visibility") or {})}
    visibility["enabled"] = bool(visibility.get("enabled", True))
    visibility["mode"] = visibility.get("mode") or "window"
    visibility["timezone"] = visibility.get("timezone") or "UTC"
    if visibility.get("mode") == "duration":
        visibility["durationHours"] = int(visibility.get("durationHours") or 0) or None
    state["visibility"] = visibility

    team = {**state["team"], **(data.get("team") or {})}
    team["name"] = team.get("name") or ""
    team["members"] = list((data.get("team") or {}).get("members", team.get("members", [])))
    state["team"] = team

    live = {**state.get("live", {}), **(data.get("live") or {})}
    live["lastSyncedAt"] = live.get("lastSyncedAt") or _iso(_utcnow())
    live["recentEvents"] = list(live.get("recentEvents") or [])
    state["live"] = live

    state["pitchDeck"] = list(data.get("pitchDeck", state["pitchDeck"]))
    state["featureMatrix"] = list(data.get("featureMatrix", state["featureMatrix"]))
    state["apiDocumentation"] = list(data.get("apiDocumentation", state["apiDocumentation"]))
    state["changelog"] = list(data.get("changelog", state["changelog"]))
    state["versions"] = list(data.get("versions", state["versions"]))
    state["updatedAt"] = data.get("updatedAt") or _iso(_utcnow())
    state["status"] = data.get("status") or state["status"]
    state["publishedAt"] = data.get("publishedAt") or state.get("publishedAt")
    state["version"] = int(data.get("version", state.get("version", 1)))
    state["updatedBy"] = data.get("updatedBy")
    return state


def docs_access_state(state: dict[str, Any], *, now: datetime | None = None) -> dict[str, Any]:
    now = now or _utcnow()
    visibility = state.get("visibility", {})
    start = _parse_dt(visibility.get("startAt"))
    end = _parse_dt(visibility.get("endAt"))
    enabled = bool(visibility.get("enabled", True))

    active = enabled
    if start and now < start:
        active = False
    if end and now > end:
        active = False

    if visibility.get("mode") == "duration" and start and visibility.get("durationHours"):
        duration_end = start + timedelta(hours=int(visibility.get("durationHours") or 0))
        if now > duration_end:
            active = False
        end = duration_end if end is None else min(end, duration_end)

    return {
        "enabled": enabled,
        "active": active,
        "mode": visibility.get("mode", "window"),
        "timezone": visibility.get("timezone", "UTC"),
        "startAt": _iso(start),
        "endAt": _iso(end),
        "now": _iso(now),
        "durationHours": visibility.get("durationHours"),
    }


def is_docs_public(state: dict[str, Any], *, now: datetime | None = None) -> bool:
    return docs_access_state(state, now=now)["active"]


def public_docs_view(state: dict[str, Any]) -> dict[str, Any]:
    access = docs_access_state(state)
    public = deepcopy(state)
    public["access"] = access
    public["live"] = {
        **public.get("live", {}),
        "publicStats": {
            "pitchSections": len(public.get("pitchDeck", [])),
            "features": len(public.get("featureMatrix", [])),
            "teamMembers": len(public.get("team", {}).get("members", [])),
            "apiEndpoints": len(public.get("apiDocumentation", [])),
        },
    }
    return public


def admin_docs_view(state: dict[str, Any], *, claims: dict[str, Any] | None = None) -> dict[str, Any]:
    docs = deepcopy(state)
    docs["access"] = docs_access_state(state)
    docs["admin"] = {
        "claims": claims or {},
        "editable": True,
    }
    return docs
