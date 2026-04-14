"""
LangGraph state definition for the DataPulse multi-agent pipeline.

State machine flow:
  START
    └─► guardrails_node ──(unsafe / out-of-scope)──► END  (rejection message)
              │
           (safe / in-scope)
              │
         sql_node ──(error)──► error_node ──(retry < 3)──► sql_node
              │                       └──(retries exhausted)──► END
           (success)
              │
        analysis_node ──► decide_visualization_node
              │                        │
              │            (needs_visualization=True)
              │                        │
              │                visualization_node ──► END
              │
          (needs_visualization=False) ──► END
"""

from typing import Any, Optional, TypedDict


class AgentState(TypedDict):
    # ── Input ─────────────────────────────────────────────────────────────────
    question: str
    user_context: Optional[dict[str, Any]]   # {id, name, email, role}

    # ── Guardrails output ─────────────────────────────────────────────────────
    is_safe: bool                            # True = question passed guardrails
    is_in_scope: bool                        # Alias for is_safe (PDF requirement)
    rejection_reason: Optional[str]

    # ── SQL Agent output ──────────────────────────────────────────────────────
    sql_query: Optional[str]
    query_result: Optional[list[dict[str, Any]]]

    # ── Error handling ────────────────────────────────────────────────────────
    error: Optional[str]
    iteration_count: int                     # Retry counter (max = MAX_RETRIES in graph.py)

    # ── Analysis Agent output ─────────────────────────────────────────────────
    final_answer: str                        # NL explanation of the query result
    needs_visualization: Optional[bool]      # Set by decide_visualization_node

    # ── Visualization Agent output ────────────────────────────────────────────
    visualization_data: Optional[dict[str, Any]]   # JSON-serialisable Plotly figure
    visualization_code: Optional[str]              # Optional Plotly Python code (debug)

    # ── Final answer (may be set by any terminal node) ────────────────────────
    answer: str

    # ── Debug / transparency ──────────────────────────────────────────────────
    agent_trace: list[str]
