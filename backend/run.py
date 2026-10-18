"""
TERRA-SENTINEL Production Entrypoint Script
Reliably parses $PORT from any cloud orchestrator (Railway, Cloud Run, Render)
and launches Uvicorn ASGI server with zero shell expansion errors.
"""
import os
import sys

# Ensure root directory is in sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

import uvicorn

def main():
    raw_port = os.environ.get("PORT", "8000")
    try:
        port = int(raw_port)
    except (ValueError, TypeError):
        # Fallback if raw_port contains unexpected characters
        import re
        digits = re.findall(r"\d+", str(raw_port))
        port = int(digits[0]) if digits else 8000

    host = "0.0.0.0"
    print(f"[TERRA-SENTINEL] Starting server on {host}:{port} (raw PORT='{raw_port}')", flush=True)

    uvicorn.run(
        "backend.app.main:app",
        host=host,
        port=port,
        workers=1,
        timeout_keep_alive=65,
        log_level="info"
    )

if __name__ == "__main__":
    main()
