FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libgeos-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . /app

ENV PYTHONPATH=/app \
    ENVIRONMENT=production \
    DEBUG=false

EXPOSE 8000
EXPOSE 8080

CMD ["sh", "-c", "python3 backend/run.py"]
