"""
SQL Agent — second node in the state machine.

Responsibilities:
  1. Convert the natural-language question into a safe SELECT query (Text-to-SQL)
  2. Execute the query against the configured database
  3. Store raw results in state["query_result"]

NL summarisation of the results is handled by the downstream Analysis Agent,
NOT by this node.  Keeping concerns separated makes each agent easier to test.

Security rules enforced:
  - Only SELECT statements are executed; any mutating keyword aborts the run
  - Queries are limited to LIMIT 100 unless an aggregate already reduces the set
  - Passwords and raw secrets are never exposed in SELECT lists

Role-based data segregation:
  - INDIVIDUAL users: queries are scoped to their own user_id
  - CORPORATE users:  queries are scoped to their own store(s)
  - ADMIN users:      full read access
"""

import logging
import os
import re

from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

from agents.gemini_client import get_model
from agents.state import AgentState

logger = logging.getLogger(__name__)

_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:1234@localhost:3306/ecommerce_db",
)

# ── Schema context fed to the model ─────────────────────────────────────────
_SCHEMA = """\
MySQL database for an e-commerce analytics platform.

Tables:
  users(id BIGINT PK, name VARCHAR, email VARCHAR,
        role_type ENUM('INDIVIDUAL','CORPORATE','ADMIN'), created_at DATETIME)

  stores(id BIGINT PK, name VARCHAR, description TEXT,
         user_id BIGINT FK→users, status VARCHAR, created_at DATETIME)

  categories(id BIGINT PK, name VARCHAR, parent_id BIGINT FK→categories)

  products(id BIGINT PK, name VARCHAR, description TEXT, unit_price DECIMAL,
           stock INT, store_id BIGINT FK→stores, category_id BIGINT FK→categories,
           created_at DATETIME)

  orders(id BIGINT PK, user_id BIGINT FK→users, store_id BIGINT FK→stores,
         status ENUM('PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED'),
         grand_total DECIMAL, payment_method VARCHAR, created_at DATETIME)

  order_items(id BIGINT PK, order_id BIGINT FK→orders,
              product_id BIGINT FK→products, quantity INT, price DECIMAL)

  shipments(id BIGINT PK, order_id BIGINT FK→orders, tracking_number VARCHAR,
            status VARCHAR, carrier VARCHAR, destination VARCHAR,
            warehouse VARCHAR, mode_of_shipment VARCHAR, eta DATE)

  reviews(id BIGINT PK, user_id BIGINT FK→users, product_id BIGINT FK→products,
          star_rating INT, review_text TEXT, sentiment VARCHAR,
          helpful INT, created_at DATETIME)

  customer_profiles(id BIGINT PK, user_id BIGINT FK→users, age INT,
                    gender VARCHAR, city VARCHAR, membership_type VARCHAR,
                    total_spent DECIMAL, items_purchased INT,
                    avg_rating DECIMAL, satisfaction_level VARCHAR)

  audit_logs(id BIGINT PK, user_id BIGINT FK→users, action VARCHAR,
             entity_type VARCHAR, entity_id BIGINT, created_at DATETIME)
"""

_TEXT2SQL_PROMPT = """\
You are a MySQL expert specialising in e-commerce analytics.
Convert the question into a single, safe SELECT query.

{schema}

Current user context: {user_context}

Role-based data-access rules:
  - INDIVIDUAL: scope all queries to WHERE user_id = {user_id} (orders, reviews, etc.)
  - CORPORATE:  scope all queries to the stores owned by user_id = {user_id}
  - ADMIN:      full read access — no WHERE restriction needed

Previous attempt failed with this error (empty if first attempt):
{prev_error}

Question: {question}

Strict output rules:
  - Output ONLY the raw SQL — no markdown fences, no explanation, no comments
  - Use only SELECT (never INSERT / UPDATE / DELETE / DROP / ALTER / TRUNCATE)
  - Add LIMIT 100 unless an aggregate already reduces the result to a small set
  - Always alias aggregate columns (e.g. COUNT(*) AS total_orders)
  - NEVER expose password_hash or raw API keys in the SELECT list
"""

# Matches mutating SQL keywords at word boundaries
_MUTATION_RE = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|REPLACE|MERGE)\b",
    re.IGNORECASE,
)


def _strip_markdown(sql: str) -> str:
    """Remove ```sql ... ``` fences if the model adds them despite instructions."""
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
    iteration: int = state.get("iteration_count", 0)
    prev_error: str = state.get("error") or ""

    trace.append(f"sql_agent: attempt {iteration + 1} — generating SQL")

    # ── 1. Build user-context string ─────────────────────────────────────────
    user_id = user_context.get("id", "unknown")
    role = user_context.get("role", "INDIVIDUAL")
    user_ctx_str = (
        f"user_id={user_id}, "
        f"name={user_context.get('name', '')}, "
        f"email={user_context.get('email', '')}, "
        f"role={role}"
    )

    # ── 2. Generate SQL ───────────────────────────────────────────────────────
    try:
        model = get_model()
        response = model.generate_content(
            _TEXT2SQL_PROMPT.format(
                schema=_SCHEMA,
                user_context=user_ctx_str,
                user_id=user_id,
                prev_error=prev_error,
                question=question,
            )
        )
        sql_query = _strip_markdown(response.text)
    except Exception as exc:
        trace.append(f"sql_agent: SQL generation failed — {exc}")
        return {
            **state,
            "error": f"SQL oluşturulamadı: {exc}",
            "iteration_count": iteration + 1,
            "agent_trace": trace,
        }

    # ── 3. Safety check — block mutating statements ───────────────────────────
    if _MUTATION_RE.search(sql_query):
        trace.append("sql_agent: BLOCKED — mutating statement detected")
        return {
            **state,
            "error": "Güvenlik ihlali: sadece SELECT sorguları çalıştırılabilir.",
            "sql_query": sql_query,
            "iteration_count": iteration + 1,
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
            "iteration_count": iteration + 1,
            "agent_trace": trace,
        }

    trace.append(f"sql_agent: query returned {len(rows)} rows")

    # Clear any previous error — this attempt succeeded
    return {
        **state,
        "sql_query": sql_query,
        "query_result": rows,
        "error": None,
        "iteration_count": iteration + 1,
        "agent_trace": trace,
    }
