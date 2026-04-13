"""
LangGraph state-machine definition for the DataPulse multi-agent pipeline.

Node execution order (state machine):

  START
    │
    ▼
  ┌─────────────────┐
  │  guardrails     │  — classifies intent, blocks unsafe questions
  └────────┬────────┘
           │
     is_safe? ──── False ──► END  (answer = rejection message)
           │
         True
           │
           ▼
  ┌─────────────────┐
  │    sql          │  — Text-to-SQL + execution + NL summarisation
  └────────┬────────┘
           │
      error? ──── True ──► ┌──────────────┐
           │               │    error     │  — auto-repair or friendly message
           │               └──────┬───────┘
           │                      │
        False                    END
           │
           ▼
  ┌─────────────────┐
  │  visualization  │  — Plotly chart selection & generation
  └────────┬────────┘
           │
          END
"""

from langgraph.graph import END, START, StateGraph

from agents.error_agent import error_node
from agents.guardrails_agent import guardrails_node
from agents.sql_agent import sql_node
from agents.state import AgentState
from agents.visualization_agent import visualization_node


# ── Conditional edge functions ────────────────────────────────────────────────

def _route_guardrails(state: AgentState) -> str:
    """After guardrails: proceed to SQL or terminate."""
    return "sql" if state.get("is_safe") else END


def _route_sql(state: AgentState) -> str:
    """After SQL agent: send to error handler or proceed to visualisation."""
    return "error" if state.get("error") else "visualization"


# ── Graph builder ─────────────────────────────────────────────────────────────

def build_graph():
    """Compile and return the runnable LangGraph pipeline."""
    workflow = StateGraph(AgentState)

    # Register nodes
    workflow.add_node("guardrails", guardrails_node)
    workflow.add_node("sql", sql_node)
    workflow.add_node("error", error_node)
    workflow.add_node("visualization", visualization_node)

    # Entry point
    workflow.add_edge(START, "guardrails")

    # Conditional routing after guardrails
    workflow.add_conditional_edges(
        "guardrails",
        _route_guardrails,
        {"sql": "sql", END: END},
    )

    # Conditional routing after SQL agent
    workflow.add_conditional_edges(
        "sql",
        _route_sql,
        {"error": "error", "visualization": "visualization"},
    )

    # Terminal edges
    workflow.add_edge("error", END)
    workflow.add_edge("visualization", END)

    return workflow.compile()


# ── Default initial state factory ─────────────────────────────────────────────

def initial_state(question: str, user_context: dict | None = None) -> AgentState:
    """Create a clean AgentState for a new conversation turn."""
    return AgentState(
        question=question,
        user_context=user_context,
        is_safe=False,
        rejection_reason=None,
        sql_query=None,
        query_result=None,
        error=None,
        visualization_data=None,
        answer="",
        agent_trace=[],
    )
