"""
DataPulse AI — FastAPI REST interface.

This service bridges the Spring Boot backend and the LangGraph pipeline.
Spring Boot calls POST /chat/ask; this service runs the full agent pipeline
and returns the answer (+ optional Plotly chart data).

Run with:
    uvicorn api:app --host 0.0.0.0 --port 8000 --reload
"""

import logging
import os
import secrets
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from graph import build_graph, initial_state

load_dotenv()

logger = logging.getLogger(__name__)

_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:8080").split(",")
    if o.strip()
]

_INTERNAL_SECRET = os.getenv("INTERNAL_SERVICE_SECRET", "")

app = FastAPI(
    title="DataPulse AI Service",
    description="Multi-agent LangGraph pipeline: Guardrails → SQL → Error → Visualization",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_methods=["POST", "GET"],
    allow_headers=["Authorization", "Content-Type", "X-Internal-Token"],
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
    is_in_scope: bool = True
    needs_visualization: Optional[bool] = None
    iteration_count: int = 0
    agent_trace: list[str] = []


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Liveness probe used by Spring Boot before delegating requests."""
    return {"status": "ok", "service": "DataPulse AI Service"}


def _verify_internal_token(raw_request: Request) -> None:
    """Reject requests that do not carry the shared internal service secret."""
    if not _INTERNAL_SECRET:
        return
    token = raw_request.headers.get("X-Internal-Token", "")
    if not secrets.compare_digest(token, _INTERNAL_SECRET):
        logger.warning("Rejected /chat/ask call: missing or invalid X-Internal-Token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: invalid internal token",
        )


@app.post("/chat/ask", response_model=ChatResponse)
async def ask(request: ChatRequest, raw_request: Request) -> ChatResponse:
    """
    Run the multi-agent pipeline for a single question.

    Spring Boot calls this endpoint and falls back to Gemini if it returns
    a non-2xx status or times out.
    """
    _verify_internal_token(raw_request)

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
        is_in_scope=result.get("is_in_scope", True),
        needs_visualization=result.get("needs_visualization"),
        iteration_count=result.get("iteration_count", 0),
        agent_trace=result.get("agent_trace", []),
    )
