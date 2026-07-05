FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y stockfish && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY maia2_models/ maia2_models/
COPY . .
RUN useradd app
USER app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]