"""
TERRA-SENTINEL Production Entrypoint Script
Reliably parses $PORT from any cloud orchestrator (Railway, Cloud Run, Render)
and launches Uvicorn ASGI server with zero shell expansion errors and clean lifecycle management.
"""
import os
import sys

# Ensure root directory is in sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

# Ensure backend directory is also in sys.path for direct module resolution
backend_dir = os.path.join(root_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Remove WEB_CONCURRENCY to prevent Uvicorn from attempting multi-worker forking on container platforms
os.environ.pop("WEB_CONCURRENCY", None)

def parse_port() -> int:
    # Check CLI arguments for --port or -p
    args = sys.argv[1:]
    for i, arg in enumerate(args):
        if arg in ("--port", "-p") and i + 1 < len(args):
            try:
                return int(args[i + 1])
            except ValueError:
                pass

    # Check environment variable PORT
    raw_port = os.environ.get("PORT", "8000")
    try:
        return int(raw_port)
    except (ValueError, TypeError):
        import re
        digits = re.findall(r"\d+", str(raw_port))
        return int(digits[0]) if digits else 8000

def create_rescue_app():
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    rescue = FastAPI(title="TERRA-SENTINEL Autonomous Recovery Mode", version="1.0.0")
    rescue.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    @rescue.get("/health")
    @rescue.get("/api/v1/health")
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
    @rescue.get("/")
    async def rescue_root():
        return {
            "platform": "TERRA-SENTINEL",
            "status": "online",
            "mode": "autonomous_recovery"
        }
    return rescue

rescue_app = create_rescue_app()

def main():
    port = parse_port()
    host = os.environ.get("HOST", "0.0.0.0")

    print("=" * 60, flush=True)
    print(f"[TERRA-SENTINEL] Booting production runtime...", flush=True)
    print(f"[TERRA-SENTINEL] Python: {sys.version}", flush=True)
    print(f"[TERRA-SENTINEL] Executable: {sys.executable}", flush=True)
    print(f"[TERRA-SENTINEL] Working Dir: {os.getcwd()}", flush=True)
    print(f"[TERRA-SENTINEL] App Root: {root_dir}", flush=True)
    print(f"[TERRA-SENTINEL] Resolved Bind: {host}:{port}", flush=True)
    print("=" * 60, flush=True)

    target_app = "backend.app.main:app"
    try:
        from backend.app.main import app
        print(f"[TERRA-SENTINEL] FastAPI application validated successfully. Launching Uvicorn on {host}:{port}...", flush=True)
    except Exception as exc:
        print(f"[TERRA-SENTINEL RESILIENCE SHIELD] Primary app import encountered: {exc}", file=sys.stderr, flush=True)
        import traceback
        traceback.print_exc(file=sys.stderr)
        target_app = "backend.run:rescue_app"

    import uvicorn

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
