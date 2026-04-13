"""
Error Agent — handles failures produced by the SQL Agent.

Responsibilities:
  1. Classify the error (SQL syntax, connection, permission, quota, unknown)
  2. Attempt automatic SQL repair for syntax / schema errors
  3. Return a user-friendly Turkish/multilingual answer when recovery is impossible
"""

import json
import logging
import os

import google.generativeai as genai
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

from agents.state import AgentState

logger = logging.getLogger(__name__)

genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))

_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:1234@localhost:3306/ecommerce_db",
)

_REPAIR_PROMPT = """\
A MySQL SELECT query failed. Rewrite it to fix the error, then return ONLY the corrected SQL — no explanation, no markdown.

Original query:
{sql}

Error message:
{error}

Original question the query was meant to answer:
{question}
"""

_ANSWER_PROMPT = """\
A database query returned the following rows. Answer the original question briefly and in plain language.
Do NOT show SQL code.

Question: {question}
Row count: {count}
Sample rows: {sample}
"""

# ── Error-type classifier ─────────────────────────────────────────────────────
def _classify_error(error: str) -> str:
    err_lower = error.lower()
    if any(k in err_lower for k in ("syntax", "column", "table", "unknown column", "doesn't exist")):
        return "sql_syntax"
    if any(k in err_lower for k in ("access denied", "permission")):
        return "permission"
    if any(k in err_lower for k in ("connection", "connect", "host", "refused")):
        return "connection"
    if any(k in err_lower for k in ("quota", "rate", "429", "resource_exhausted")):
        return "quota"
    return "unknown"


_FRIENDLY: dict[str, str] = {
    "permission": "Veritabanına erişim izniniz bulunmuyor. Lütfen yönetici ile iletişime geçin.",
    "connection": "Veritabanı bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.",
    "quota":      "AI servisinin istek kotası aşıldı. Birkaç dakika bekleyip tekrar deneyin.",
    "unknown":    "Sorunuzu işlerken beklenmedik bir hata oluştu. Lütfen soruyu farklı şekilde ifade ederek tekrar deneyin.",
}


def error_node(state: AgentState) -> AgentState:
    error: str = state.get("error") or "Bilinmeyen hata"
    sql_query: str = state.get("sql_query") or ""
    question: str = state["question"]
    trace: list[str] = list(state.get("agent_trace") or [])
    trace.append(f"error_agent: handling error type={_classify_error(error)}")

    error_type = _classify_error(error)

    # ── Attempt SQL repair for fixable errors ─────────────────────────────────
    if error_type == "sql_syntax" and sql_query:
        try:
            model = genai.GenerativeModel("gemini-2.0-flash-lite")
            repair_response = model.generate_content(
                _REPAIR_PROMPT.format(sql=sql_query, error=error, question=question)
            )
            fixed_sql = repair_response.text.strip()
            if fixed_sql.startswith("```"):
                parts = fixed_sql.split("```")
                fixed_sql = parts[1][3:] if parts[1].lower().startswith("sql") else parts[1]
            fixed_sql = fixed_sql.strip()

            engine = create_engine(_DATABASE_URL, pool_pre_ping=True)
            with engine.connect() as conn:
                result = conn.execute(text(fixed_sql))
                rows = [dict(row._mapping) for row in result.fetchall()]

            # Generate friendly answer
            sample_json = json.dumps(rows[:10], default=str, ensure_ascii=False)
            ans = model.generate_content(
                _ANSWER_PROMPT.format(
                    question=question, count=len(rows), sample=sample_json
                )
            )

            trace.append("error_agent: SQL repair succeeded")
            return {
                **state,
                "sql_query": fixed_sql,
                "query_result": rows,
                "answer": ans.text.strip(),
                "error": None,
                "agent_trace": trace,
            }

        except (SQLAlchemyError, Exception) as exc:
            trace.append(f"error_agent: repair attempt failed — {exc}")

    # ── Return friendly message ───────────────────────────────────────────────
    friendly = _FRIENDLY.get(error_type, _FRIENDLY["unknown"])
    trace.append("error_agent: returning friendly error message")
    return {**state, "answer": friendly, "agent_trace": trace}
