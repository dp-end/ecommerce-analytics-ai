"""
DataPulse AI — Chainlit chat application.

Run with:
    chainlit run app.py

The app uses the LangGraph pipeline (graph.py) which chains:
  Guardrails Agent → SQL Agent → Error Agent → Visualization Agent

Plotly charts are rendered inline via cl.Plotly elements.
"""

import os

import chainlit as cl
import plotly.graph_objects as go
from dotenv import load_dotenv

from graph import build_graph, initial_state

load_dotenv()


# ── Chainlit lifecycle hooks ──────────────────────────────────────────────────

@cl.on_chat_start
async def on_chat_start():
    """Greet the user and store the compiled graph in the session."""
    cl.user_session.set("graph", build_graph())
    cl.user_session.set("user_context", None)   # populated by /login if used

    await cl.Message(
        content=(
            "## DataPulse AI Asistanı\n\n"
            "Merhaba! E-ticaret verileriniz hakkında sorular sorabilirsiniz.\n\n"
            "**Örnek sorular:**\n"
            "- En çok satan 5 ürün hangileri?\n"
            "- Bu ayki toplam satış geliri ne kadar?\n"
            "- Bekleyen siparişler kaç adet?\n"
            "- Hangi kategoride en fazla yorum var?\n"
        )
    ).send()


@cl.on_message
async def on_message(message: cl.Message):
    """Process each user message through the LangGraph pipeline."""
    graph = cl.user_session.get("graph")
    user_context = cl.user_session.get("user_context")

    # Show typing indicator while agents run
    async with cl.Step(name="Ajanlar çalışıyor…", show_input=False) as step:
        state = initial_state(
            question=message.content,
            user_context=user_context,
        )
        result = await graph.ainvoke(state)

        # Build step summary (agent trace)
        trace_lines = "\n".join(f"  • {t}" for t in result.get("agent_trace", []))
        step.output = f"**Ajan izleri:**\n{trace_lines}" if trace_lines else "Tamamlandı."

    # ── Build response elements ───────────────────────────────────────────────
    elements: list[cl.Element] = []

    viz_data = result.get("visualization_data")
    if viz_data:
        try:
            fig = go.Figure(viz_data)
            elements.append(
                cl.Plotly(name="chart", figure=fig, display="inline", size="large")
            )
        except Exception as exc:
            # Non-critical — just skip the chart
            pass

    await cl.Message(
        content=result.get("answer") or "Yanıt alınamadı.",
        elements=elements,
    ).send()


# ── Optional: expose user-context endpoint for JWT-based auth ─────────────────

@cl.action_callback("set_user_context")
async def set_user_context(action: cl.Action):
    """Allow the frontend to pass user context via a Chainlit action."""
    import json
    try:
        ctx = json.loads(action.value)
        cl.user_session.set("user_context", ctx)
        await cl.Message(content=f"Kullanıcı bağlamı güncellendi: {ctx.get('name', '')}").send()
    except Exception:
        pass
