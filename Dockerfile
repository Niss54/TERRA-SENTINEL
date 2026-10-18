# ==============================================================================
# TERRA-SENTINEL Production Container
# Hardened for Railway, Google Cloud Run, Render, and Kubernetes
# ==============================================================================
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (curl for healthchecks, ca-certificates, gcc for C-extensions)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies globally into system site-packages
# Ensures uvicorn and all packages are always accessible in any shell/user context
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copy application directories and files
COPY backend /app/backend
COPY mcp_hub /app/mcp_hub
COPY scripts /app/scripts
COPY public /app/public
COPY agent_manifest.yaml /app/agent_manifest.yaml

# Create non-root application user and grant permissions to /app
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -m -d /app -s /bin/bash appuser && \
    chown -R appuser:appgroup /app

USER appuser

# Production environment variables
ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    ENVIRONMENT=production \
    DEBUG=false

# Expose ports for Railway and Cloud Run
EXPOSE 8000 8080

# Launch server with resilient port-binding runner
CMD ["python", "backend/run.py"]
