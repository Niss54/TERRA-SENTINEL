"""
TERRA-SENTINEL Production Entrypoint Script
Reliably parses $PORT from any cloud orchestrator (Railway, Cloud Run, Render)
and launches Uvicorn ASGI server with zero shell expansion errors.
"""
import os
import sys
import traceback

# Ensure root directory is in sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

def main():
    print("=" * 60, flush=True)
    print(f"[TERRA-SENTINEL] Booting production container runtime...", flush=True)
    print(f"[TERRA-SENTINEL] Python: {sys.version}", flush=True)
    print(f"[TERRA-SENTINEL] Executable: {sys.executable}", flush=True)
    print(f"[TERRA-SENTINEL] Working Dir: {os.getcwd()}", flush=True)
    print(f"[TERRA-SENTINEL] App Root: {root_dir}", flush=True)

    raw_port = os.environ.get("PORT", "8000")
    try:
        port = int(raw_port)
    except (ValueError, TypeError):
        import re
        digits = re.findall(r"\d+", str(raw_port))
        port = int(digits[0]) if digits else 8000

    host = "0.0.0.0"
    print(f"[TERRA-SENTINEL] Resolved Bind: {host}:{port} (from raw PORT='{raw_port}')", flush=True)
    print("=" * 60, flush=True)

    try:
        import uvicorn
        from backend.app.main import app

        print(f"[TERRA-SENTINEL] FastAPI application loaded successfully. Launching Uvicorn on {host}:{port}...", flush=True)
        uvicorn.run(
            app,
            host=host,
            port=port,
            workers=1,
            timeout_keep_alive=65,
            log_level="info",
            access_log=True
        )
    except Exception as exc:
        print(f"[TERRA-SENTINEL CRITICAL ERROR] Server startup failed: {exc}", file=sys.stderr, flush=True)
        traceback.print_exc(file=sys.stderr)
        sys.stderr.flush()
        import time
        time.sleep(2)
        sys.exit(1)

if __name__ == "__main__":
    main()

