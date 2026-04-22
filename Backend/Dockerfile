FROM python:3.11-slim

WORKDIR /app

# System deps (for psycopg2, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1

# Entrypoint: init DB (creates tables + default users) then start the API server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]