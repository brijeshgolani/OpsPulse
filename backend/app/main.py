import os
import json
import logging
import asyncio
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any, AsyncIterator
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from langfuse import Langfuse
from pydantic import BaseModel

from app.config import settings
from app.agent.graph import build_sre_graph
from app.observability import mask_sensitive_data
from langgraph.checkpoint.memory import MemorySaver

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("opspulse_api")

if bool(settings.LANGFUSE_PUBLIC_KEY) != bool(settings.LANGFUSE_SECRET_KEY):
    raise ValueError("Both LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY must be configured.")

langfuse_client = (
    Langfuse(
        public_key=settings.LANGFUSE_PUBLIC_KEY,
        secret_key=settings.LANGFUSE_SECRET_KEY,
        base_url=settings.LANGFUSE_BASE_URL,
        mask=mask_sensitive_data,
    )
    if settings.LANGFUSE_PUBLIC_KEY and settings.LANGFUSE_SECRET_KEY
    else None
)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    try:
        yield
    finally:
        if langfuse_client is not None:
            langfuse_client.shutdown()


app = FastAPI(
    title="OpsPulse SRE Agent API",
    description="Autonomous Site Reliability Engineering & DevOps Incident Responder",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

checkpointer = None
checkpointer_type = "memory"

if settings.SUPABASE_POSTGRES_URL and "password@" not in settings.SUPABASE_POSTGRES_URL:
    try:
        from psycopg_pool import ConnectionPool
        from langgraph.checkpoint.postgres import PostgresSaver
        pool = ConnectionPool(conninfo=settings.SUPABASE_POSTGRES_URL, max_size=10)
        pg_checkpointer = PostgresSaver(pool)
        pg_checkpointer.setup()
        checkpointer = pg_checkpointer
        checkpointer_type = "postgres_supabase"
        logger.info("Successfully connected to Supabase PostgreSQL checkpointer.")
    except Exception as e:
        logger.warning(f"Could not connect to Postgres ({e}). Falling back to MemorySaver.")
        checkpointer = MemorySaver()
else:
    checkpointer = MemorySaver()
    logger.info("Using in-memory state checkpointer for local development.")

agent = build_sre_graph(checkpointer=checkpointer)

INCIDENTS_METADATA: Dict[str, Dict[str, Any]] = {
    "INC-8092": {
        "id": "INC-8092",
        "title": "500 Internal Server Errors in checkout-service",
        "service": "checkout-service",
        "severity": "CRITICAL",
        "created_at": "2026-11-08T05:10:00Z",
        "status": "Active"
    },
    "INC-8041": {
        "id": "INC-8041",
        "title": "Auth token verification latency spike",
        "service": "auth-service",
        "severity": "HIGH",
        "created_at": "2026-11-07T18:22:00Z",
        "status": "Resolved"
    }
}

class CreateIncidentRequest(BaseModel):
    title: str
    service: str
    severity: str = "HIGH"
    initial_log: Optional[str] = None

class MessageRequest(BaseModel):
    message: str

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "checkpointer": checkpointer_type,
        "model": settings.LLM_MODEL,
        "observability": "langfuse_configured" if langfuse_client else "disabled"
    }

@app.get("/api/incidents")
def list_incidents():
    return list(INCIDENTS_METADATA.values())

@app.post("/api/incidents")
def create_incident(req: CreateIncidentRequest):
    import random
    new_id = f"INC-{random.randint(9000, 9999)}"
    INCIDENTS_METADATA[new_id] = {
        "id": new_id,
        "title": req.title,
        "service": req.service,
        "severity": req.severity,
        "created_at": "Just now",
        "status": "Active"
    }
    return INCIDENTS_METADATA[new_id]

@app.get("/api/incidents/{thread_id}/history")
def get_incident_history(thread_id: str):
    config = {"configurable": {"thread_id": thread_id}}
    state = agent.get_state(config)
    if not state or not state.values:
        return {"thread_id": thread_id, "messages": []}
    
    messages = []
    for msg in state.values.get("messages", []):
        messages.append({
            "type": msg.type,
            "content": msg.content
        })
    return {"thread_id": thread_id, "messages": messages}

@app.post("/api/incidents/{thread_id}/stream")
async def stream_incident_investigation(thread_id: str, payload: MessageRequest):
    callbacks = []
    if langfuse_client is not None:
        from langfuse.langchain import CallbackHandler

        callbacks.append(CallbackHandler(public_key=settings.LANGFUSE_PUBLIC_KEY))

    config = {
        "configurable": {"thread_id": thread_id},
        "callbacks": callbacks,
        "metadata": {
            "langfuse_session_id": thread_id,
            "langfuse_trace_name": "investigate-incident",
            "langfuse_tags": ["opspulse", "incident-investigation"],
        },
    }

    async def event_generator():
        try:
            input_state = {
                "messages": [("user", payload.message)],
                "incident_id": thread_id,
                "agent_iterations": 0,
            }

            async for event in agent.astream_events(input_state, config=config, version="v2"):
                event_name = event.get("event", "")

                if event_name == "on_chat_model_stream":
                    chunk = event["data"]["chunk"]
                    if hasattr(chunk, "content") and chunk.content:
                        yield f"data: {json.dumps({'type': 'token', 'content': chunk.content})}\n\n"

                elif event_name == "on_tool_start":
                    tool_name = event.get("name", "unknown_tool")
                    tool_input = event["data"].get("input", {})
                    yield f"data: {json.dumps({'type': 'tool_start', 'tool': tool_name, 'input': tool_input})}\n\n"

                elif event_name == "on_tool_end":
                    tool_output = str(event["data"].get("output", ""))
                    yield f"data: {json.dumps({'type': 'tool_end', 'tool': event.get('name'), 'output': tool_output})}\n\n"

                elif event_name == "on_chain_end" and event.get("name") == "retrieve_memory":
                    output = event["data"].get("output", {})
                    runbooks = output.get("retrieved_runbooks", [])
                    if runbooks:
                        yield f"data: {json.dumps({'type': 'memory_found', 'runbooks': runbooks})}\n\n"

                elif event_name == "on_chain_end" and event.get("name") == "agent":
                    output = event["data"].get("output", {})
                    if output.get("status") == "iteration_limit":
                        messages = output.get("messages", [])
                        content = getattr(messages[-1], "content", "") if messages else ""
                        if isinstance(content, str) and content:
                            yield f"data: {json.dumps({'type': 'token', 'content': content})}\n\n"

            yield "data: [DONE]\n\n"
        except Exception as err:
            logger.error(f"Error during streaming: {err}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(err)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
