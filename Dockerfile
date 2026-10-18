# ==============================================================================
# TERRA-SENTINEL Production Hardened Multi-Stage Dockerfile
# Governance: Gravitas Reliability Runtime · Phase 20 Specification
# Invariant: ImageSize <= 250MB, Vulnerabilities = 0
# Optimized for Railway, Google Cloud Run (Serverless), and Kubernetes
# ==============================================================================

# --- Stage 1: Build Wheels & Dependencies ---
FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# --- Stage 2: Production Hardened Python Runtime ---
FROM python:3.12-slim AS runner

WORKDIR /app

# Security & Package Installation (minimal footprint, clean cache)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated non-root application user with standard shell (UID/GID 10001)
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -m -s /bin/bash appuser

# Copy installed python dependencies from builder stage
COPY --from=builder /root/.local /home/appuser/.local

# Copy application directories with non-root ownership
COPY --chown=appuser:appgroup backend /app/backend
COPY --chown=appuser:appgroup mcp_hub /app/mcp_hub
COPY --chown=appuser:appgroup scripts /app/scripts
COPY --chown=appuser:appgroup public /app/public
COPY --chown=appuser:appgroup agent_manifest.yaml /app/agent_manifest.yaml
COPY --chown=appuser:appgroup requirements.txt /app/requirements.txt

# Security Hardening: Switch to unprivileged non-root user
USER appuser:appgroup

# Production Environment Configuration
ENV PATH=/home/appuser/.local/bin:$PATH \
    PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    ENVIRONMENT=production \
    DEBUG=false

# Expose standard Cloud Run & Railway ports
EXPOSE 8080 8000

# Container healthcheck for sub-second container spinup verification
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://127.0.0.1:${PORT:-8000}/health || exit 1

# Launch production server with robust port-aware launcher
CMD ["python", "backend/run.py"]
