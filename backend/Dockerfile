# ============================================
# Multi-stage Dockerfile for FastAPI Backend
# ============================================

# Stage 1: Base image with dependencies
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# ============================================
# Stage 2: Development image
# ============================================
FROM base as development

# Copy requirements first (for better caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run with hot reload for development
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ============================================
# Stage 3: Production image
# ============================================
FROM base as production

# Copy requirements
COPY requirements.txt .

# Install Python dependencies (without dev dependencies)
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check. urllib is in the standard library; `requests` is not installed.
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://localhost:{os.environ.get(\"PORT\", \"8000\")}/')"

# Run without reload for production.
# - PORT: hosts such as Render say which port to listen on; 8000 otherwise.
# - One worker: every worker runs the startup seed, so several racing on an
#   empty database can insert the demo data twice. One also fits in 512 MB.
# - --forwarded-allow-ips: the host's proxy terminates HTTPS and passes the
#   original scheme in X-Forwarded-Proto. Trusting it keeps redirect URLs on
#   https (an http one is blocked as mixed content). Safe only because nothing
#   but that proxy can reach the container.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --proxy-headers --forwarded-allow-ips='*'"]