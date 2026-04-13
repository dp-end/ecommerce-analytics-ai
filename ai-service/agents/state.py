"""
LangGraph state definition for the DataPulse multi-agent pipeline.

State machine flow:
  START
    └─► guardrails_node ──(unsafe)──► END  (rejection message)
              │
           (safe)
              │
        sql_node ──(error)──► error_node ──► END
              │
           (success)
              │
        visualization_node ──► END
"""

from typing import Any, Optional, TypedDict


class AgentState(TypedDict):
    # Input
    question: str
    user_context: Optional[dict[str, Any]]   # {id, name, email, role}

    # Guardrails output
    is_safe: bool
    rejection_reason: Optional[str]

    # SQL Agent output
    sql_query: Optional[str]
    query_result: Optional[list[dict[str, Any]]]

    # Error Agent output
    error: Optional[str]

    # Visualization Agent output
    visualization_data: Optional[dict[str, Any]]   # Plotly figure dict (JSON-serialisable)

    # Final answer produced by whichever agent ran last
    answer: str

    # Ordered list of agent names that ran — useful for debugging
    agent_trace: list[str]
