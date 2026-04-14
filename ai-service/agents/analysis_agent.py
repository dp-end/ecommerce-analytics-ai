"""
Analysis Agent — third node in the state machine.

Responsibilities:
  1. Explain the query result set in plain natural language (2-4 sentences)
  2. Decide whether a chart would add meaningful value for the user
     (sets state["needs_visualization"])

This node runs AFTER sql_node succeeds (no error) and BEFORE
the visualization node.
"""

import json
import logging

from agents.gemini_client import get_model
from agents.state import AgentState

logger = logging.getLogger(__name__)

_ANALYSIS_PROMPT = """\
You are a helpful data analyst for an e-commerce platform.
Explain the following database query results in plain, friendly language.

Original question: {question}
SQL query used: {sql}
Total rows returned: {count}
Sample rows (up to 10): {sample}

Rules:
  - Be concise: 2-4 sentences
  - Do NOT show SQL, column names in code blocks, or technical details
  - Highlight the key insight or finding
  - Use the same language the user wrote in
  - If no rows returned: clearly say there are no results
"""

_DECIDE_VIZ_PROMPT = """\
Should a chart/graph be displayed for this data?

User question: {question}
Row count: {count}
Column names: {columns}
Sample data: {sample}

Answer with ONLY "yes" or "no".

Use "yes" when:
- There are multiple rows that form a comparison, trend, or distribution
- A bar chart, line chart, pie chart, or scatter plot would add insight

Use "no" when:
- Only 1 row or 1 value is returned
- Data is mostly text (names, addresses, descriptions)
- A chart would not add meaningful insight
"""


def analysis_node(state: AgentState) -> AgentState:
    """Summarise query results in natural language."""
    rows = state.get("query_result") or []
    sql = state.get("sql_query") or ""
    question = state["question"]
    trace = list(state.get("agent_trace") or [])
    trace.append("analysis_agent: explaining results")

    if not rows:
        msg = "Sorgunuz herhangi bir sonuç döndürmedi."
        return {
            **state,
            "answer": msg,
            "final_answer": msg,
            "agent_trace": trace,
        }

    try:
        model = get_model()
        sample_json = json.dumps(rows[:10], default=str, ensure_ascii=False)

        resp = model.generate_content(
            _ANALYSIS_PROMPT.format(
                question=question,
                sql=sql,
                count=len(rows),
                sample=sample_json,
            )
        )
        answer = resp.text.strip()
    except Exception as exc:
        answer = f"{len(rows)} sonuç bulundu."
        logger.warning("Analysis agent summarisation failed: %s", exc)

    trace.append(f"analysis_agent: explanation generated ({len(answer)} chars)")
    return {**state, "answer": answer, "final_answer": answer, "agent_trace": trace}


def decide_visualization_node(state: AgentState) -> AgentState:
    """Decide whether a Plotly chart is appropriate for the result."""
    rows = state.get("query_result") or []
    question = state["question"]
    trace = list(state.get("agent_trace") or [])
    trace.append("decide_viz_agent: evaluating chart need")

    if not rows or len(rows) == 0:
        return {**state, "needs_visualization": False, "agent_trace": trace}

    # Heuristic fast-path: single value or only text columns → no chart
    columns = list(rows[0].keys()) if rows else []
    numeric_cols = [
        k for k, v in rows[0].items()
        if isinstance(v, (int, float)) and not isinstance(v, bool)
    ]

    if len(rows) == 1 and len(numeric_cols) <= 1:
        trace.append("decide_viz_agent: single-row result, no chart needed")
        return {**state, "needs_visualization": False, "agent_trace": trace}

    if not numeric_cols:
        trace.append("decide_viz_agent: no numeric columns, no chart needed")
        return {**state, "needs_visualization": False, "agent_trace": trace}

    # LLM decision for ambiguous cases
    try:
        model = get_model()
        sample_json = json.dumps(rows[:5], default=str, ensure_ascii=False)
        resp = model.generate_content(
            _DECIDE_VIZ_PROMPT.format(
                question=question,
                count=len(rows),
                columns=", ".join(columns),
                sample=sample_json,
            )
        )
        needs_viz = resp.text.strip().lower().startswith("yes")
    except Exception as exc:
        # Fallback: show chart if we have multiple rows with numeric data
        needs_viz = len(rows) > 1 and bool(numeric_cols)
        logger.warning("Decide-viz LLM call failed: %s — fallback=%s", exc, needs_viz)

    trace.append(f"decide_viz_agent: needs_visualization={needs_viz}")
    return {**state, "needs_visualization": needs_viz, "agent_trace": trace}
