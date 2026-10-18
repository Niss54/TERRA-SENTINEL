# ==============================================================================
# TERRA-SENTINEL Production Container
# Hardened for Railway, Google Cloud Run, Render, and Kubernetes
# ==============================================================================
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (curl for healthchecks, ca-certificates, gcc, geos for C-extensions)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gcc \
    libgeos-c1v5 \
    libgeos-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies globally into system site-packages
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copy complete application repository
COPY . /app

# Production environment variables
ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    ENVIRONMENT=production \
    DEBUG=false

# Expose ports for Railway and Cloud Run
EXPOSE 8080
EXPOSE 8000


# Launch server with resilient port-binding runner
CMD ["python3", "backend/run.py"]


