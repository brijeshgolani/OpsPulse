import json
from typing import List, Dict, Any, Optional

class LongTermMemory:
    def __init__(self, connection_string: Optional[str] = None):
        self.connection_string = connection_string
        self.fallback_postmortems = [
            {
                "id": "POST-2025-01",
                "service": "checkout-service",
                "title": "Guest checkout 500 error on undefined authorization token",
                "root_cause": "Guest checkout payload omitted auth header, causing unhandled dereference in PaymentProcessor.",
                "resolution": "Added optional chaining req.auth?.token || req.headers?.authorization and defensive unit tests.",
                "tags": ["null-pointer", "auth", "checkout"]
            },
            {
                "id": "POST-2025-02",
                "service": "order-service",
                "title": "Postgres connection pool starvation during flash sale",
                "root_cause": "Database connection leak in transaction rollback block.",
                "resolution": "Enforced connection release in finally block and increased pool size from 10 to 30.",
                "tags": ["database", "pool", "timeout"]
            },
            {
                "id": "POST-2025-03",
                "service": "auth-service",
                "title": "JWT verification failure after clock drift",
                "root_cause": "NTP daemon stalled on worker nodes resulting in 4-minute time skew.",
                "resolution": "Added 300-second clock skew tolerance leeway to jwt.verify().",
                "tags": ["jwt", "ntp", "auth"]
            }
        ]

    def search_similar_incidents(self, query: str, top_k: int = 2) -> List[Dict[str, Any]]:
        query_words = set(query.lower().split())
        scored = []
        for doc in self.fallback_postmortems:
            doc_text = f"{doc['service']} {doc['title']} {doc['root_cause']} {' '.join(doc['tags'])}".lower()
            score = sum(1 for w in query_words if w in doc_text)
            scored.append((score, doc))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [doc for _, doc in scored[:top_k]]

    def store_postmortem(self, incident_id: str, service: str, title: str, root_cause: str, resolution: str):
        self.fallback_postmortems.append({
            "id": f"POST-{incident_id}",
            "service": service,
            "title": title,
            "root_cause": root_cause,
            "resolution": resolution,
            "tags": [service, "resolved"]
        })

memory_engine = LongTermMemory()
