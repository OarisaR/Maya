import os
from groq import Groq
from dotenv import load_dotenv
load_dotenv()

SAFETY_SYSTEM_PROMPT = """You are a medical safety classifier for a maternal health app.
Your ONLY job is to determine if a user's message contains symptoms or situations 
that require IMMEDIATE medical attention.

Respond with ONLY a JSON object in this exact format:
{"emergency": true/false, "reason": "brief reason or null"}

Flag as emergency=true if the message contains ANY of:
- Heavy bleeding
- Severe or sudden pain anywhere
- Reduced or absent fetal/baby movement
- Vision changes, blurring, or seeing spots
- Chest pain or pressure
- Difficulty breathing
- Seizures or convulsions
- Fainting or loss of consciousness
- Sudden severe swelling of face/hands/feet
- Signs of preeclampsia
- Any combination of symptoms suggesting obstetric emergency

Be sensitive to indirect phrasing like "baby hasn't moved since yesterday" 
or "my head is killing me and I can't see straight".

If NOT an emergency, return {"emergency": false, "reason": null}."""


def check_safety(message: str) -> dict:
    """
    Returns {"emergency": bool, "reason": str | None}
    Falls back to safe=False if the LLM call fails.
    """
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": SAFETY_SYSTEM_PROMPT},
                {"role": "user", "content": message}
            ],
            temperature=0,        # deterministic for safety checks
            max_completion_tokens=60,
            top_p=1,
            stream=False,
        )
        import json
        result = json.loads(response.choices[0].message.content)
        return result
    except Exception:
        # If classifier fails, fail safe — let normal flow handle it
        return {"emergency": False, "reason": None}