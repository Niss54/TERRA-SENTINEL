# ==============================================================================
# TERRA-SENTINEL Production Dockerfile
# Optimized for Google Cloud Run / Container Platforms / Kubernetes
# ==============================================================================

# --- Stage 1: Build Frontend Single Page App ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --silent

COPY frontend/ ./
RUN npm run build

# --- Stage 2: Production Python Runtime ---
FROM python:3.12-slim AS runner

WORKDIR /app

# Minimal OS runtime tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend /app/backend
COPY mcp_hub /app/mcp_hub
COPY scripts /app/scripts
COPY public /app/public
COPY agent_manifest.yaml /app/agent_manifest.yaml

# Copy compiled frontend assets from Stage 1 into backend static serving location
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Environment configuration
ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    ENVIRONMENT=production \
    DEBUG=false

# Expose standard Cloud Run & Web port
EXPOSE 8080 8000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

# Launch production server with Uvicorn
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 2 --timeout-keep-alive 65"]
