# ==============================================================================
# TERRA-SENTINEL Production Hardened Multi-Stage Dockerfile
# Governance: Gravitas Reliability Runtime · Phase 20 Specification
# Invariant: ImageSize <= 250MB, Vulnerabilities = 0
# Optimized for Google Cloud Run (Serverless) / Kubernetes / Docker
# ==============================================================================

# --- Stage 1: Build Frontend Single Page App ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --silent

COPY frontend/ ./
RUN npm run build

# --- Stage 2: Production Hardened Python Runtime ---
FROM python:3.12-slim AS runner

WORKDIR /app

# Security & Package Installation (minimal footprint, clean cache)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated non-root user and group (UID/GID 10001)
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -m -s /sbin/nologin appuser

# Install python dependencies with minimal build footprint
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application directories with non-root ownership
COPY --chown=appuser:appgroup backend /app/backend
COPY --chown=appuser:appgroup mcp_hub /app/mcp_hub
COPY --chown=appuser:appgroup scripts /app/scripts
COPY --chown=appuser:appgroup public /app/public
COPY --chown=appuser:appgroup agent_manifest.yaml /app/agent_manifest.yaml

# Copy compiled frontend assets from Stage 1
COPY --from=frontend-builder --chown=appuser:appgroup /app/frontend/dist /app/frontend/dist

# Security Hardening: Switch to unprivileged non-root user
USER appuser:appgroup

# Production Environment Configuration
ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    ENVIRONMENT=production \
    DEBUG=false

# Expose standard Cloud Run & Container ports
EXPOSE 8080 8000

# Container healthcheck for sub-second container spinup verification
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

# Launch production server with robust port-aware launcher
CMD ["python", "backend/run.py"]
