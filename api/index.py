import sys
import os

# Add backend directory to Python sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app as _fastapi_app

async def app(scope, receive, send):
    """
    Vercel ASGI wrapper to ensure clean routing from /api/* rewrites to FastAPI endpoints.
    """
    if scope.get("type") == "http":
        headers = dict(scope.get("headers", []))
        matched_path = (
            headers.get(b"x-matched-path", b"")
            or headers.get(b"x-forwarded-uri", b"")
            or headers.get(b"x-vercel-matched-path", b"")
            or headers.get(b"x-original-uri", b"")
        ).decode("utf-8", errors="ignore").split("?")[0]

        current_path = scope.get("path", "")
        if matched_path and (current_path in ("/api/index.py", "/api/index", "/api") or "index.py" in current_path):
            scope["path"] = matched_path
        elif current_path.startswith("/api/index.py/"):
            scope["path"] = current_path.replace("/api/index.py", "/api", 1)

    await _fastapi_app(scope, receive, send)
