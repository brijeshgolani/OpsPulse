import os
import logging
from typing import Dict, Any, List
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_groq import ChatGroq

from app.agent.state import IncidentState
from app.agent.memory import memory_engine
from app.mcp.client import mcp_manager
from app.config import settings

logger = logging.getLogger("sre_graph")

SYSTEM_PROMPT = """You are OpsPulse SRE, an expert Site Reliability Engineer and DevOps Incident Commander.
Your job is to investigate production alerts, triage root causes, and propose robust remediations.

You have access to Model Context Protocol (MCP) and SRE tools:
- `fetch_service_logs`: Read recent stdout/stderr and trace exceptions.
- `inspect_github_commit`: Review recent repository commits and diffs.
- `search_codebase`: Find problematic function signatures and code files.
- `create_github_pull_request`: Submit automated bug fixes and rollback plans.

Workflow:
1. For a full triage, inspect the service logs and a relevant recent commit once each.
2. Search the code once if the logs or commit identify a concrete error location.
3. Cross-reference findings with any retrieved past postmortems.
4. Clearly explain:
   - **Root Cause Analysis (RCA)**: The exact line and bug trigger.
   - **Immediate Mitigation**: Safe steps to restore service immediately.
   - **Long-Term Fix**: Code patch with defensive checks.
Do not repeat a tool call to reconfirm the same evidence. Once the logs, commit, and any relevant code have been inspected, synthesize the findings instead of searching further. Do not create a pull request unless the user explicitly asks you to.
"""

DEFAULT_MAX_AGENT_ITERATIONS = 5


def build_sre_graph(
    checkpointer=None,
    max_agent_iterations: int = DEFAULT_MAX_AGENT_ITERATIONS,
):
    if max_agent_iterations < 1:
        raise ValueError("max_agent_iterations must be at least 1")

    tools = mcp_manager.get_tools()
    
    base_model = ChatGroq(
        model=settings.LLM_MODEL,
        api_key=settings.GROQ_API_KEY or "dummy_key",
        temperature=0.1,
        streaming=True,
    )
    model = base_model.bind_tools(tools)

    def retrieve_memory_node(state: IncidentState) -> Dict[str, Any]:
        last_msg = state["messages"][-1].content if state["messages"] else ""
        matches = memory_engine.search_similar_incidents(str(last_msg))
        context_str = "\n".join([
            f"- [{m['id']}] {m['title']}: {m['root_cause']} -> Solution: {m['resolution']}"
            for m in matches
        ])
        memory_message = SystemMessage(
            content=f"Long-Term Memory Search (Similar Past Incidents):\n{context_str}\n"
                    "Use this historical context to expedite your investigation."
        )
        return {
            "retrieved_runbooks": matches,
            "messages": [memory_message]
        }

    def agent_reasoning_node(state: IncidentState) -> Dict[str, Any]:
        messages = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
        response = model.invoke(messages)
        iterations = (state.get("agent_iterations") or 0) + 1
        if response.tool_calls and iterations >= max_agent_iterations:
            logger.warning(
                "Finalizing agent after %s reasoning iterations with pending tool calls.",
                iterations,
            )
            response = base_model.invoke(messages)
            if response.tool_calls or not response.content:
                response = AIMessage(
                    content=(
                        f"Investigation stopped after {iterations} reasoning steps. "
                        "I could not produce a final summary from the evidence collected."
                    )
                )
                status = "iteration_limit"
            else:
                status = "completed"
        else:
            status = "investigating" if response.tool_calls else "completed"

        return {
            "messages": [response],
            "status": status,
            "agent_iterations": iterations,
        }

    tool_node = ToolNode(tools)

    builder = StateGraph(IncidentState)
    builder.add_node("retrieve_memory", retrieve_memory_node)
    builder.add_node("agent", agent_reasoning_node)
    builder.add_node("tools", tool_node)

    builder.add_edge(START, "retrieve_memory")
    builder.add_edge("retrieve_memory", "agent")
    builder.add_conditional_edges("agent", tools_condition, ["tools", END])
    builder.add_edge("tools", "agent")

    active_checkpointer = checkpointer if checkpointer is not None else MemorySaver()
    return builder.compile(checkpointer=active_checkpointer)
