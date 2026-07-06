FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y stockfish && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
ENV PATH="/usr/games:${PATH}"
RUN python -c "from maia2 import model; model.from_pretrained(type='rapid', device='cpu')"
COPY . .
RUN useradd app
USER app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]