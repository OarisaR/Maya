## llm.py
import os
from groq import Groq
from typing import Generator
from dotenv import load_dotenv
load_dotenv() 

def build_prompt(question: str, chunks: list, history: list = None, week: int = None, emergency: bool = False) -> str:
    if history is None:
        history = []
        
    context = "\n\n".join([
    f"[Source: {c['source']}, {c['source_org']}"
    f"{', Page ' + str(c['page']) if c.get('page') and c['page'] != -1 else ''}"
    f"{', week ' + str(c['week']) if isinstance(c.get('week'), int) and c['week'] > 0 else ''}"
    f"]\n{c['content']}"
    for c in chunks
])

    history_text = ""
    if history:
        history_text = "\n".join([
            f"{'User' if m['role'] == 'user' else 'Maya'}: {m['content']}"
            for m in history
        ])
        history_text = f"\nConversation so far:\n{history_text}\n"

    if week:
        trimester = "first" if week <= 12 else "second" if week <= 26 else "third"
        week_context = f"The user is currently at week {week} of pregnancy ({trimester} trimester). Tailor your response to this stage.\n"
    else:
        week_context = ""

    emergency_instruction = """
IMPORTANT: The user's message contains potential emergency symptoms.
Respond with urgent care, warm but serious tone. Tell them to contact their doctor 
or emergency services immediately. Give brief calm advice for while they wait 
(e.g. lie on left side, stay calm, have someone with them).
Remind them this is not a substitute for professional medical care.
Do NOT downplay the symptoms.
""" if emergency else ""

    return f"""You are Maya, a warm and knowledgeable maternal health AI assistant for pregnant women.
{week_context}{emergency_instruction}Answer the user's question using ONLY the context provided below.
Ensure your responses are structured format with bulletins, newlines and sections where appropriate.
Do NOT include inline citations or source references in your answer — sources will be shown separately.
If the context is insufficient, say so clearly and recommend consulting a healthcare professional.
Never make up information. Never assume medical history not mentioned by the user.
{history_text}
Context:
{context}

Question: {question}

Answer:"""

def call_llm(prompt: str) -> str:
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=1,
        max_completion_tokens=1024,
        top_p=1,
        stream=False,  # set True if you want streaming
        stop=None
    )

    return completion.choices[0].message.content

def call_llm_stream(prompt: str) -> Generator:
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=1,
        max_completion_tokens=1024,
        top_p=1,
        stream=True,
        stop=None
    )
    for chunk in completion:
        delta = chunk.choices[0].delta.content or ""
        if delta:
            yield delta

