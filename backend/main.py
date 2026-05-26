# the central controller/orchestrator of entire AI pipeline.
import os
from fastapi import FastAPI, Depends # depends is used to add authentication to specific endpoints
from fastapi.middleware.cors import CORSMiddleware # to allow cross-origin requests from frontend; decides which websites are allowed to talk to your API
from pydantic import BaseModel # to define the shape of incoming request data (question, history, etc.)
from dotenv import load_dotenv
from rag import search
from llm import build_prompt, call_llm, call_llm_stream
from auth import verify_token
from fastapi.responses import StreamingResponse
import json
from safety import check_safety

# EMERGENCY_RESPONSE = (
#     "I've noticed symptoms that may require urgent attention. "
#     "Please contact your doctor or local emergency services immediately.\n\n"
#     "While you wait: stay calm "
#     "and have someone with you if possible.\n\n"
#     "This is not a substitute for professional medical advice."
# )

load_dotenv() # loads the env variables from .env file so you can access them via os.getenv("VAR_NAME")

app = FastAPI() # creates fastapi instance, the main entry point for all API calls

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