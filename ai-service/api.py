"""
DataPulse AI — FastAPI REST interface.

This service bridges the Spring Boot backend and the LangGraph pipeline.
Spring Boot calls POST /chat/ask; this service runs the full agent pipeline
and returns the answer (+ optional Plotly chart data).

Run with:
    uvicorn api:app --host 0.0.0.0 --port 8000 --reload
"""

import os
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from graph import build_graph, initial_state

load_dotenv()

app = FastAPI(
    title="DataPulse AI Service",
    description="Multi-agent LangGraph pipeline: Guardrails → SQL → Error → Visualization",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compile once at startup — graph is stateless between calls
_graph = build_graph()


# ── Request / Response models ─────────────────────────────────────────────────

class UserContext(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = "INDIVIDUAL"


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    user_context: Optional[UserContext] = None


class ChatResponse(BaseModel):
    answer: str
    sql_query: Optional[str] = None
    visualization_data: Optional[dict[str, Any]] = None
    is_safe: bool = True
    agent_trace: list[str] = []


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Liveness probe used by Spring Boot before delegating requests."""
    return {"status": "ok", "service": "DataPulse AI Service"}


@app.post("/chat/ask", response_model=ChatResponse)
async def ask(request: ChatRequest) -> ChatResponse:
    """
    Run the multi-agent pipeline for a single question.

    Spring Boot calls this endpoint and falls back to Gemini if it returns
    a non-2xx status or times out.
    """
    ctx_dict: Optional[dict] = (
        request.user_context.model_dump() if request.user_context else None
    )

    state = initial_state(question=request.question, user_context=ctx_dict)
    result = await _graph.ainvoke(state)

    return ChatResponse(
        answer=result.get("answer") or "",
        sql_query=result.get("sql_query"),
        visualization_data=result.get("visualization_data"),
        is_safe=result.get("is_safe", True),
        agent_trace=result.get("agent_trace", []),
    )
