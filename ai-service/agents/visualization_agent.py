"""
Visualization Agent — last node in the state machine.

Responsibilities:
  • Inspect the query_result rows
  • Select the most appropriate Plotly chart type
  • Produce a JSON-serialisable Plotly figure dict stored in state["visualization_data"]

Chart selection heuristic:
  - No rows or no numeric column  → no chart
  - 1 categorical + 1 numeric col, ≤ 20 rows → Pie chart
  - 1 categorical + 1 numeric col, > 20 rows  → Bar chart
  - 2+ numeric cols                           → Scatter plot
  - Fallback                                  → Horizontal bar chart
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from agents.state import AgentState

logger = logging.getLogger(__name__)

# ── Plotly colour palette ─────────────────────────────────────────────────────
_PALETTE = [
    "#667eea", "#764ba2", "#f093fb", "#f5576c",
    "#4facfe", "#00f2fe", "#43e97b", "#38f9d7",
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _is_numeric(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _classify_columns(
    rows: list[dict[str, Any]],
) -> tuple[list[str], list[str]]:
    """Return (numeric_keys, text_keys) based on the first non-None value per column."""
    if not rows:
        return [], []
    sample = rows[0]
    numeric, text = [], []
    for key, val in sample.items():
        # Walk rows to find first non-None
        for row in rows:
            v = row.get(key)
            if v is not None:
                (numeric if _is_numeric(v) else text).append(key)
                break
    return numeric, text


# ── Chart builders ────────────────────────────────────────────────────────────

def _bar_chart(
    x_vals: list, y_vals: list, x_label: str, y_label: str, title: str
) -> dict:
    return {
        "data": [
            {
                "type": "bar",
                "x": x_vals,
                "y": y_vals,
                "name": y_label,
                "marker": {"color": _PALETTE[0]},
            }
        ],
        "layout": {
            "title": {"text": title},
            "xaxis": {"title": x_label},
            "yaxis": {"title": y_label},
            "template": "plotly_white",
            "margin": {"l": 60, "r": 20, "t": 60, "b": 80},
        },
    }


def _pie_chart(labels: list, values: list, title: str) -> dict:
    return {
        "data": [
            {
                "type": "pie",
                "labels": labels,
                "values": values,
                "hole": 0.35,
                "marker": {"colors": _PALETTE},
            }
        ],
        "layout": {
            "title": {"text": title},
            "template": "plotly_white",
        },
    }


def _scatter_chart(
    x_vals: list, y_vals: list, x_label: str, y_label: str, title: str
) -> dict:
    return {
        "data": [
            {
                "type": "scatter",
                "x": x_vals,
                "y": y_vals,
                "mode": "markers",
                "marker": {"color": _PALETTE[1], "size": 9, "opacity": 0.8},
            }
        ],
        "layout": {
            "title": {"text": title},
            "xaxis": {"title": x_label},
            "yaxis": {"title": y_label},
            "template": "plotly_white",
        },
    }


def _multi_bar_chart(rows: list[dict], x_key: str, y_keys: list[str]) -> dict:
    traces = [
        {
            "type": "bar",
            "name": yk,
            "x": [str(r.get(x_key, "")) for r in rows],
            "y": [r.get(yk, 0) for r in rows],
            "marker": {"color": _PALETTE[i % len(_PALETTE)]},
        }
        for i, yk in enumerate(y_keys)
    ]
    return {
        "data": traces,
        "layout": {
            "title": {"text": f"{', '.join(y_keys)} by {x_key}"},
            "barmode": "group",
            "xaxis": {"title": x_key},
            "template": "plotly_white",
        },
    }


# ── Main generator ────────────────────────────────────────────────────────────

def generate_chart(rows: list[dict[str, Any]]) -> Optional[dict]:
    """Return a JSON-serialisable Plotly figure dict, or None if not applicable."""
    if not rows:
        return None

    numeric_keys, text_keys = _classify_columns(rows)

    if not numeric_keys:
        return None

    x_key = text_keys[0] if text_keys else None
    y_key = numeric_keys[0]

    x_vals = [str(r.get(x_key, i)) for i, r in enumerate(rows[:50])]
    y_vals = [r.get(y_key, 0) for r in rows[:50]]

    if len(numeric_keys) >= 2 and not text_keys:
        # Scatter: two numeric axes
        return _scatter_chart(
            x_vals=[r.get(numeric_keys[0], 0) for r in rows[:100]],
            y_vals=[r.get(numeric_keys[1], 0) for r in rows[:100]],
            x_label=numeric_keys[0],
            y_label=numeric_keys[1],
            title=f"{numeric_keys[1]} vs {numeric_keys[0]}",
        )

    if len(numeric_keys) >= 2 and text_keys:
        # Grouped bar with multiple metrics
        return _multi_bar_chart(rows[:30], x_key, numeric_keys[:4])

    if text_keys and len(rows) <= 20:
        return _pie_chart(labels=x_vals, values=y_vals, title=f"{y_key} dağılımı")

    return _bar_chart(
        x_vals=x_vals,
        y_vals=y_vals,
        x_label=x_key or "index",
        y_label=y_key,
        title=f"{y_key} — {x_key or 'sıra'} bazında",
    )


# ── LangGraph node ────────────────────────────────────────────────────────────

def visualization_node(state: AgentState) -> AgentState:
    rows: list[dict] = state.get("query_result") or []
    trace: list[str] = list(state.get("agent_trace") or [])

    if not rows:
        trace.append("visualization_agent: no rows — skipping chart")
        return {**state, "agent_trace": trace}

    try:
        chart = generate_chart(rows)
        if chart:
            trace.append(f"visualization_agent: chart type={chart['data'][0]['type']}")
        else:
            trace.append("visualization_agent: data not suitable for a chart")
        return {**state, "visualization_data": chart, "agent_trace": trace}
    except Exception as exc:
        logger.warning("Visualization generation failed: %s", exc)
        trace.append(f"visualization_agent: error — {exc}")
        return {**state, "agent_trace": trace}
