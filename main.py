"""
Root ASGI Application Entrypoint for TERRA-SENTINEL
Allows container platforms (Railway, Render, Cloud Run, Docker) and uvicorn runners
to load the primary application directly via 'main:app' or 'app:app'.
"""
import sys
import os

_root = os.path.abspath(os.path.dirname(__file__))
if _root not in sys.path:
    sys.path.insert(0, _root)

_backend = os.path.join(_root, "backend")
if _backend not in sys.path:
    sys.path.insert(0, _backend)

from backend.app.main import app

__all__ = ["app"]
