from typing import Annotated, List, Dict, Any, Optional
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages

class IncidentState(TypedDict):
    messages: Annotated[list, add_messages]
    incident_id: str
    service_name: Optional[str]
    severity: Optional[str]
    root_cause: Optional[str]
    retrieved_runbooks: Optional[List[Dict[str, Any]]]
    diagnostic_logs: Optional[List[str]]
    proposed_patch: Optional[str]
    status: Optional[str]
    agent_iterations: Optional[int]
