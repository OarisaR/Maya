import json
import os
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Header

_ADMIN_EMAILS = {email.strip().lower() for email in os.getenv("DOCS_ADMIN_EMAILS", "").split(",") if email.strip()}
_ADMIN_UIDS = {uid.strip() for uid in os.getenv("DOCS_ADMIN_UIDS", "").split(",") if uid.strip()}

cred_json = os.getenv("GOOGLE_CREDENTIALS")
if cred_json:
    cred_dict = json.loads(cred_json)
    cred = credentials.Certificate(cred_dict)
else:
    cred = credentials.Certificate("serviceAccount.json")

firebase_admin.initialize_app(cred)

def verify_token(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid auth header")
    token = authorization.split(" ")[1]
    try:
        decoded = auth.verify_id_token(token)
        return decoded
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def verify_admin_token(authorization: str = Header(...)):
    decoded = verify_token(authorization)
    claims = decoded.get("claims") if isinstance(decoded.get("claims"), dict) else {}
    role = str(decoded.get("role") or claims.get("role") or "").lower()
    email = str(decoded.get("email") or decoded.get("user_email") or "").lower()
    uid = str(decoded.get("uid") or decoded.get("user_id") or "")

    is_admin = any(
        [
            decoded.get("admin") is True,
            decoded.get("superAdmin") is True,
            decoded.get("super_admin") is True,
            claims.get("admin") is True,
            claims.get("superAdmin") is True,
            claims.get("super_admin") is True,
            role in {"admin", "superadmin", "super-admin"},
            email in _ADMIN_EMAILS if email else False,
            uid in _ADMIN_UIDS if uid else False,
        ]
    )

    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    return decoded