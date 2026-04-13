"""
SQL Agent — second node in the state machine.

Responsibilities:
  1. Convert the natural-language question to a safe SELECT query (Text-to-SQL)
  2. Execute the query against the configured database
  3. Summarise the result set in plain language (NL answer)

The agent uses Gemini for both the SQL generation and the answer summarisation.
It only allows SELECT statements; any attempt that generates a mutating query
is rejected before execution.
"""

import json
import logging
import os
import re

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

# ── Schema context fed to the model ─────────────────────────────────────────
_SCHEMA = """\
MySQL database for an e-commerce analytics platform.

Tables:
  users(id BIGINT PK, name VARCHAR, email VARCHAR, role_type ENUM('INDIVIDUAL','CORPORATE','ADMIN'), created_at DATETIME)
  stores(id BIGINT PK, name VARCHAR, description TEXT, user_id BIGINT FK→users, created_at DATETIME)
  categories(id BIGINT PK, name VARCHAR, parent_id BIGINT FK→categories)
  products(id BIGINT PK, name VARCHAR, description TEXT, price DECIMAL, stock INT,
           store_id BIGINT FK→stores, category_id BIGINT FK→categories, created_at DATETIME)
  orders(id BIGINT PK, user_id BIGINT FK→users, store_id BIGINT FK→stores,
         status ENUM('PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED'),
         total_amount DECIMAL, created_at DATETIME)
  order_items(id BIGINT PK, order_id BIGINT FK→orders, product_id BIGINT FK→products,
              quantity INT, unit_price DECIMAL)
  shipments(id BIGINT PK, order_id BIGINT FK→orders, tracking_number VARCHAR,
            status VARCHAR, estimated_delivery DATE, carrier VARCHAR)
  reviews(id BIGINT PK, user_id BIGINT FK→users, product_id BIGINT FK→products,
          rating INT, comment TEXT, created_at DATETIME)
  customer_profiles(id BIGINT PK, user_id BIGINT FK→users, age INT, gender VARCHAR,
                    city VARCHAR, membership_type VARCHAR, total_spent DECIMAL)
  audit_logs(id BIGINT PK, user_id BIGINT FK→users, action VARCHAR,
             entity_type VARCHAR, entity_id BIGINT, created_at DATETIME)
"""

_TEXT2SQL_PROMPT = """\
You are a MySQL expert. Convert the question into a single, safe SELECT query.

{schema}

Current user context: {user_context}

Question: {question}

Rules:
  - Output ONLY the raw SQL query — no markdown, no explanation
  - Use only SELECT (no INSERT / UPDATE / DELETE / DROP / ALTER)
  - For "my orders / my products / my profile" use the user_id from the context above
  - Limit to 100 rows: add LIMIT 100 unless an aggregate already reduces the result
  - Always alias aggregate columns meaningfully (e.g. COUNT(*) AS total_orders)
  - Do NOT expose passwords or raw API keys in the result
"""

_ANSWER_PROMPT = """\
Summarise the database result in plain, friendly language.

Original question: {question}
SQL query used: {sql}
Row count: {count}
Sample rows (up to 10): {sample}

Rules:
  - Do NOT show SQL code or column names in code blocks
  - Be concise — 1-3 sentences is ideal
  - Use the same language the user wrote in
  - If there are no rows, say so clearly
"""

# Matches any word that starts a mutating statement
_MUTATION_RE = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|REPLACE|MERGE)\b",
    re.IGNORECASE,
)


def _strip_markdown(sql: str) -> str:
    """Remove ```sql ... ``` fences if the model adds them."""
    sql = sql.strip()
    if sql.startswith("```"):
        parts = sql.split("```")
        sql = parts[1] if len(parts) >= 2 else sql
        if sql.lower().startswith("sql"):
            sql = sql[3:]
    return sql.strip()


def sql_node(state: AgentState) -> AgentState:
    question = state["question"]
    user_context: dict = state.get("user_context") or {}
    trace: list[str] = list(state.get("agent_trace") or [])
    trace.append("sql_agent: generating SQL")

    # ── 1. Build user-context string ─────────────────────────────────────────
    user_ctx_str = (
        f"user_id={user_context.get('id', 'unknown')}, "
        f"name={user_context.get('name', '')}, "
        f"role={user_context.get('role', 'INDIVIDUAL')}"
    )

    # ── 2. Generate SQL ───────────────────────────────────────────────────────
    try:
        model = genai.GenerativeModel("gemini-2.0-flash-lite")
        response = model.generate_content(
            _TEXT2SQL_PROMPT.format(
                schema=_SCHEMA,
                user_context=user_ctx_str,
                question=question,
            )
        )
        sql_query = _strip_markdown(response.text)
    except Exception as exc:
        trace.append(f"sql_agent: SQL generation failed — {exc}")
        return {**state, "error": f"SQL oluşturulamadı: {exc}", "agent_trace": trace}

    # ── 3. Safety check — block mutating statements ───────────────────────────
    if _MUTATION_RE.search(sql_query):
        trace.append("sql_agent: BLOCKED — mutating statement detected")
        return {
            **state,
            "error": "Güvenlik: sadece SELECT sorguları çalıştırılabilir.",
            "sql_query": sql_query,
            "agent_trace": trace,
        }

    trace.append(f"sql_agent: executing — {sql_query[:120]}…")

    # ── 4. Execute ────────────────────────────────────────────────────────────
    try:
        engine = create_engine(_DATABASE_URL, pool_pre_ping=True)
        with engine.connect() as conn:
            result = conn.execute(text(sql_query))
            rows = [dict(row._mapping) for row in result.fetchall()]
    except SQLAlchemyError as exc:
        trace.append(f"sql_agent: DB error — {exc}")
        return {
            **state,
            "error": str(exc),
            "sql_query": sql_query,
            "agent_trace": trace,
        }

    trace.append(f"sql_agent: query returned {len(rows)} rows")

    # ── 5. Summarise ──────────────────────────────────────────────────────────
    try:
        sample_json = json.dumps(rows[:10], default=str, ensure_ascii=False)
        ans_response = model.generate_content(
            _ANSWER_PROMPT.format(
                question=question,
                sql=sql_query,
                count=len(rows),
                sample=sample_json,
            )
        )
        answer = ans_response.text.strip()
    except Exception as exc:
        answer = f"{len(rows)} satır bulundu."
        logger.warning("Answer summarisation failed: %s", exc)

    return {
        **state,
        "sql_query": sql_query,
        "query_result": rows,
        "answer": answer,
        "agent_trace": trace,
    }
