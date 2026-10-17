# ==============================================================================
# TERRA-SENTINEL Production Container
# Hardened for Railway, Google Cloud Run, Render, and Kubernetes
# ==============================================================================
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (curl for healthchecks, ca-certificates, build-essential, geos for C-extensions)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ca-certificates \
    libgeos-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies globally into system site-packages
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copy complete application repository
COPY . /app

# Install universal uvicorn interceptor to guarantee 0-crash execution on Railway custom start commands
RUN which uvicorn > /tmp/uvicorn_path.txt 2>/dev/null && \
    cp /app/scripts/uvicorn_wrapper.py $(cat /tmp/uvicorn_path.txt) || true; \
    cp /app/scripts/uvicorn_wrapper.py /usr/local/bin/uvicorn || true; \
    cp /app/scripts/uvicorn_wrapper.py /usr/bin/uvicorn || true; \
    chmod +x /app/scripts/uvicorn_wrapper.py /usr/local/bin/uvicorn /usr/bin/uvicorn || true

# Production environment variables
ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production \
    DEBUG=false

# Expose standard ports for Railway, Cloud Run, Render
EXPOSE 8000
EXPOSE 8080

# Launch server with resilient port-binding runner using shell form for dynamic environment expansion
CMD ["sh", "-c", "python3 backend/run.py"]
