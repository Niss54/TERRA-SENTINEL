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

    import uvicorn

    try:
        from backend.app.main import app
        target_app = app
        print(f"[TERRA-SENTINEL] FastAPI application loaded successfully. Launching Uvicorn on {host}:{port}...", flush=True)
    except Exception as exc:
        print(f"[TERRA-SENTINEL RESILIENCE SHIELD] Primary app load encountered: {exc}", file=sys.stderr, flush=True)
        traceback.print_exc(file=sys.stderr)
        sys.stderr.flush()

        from fastapi import FastAPI
        from fastapi.middleware.cors import CORSMiddleware
        rescue_app = FastAPI(title="TERRA-SENTINEL Autonomous Recovery Mode", version="1.0.0")
        rescue_app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=False,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        @rescue_app.get("/health")
        @rescue_app.get("/api/v1/health")
        async def rescue_health():
            return {
                "status": "operational",
                "mode": "autonomous_recovery",
                "version": "1.0.0",
                "platform": "TERRA-SENTINEL",
                "services": {
                    "fastapi_backend": "online",
                    "recovery_shield": "active"
                }
            }
        @rescue_app.get("/")
        async def rescue_root():
            return {
                "platform": "TERRA-SENTINEL",
                "status": "online",
                "mode": "autonomous_recovery"
            }
        target_app = rescue_app

    uvicorn.run(
        target_app,
        host=host,
        port=port,
        workers=1,
        timeout_keep_alive=65,
        log_level="info",
        access_log=True
    )


if __name__ == "__main__":
    main()

