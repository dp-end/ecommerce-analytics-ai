"""
Error Agent — handles SQL execution failures produced by the SQL Agent.

Responsibilities:
  1. Classify the error type (syntax / connection / permission / quota / unknown)
  2. If fixable (syntax / schema error): attempt automatic SQL repair and log
     the corrected SQL back into state so the graph can retry via sql_node
  3. If retries are exhausted OR error is not fixable: set a user-friendly answer
     and leave state["error"] set so the graph routes to END

The retry loop is controlled by the graph (graph.py):
  _route_error: if state["error"] is still set AND iteration_count < MAX_RETRIES
                → route back to sql_node
                else → END

This node's job is NOT to re-execute the SQL itself — it prepares the state
(primarily clears state["error"] on repair success so the graph re-enters sql_node)
and provides diagnostic context that sql_node's next attempt can use via prev_error.
"""

import logging

from agents.gemini_client import get_model
from agents.state import AgentState

logger = logging.getLogger(__name__)

MAX_RETRIES = 3  # must match graph.py

_DIAGNOSE_PROMPT = """\
A MySQL SELECT query failed. Diagnose the error and explain briefly what is wrong.
Do NOT output a fixed query — just a 1-2 sentence diagnosis in plain language.

Failed query:
{sql}

Error message:
{error}

Original question:
{question}
"""

# ── Error-type classifier ─────────────────────────────────────────────────────

def _classify_error(error: str) -> str:
    err_lower = error.lower()
    if any(k in err_lower for k in (
        "syntax", "column", "table", "unknown column",
        "doesn't exist", "no such", "ambiguous",
    )):
        return "sql_syntax"
    if any(k in err_lower for k in ("access denied", "permission", "forbidden")):
        return "permission"
    if any(k in err_lower for k in (
        "connection", "connect", "host", "refused", "timed out",
    )):
        return "connection"
    if any(k in err_lower for k in ("quota", "rate", "429", "resource_exhausted")):
        return "quota"
    return "unknown"


_FRIENDLY: dict[str, str] = {
    "permission": (
        "Veritabanına erişim izniniz bulunmuyor. "
        "Lütfen yönetici ile iletişime geçin."
    ),
    "connection": (
        "Veritabanı bağlantısı kurulamadı. "
        "Lütfen daha sonra tekrar deneyin."
    ),
    "quota": (
        "AI servisinin istek kotası aşıldı. "
        "Birkaç dakika bekleyip tekrar deneyin."
    ),
    "unknown": (
        "Sorunuzu işlerken beklenmedik bir hata oluştu. "
        "Lütfen soruyu farklı şekilde ifade ederek tekrar deneyin."
    ),
}


def error_node(state: AgentState) -> AgentState:
    error: str = state.get("error") or "Bilinmeyen hata"
    sql_query: str = state.get("sql_query") or ""
    question: str = state["question"]
    iteration: int = state.get("iteration_count", 0)
    trace: list[str] = list(state.get("agent_trace") or [])

    error_type = _classify_error(error)
    trace.append(
        f"error_agent: type={error_type}, iteration={iteration}/{MAX_RETRIES}"
    )

    # ── If retries remain and error is fixable, let graph retry sql_node ─────
    if error_type == "sql_syntax" and iteration < MAX_RETRIES:
        # Get a brief diagnosis to give sql_node better context next attempt
        diagnosis = error  # fallback = raw error
        try:
            model = get_model()
            resp = model.generate_content(
                _DIAGNOSE_PROMPT.format(
                    sql=sql_query, error=error, question=question
                )
            )
            diagnosis = resp.text.strip()
        except Exception as exc:
            logger.warning("Error-agent diagnosis LLM failed: %s", exc)

        trace.append(
            f"error_agent: fixable SQL error — passing diagnosis to sql_node for retry"
        )
        # Keep state["error"] set so graph routes back to sql_node.
        # sql_node reads state["error"] as prev_error for its next attempt.
        return {
            **state,
            "error": diagnosis,          # enriched error message for sql_node
            "agent_trace": trace,
        }

    # ── Retries exhausted or non-fixable error — return friendly message ──────
    friendly = _FRIENDLY.get(error_type, _FRIENDLY["unknown"])
    if iteration >= MAX_RETRIES:
        friendly = (
            f"{MAX_RETRIES} deneme sonrasında sorgunuzu çalıştıramadım. "
            "Lütfen soruyu farklı bir şekilde ifade ederek tekrar deneyin."
        )

    trace.append("error_agent: returning friendly error message (no more retries)")
    return {
        **state,
        "answer": friendly,
        "final_answer": friendly,
        "error": None,          # clear so graph routes to END cleanly
        "agent_trace": trace,
    }
