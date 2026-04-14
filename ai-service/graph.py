"""
LangGraph state-machine for the DataPulse multi-agent Text2SQL pipeline.

Full node execution order:

  START
    │
    ▼
  ┌─────────────────┐
  │   guardrails    │  — classifies intent, blocks unsafe / out-of-scope questions
  └────────┬────────┘
           │
     is_in_scope? ──── False ──► END  (answer = rejection / greeting)
           │
         True
           │
           ▼
  ┌─────────────────┐   ◄─────────────────────────────────────────────────┐
  │      sql        │  — Text-to-SQL + safe execution                     │
  └────────┬────────┘                                                     │
           │                                                              │
      error? ──── True ──► ┌──────────────┐   iteration_count < MAX?     │
           │               │    error     │  ─── yes ───────────────────►┘
           │               └──────┬───────┘
           │                      │ iteration_count >= MAX
           │                     END  (friendly message)
           │
         False (success)
           │
           ▼
  ┌─────────────────┐
  │    analysis     │  — explains results in natural language (Analysis Agent)
  └────────┬────────┘
           │
           ▼
  ┌─────────────────────┐
  │   decide_viz        │  — LLM decides if a chart adds value
  └──────────┬──────────┘
             │
   needs_visualization? ──── False ──► END
             │
           True
             │
             ▼
  ┌─────────────────┐
  │  visualization  │  — builds JSON-serialisable Plotly figure
  └────────┬────────┘
           │
          END
"""

from langgraph.graph import END, START, StateGraph

from agents.analysis_agent import analysis_node, decide_visualization_node
from agents.error_agent import error_node
from agents.guardrails_agent import guardrails_node
from agents.sql_agent import sql_node
from agents.state import AgentState
from agents.visualization_agent import visualization_node

# Maximum number of SQL generation + execution attempts
MAX_RETRIES = 3


# ── Conditional edge functions ────────────────────────────────────────────────

def _route_guardrails(state: AgentState) -> str:
    """After guardrails: proceed to SQL or terminate."""
    return "sql" if state.get("is_in_scope") else END


def _route_sql(state: AgentState) -> str:
    """After SQL agent: send to error handler or proceed to analysis."""
    return "error" if state.get("error") else "analysis"


def _route_error(state: AgentState) -> str:
    """After error agent: retry SQL if retries remain, else terminate."""
    if state.get("error") and (state.get("iteration_count", 0) < MAX_RETRIES):
        return "sql"
    return END


def _route_decide_viz(state: AgentState) -> str:
    """After decide-viz node: show chart or skip directly to END."""
    return "visualization" if state.get("needs_visualization") else END


# ── Graph builder ─────────────────────────────────────────────────────────────

def build_graph():
    """Compile and return the runnable LangGraph pipeline."""
    workflow = StateGraph(AgentState)

    # ── Register nodes ────────────────────────────────────────────────────────
    workflow.add_node("guardrails",  guardrails_node)
    workflow.add_node("sql",         sql_node)
    workflow.add_node("error",       error_node)
    workflow.add_node("analysis",    analysis_node)
    workflow.add_node("decide_viz",  decide_visualization_node)
    workflow.add_node("visualization", visualization_node)

    # ── Entry point ───────────────────────────────────────────────────────────
    workflow.add_edge(START, "guardrails")

    # ── Guardrails → SQL or END ───────────────────────────────────────────────
    workflow.add_conditional_edges(
        "guardrails",
        _route_guardrails,
        {"sql": "sql", END: END},
    )

    # ── SQL → Analysis or Error ───────────────────────────────────────────────
    workflow.add_conditional_edges(
        "sql",
        _route_sql,
        {"error": "error", "analysis": "analysis"},
    )

    # ── Error → SQL (retry) or END ────────────────────────────────────────────
    workflow.add_conditional_edges(
        "error",
        _route_error,
        {"sql": "sql", END: END},
    )

    # ── Analysis → Decide-viz (always) ───────────────────────────────────────
    workflow.add_edge("analysis", "decide_viz")

    # ── Decide-viz → Visualization or END ────────────────────────────────────
    workflow.add_conditional_edges(
        "decide_viz",
        _route_decide_viz,
        {"visualization": "visualization", END: END},
    )

    # ── Visualization → END ───────────────────────────────────────────────────
    workflow.add_edge("visualization", END)

    return workflow.compile()


# ── Default initial state factory ─────────────────────────────────────────────

def initial_state(question: str, user_context: dict | None = None) -> AgentState:
    """Create a clean AgentState for a new conversation turn."""
    return AgentState(
        question=question,
        user_context=user_context,
        is_safe=False,
        is_in_scope=False,
        rejection_reason=None,
        sql_query=None,
        query_result=None,
        error=None,
        iteration_count=0,
        final_answer="",
        needs_visualization=None,
        visualization_data=None,
        visualization_code=None,
        answer="",
        agent_trace=[],
    )
