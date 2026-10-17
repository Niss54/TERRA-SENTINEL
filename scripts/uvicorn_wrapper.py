#!/usr/bin/env python3
"""
TERRA-SENTINEL Resilient Uvicorn Interceptor & Startup Sanitizer
Intercepts any broken CLI invocations (e.g. unexpanded '${PORT:-8000}' from Railway dashboard),
sanitizes environment variables and CLI arguments, and seamlessly hands off to the autonomous
self-healing supervisor (backend/run.py) or invokes uvicorn cleanly without crashing.
"""
import os
import sys
import re

def sanitize_port(raw_val: str) -> int:
    """
    Safely resolves raw port strings like '${PORT:-8000}', '$PORT', or invalid tokens
    into a guaranteed integer port.
    """
    # 1. If pure digits, return immediately
    raw_str = str(raw_val).strip()
    if raw_str.isdigit():
        return int(raw_str)

    # 2. Check if runtime environment variable PORT is set to a valid integer
    env_port = os.environ.get("PORT", "").strip()
    if env_port.isdigit():
        return int(env_port)
    elif env_port:
        digits = re.findall(r"\d+", env_port)
        if digits:
            return int(digits[0])

    # 3. Extract fallback from '${PORT:-8000}' syntax
    m = re.search(r":-(\d+)", raw_str)
    if m:
        return int(m.group(1))

    # 4. Search for any sequence of digits in raw_str
    raw_digits = re.findall(r"\d+", raw_str)
    if raw_digits:
        return int(raw_digits[0])

    # 5. Safe global fallback
    return 8000

def clean_arguments():
    """
    Inspects sys.argv and sanitizes any --port or -p arguments that contain
    shell parameter expansions or unexpanded variables.
    """
    new_argv = [sys.argv[0]]
    resolved_port = None
    i = 1
    
    while i < len(sys.argv):
        arg = sys.argv[i]
        
        if arg in ("--port", "-p"):
            if i + 1 < len(sys.argv):
                val = sys.argv[i + 1]
                port_num = sanitize_port(val)
                resolved_port = port_num
                new_argv.extend([arg, str(port_num)])
                i += 2
                continue
            else:
                port_num = sanitize_port("")
                resolved_port = port_num
                new_argv.extend([arg, str(port_num)])
                i += 1
                continue
        elif arg.startswith("--port="):
            val = arg.split("=", 1)[1]
            port_num = sanitize_port(val)
            resolved_port = port_num
            new_argv.append(f"--port={port_num}")
            i += 1
            continue
        else:
            new_argv.append(arg)
            i += 1

    # Guarantee PORT environment variable is a clean integer
    if resolved_port is not None:
        os.environ["PORT"] = str(resolved_port)
    elif "PORT" in os.environ:
        os.environ["PORT"] = str(sanitize_port(os.environ["PORT"]))
    else:
        os.environ["PORT"] = "8000"

    sys.argv = new_argv
    return resolved_port

def find_run_script():
    """Finds backend/run.py relative to current directory or script location."""
    candidates = [
        os.path.join(os.getcwd(), "backend", "run.py"),
        os.path.join(os.path.dirname(__file__), "..", "backend", "run.py"),
        os.path.join(os.path.dirname(__file__), "backend", "run.py"),
        os.path.join("/app", "backend", "run.py"),
        os.path.join(os.getcwd(), "run.py"),
    ]
    for cand in candidates:
        if os.path.isfile(cand):
            return os.path.abspath(cand)
    return None

def main():
    port = clean_arguments()
    run_script = find_run_script()
    
    print("=" * 60, flush=True)
    print(f"[TERRA-SENTINEL WRAPPER] Intercepted startup command.", flush=True)
    print(f"[TERRA-SENTINEL WRAPPER] Sanitized argv: {sys.argv}", flush=True)
    print(f"[TERRA-SENTINEL WRAPPER] Active PORT: {os.environ.get('PORT')}", flush=True)
    print("=" * 60, flush=True)

    # If backend/run.py is present, prefer handing off to the autonomous supervisor
    # which includes the self-healing loop and auxiliary port forwarders.
    if run_script and os.environ.get("USE_RAW_UVICORN", "").lower() not in ("1", "true"):
        print(f"[TERRA-SENTINEL WRAPPER] Routing to supervisor: {run_script}", flush=True)
        try:
            if hasattr(os, "execv") and os.name != "nt":
                os.execv(sys.executable, [sys.executable, run_script] + sys.argv[1:])
        except Exception:
            pass
        
        # Fallback to in-process execution via runpy
        import runpy
        sys.argv = [run_script] + sys.argv[1:]
        runpy.run_path(run_script, run_name="__main__")
        return

    # Direct uvicorn execution with clean arguments
    try:
        from uvicorn.main import main as uvicorn_main
        sys.exit(uvicorn_main())
    except Exception as exc:
        print(f"[TERRA-SENTINEL WRAPPER] Fallback invocation encountered: {exc}", file=sys.stderr, flush=True)
        if run_script:
            import runpy
            sys.argv = [run_script] + sys.argv[1:]
            runpy.run_path(run_script, run_name="__main__")
        else:
            raise

if __name__ == "__main__":
    main()
