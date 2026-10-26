"""Secret scrubbing — error messages must never carry credentials.

httpx exceptions embed the full request URL, which for our providers
contains `?key=...` (Gemini) or `/csv/{MAP_KEY}/` (FIRMS). Scrub before
anything reaches API responses / frontend / logs shown to users.
"""
import re

_PATTERNS = [
    # ?key=SECRET or &key=SECRET (query string)
    (re.compile(r"([?&]key=)[^&\s'\"]+"), r"\1***"),
    # /csv/MAP_KEY/ (FIRMS area API path)
    (re.compile(r"(/csv/)[0-9a-fA-F]{16,}(/)"), r"\1***\2"),
    # token=... / access_token=...
    (re.compile(r"((?:access_)?token=)[^&\s'\"]+"), r"\1***"),
    # Authorization: Bearer ...
    (re.compile(r"(Bearer\s+)[A-Za-z0-9\-._~+/=]+"), r"\1***"),
    # PEM private key blocks
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----", re.DOTALL),
     "-----BEGIN PRIVATE KEY-----***-----END PRIVATE KEY-----"),
]


def scrub_secrets(text: str) -> str:
    if not text:
        return text
    out = str(text)
    for rx, repl in _PATTERNS:
        out = rx.sub(repl, out)
    return out
