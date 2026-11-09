import re
from typing import Any


_SENSITIVE_FIELD = re.compile(
    r"(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|"
    r"password|secret|authorization|credential|private[_-]?key)",
    re.IGNORECASE,
)
_SECRET_PATTERNS = (
    (re.compile(r"\bBearer\s+[A-Za-z0-9._~+/-]+=*", re.IGNORECASE), "Bearer [REDACTED]"),
    (
        re.compile(
            r"\b(?:gsk_[A-Za-z0-9]{16,}|(?:pk|sk)-lf-[A-Za-z0-9_-]{8,}|"
            r"gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b"
        ),
        "[REDACTED]",
    ),
    (
        re.compile(r"\bpostgres(?:ql)?://[^\s\"'<>]+", re.IGNORECASE),
        "[REDACTED_DATABASE_URL]",
    ),
    (
        re.compile(
            r"""(\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|"""
            r"""client[_-]?secret|password|secret|authorization)\b\s*[=:]\s*)"""
            r"""(["']?)[^"'\s,;]+(["']?)""",
            re.IGNORECASE,
        ),
        r"\1[REDACTED]",
    ),
    (
        re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE),
        "[REDACTED_EMAIL]",
    ),
)


def mask_sensitive_data(*, data: Any, **_: Any) -> Any:
    if isinstance(data, dict):
        masked = {}
        for key, value in data.items():
            if isinstance(key, str) and _SENSITIVE_FIELD.search(key):
                masked[key] = "[REDACTED]"
            else:
                masked[key] = mask_sensitive_data(data=value)
        return masked

    if isinstance(data, (list, tuple)):
        return [mask_sensitive_data(data=value) for value in data]

    if isinstance(data, str):
        for pattern, replacement in _SECRET_PATTERNS:
            data = pattern.sub(replacement, data)
        return data

    return data
