## verify firebase login tokens so that non-authenticated users can't access the API
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Header

cred = credentials.Certificate("serviceAccount.json")
firebase_admin.initialize_app(cred)

def verify_token(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid auth header")
    token = authorization.split(" ")[1]  # Authorization: Bearer abc123token ---> ["Bearer", "abc123token"] ---> "abc123token"
    try:
        decoded = auth.verify_id_token(token)
        return decoded
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token") 
    # 401 is unauthorized, 403 is forbidden, but 401 is more appropriate for invalid tokens 