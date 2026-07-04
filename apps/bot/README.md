# minechess-bot

MineChess bots built on top of [maia-2](https://github.com/CSSLab/maia2). A small
FastAPI service that the Go backend (never the browser) calls to get bot moves.

## Run

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --port 8000
```

The Go backend reaches this service at `BOT_URL` (default `http://localhost:8000`).

## Endpoints

- `POST /moves?fen=<FEN>&difficulty=<0|1|2>` → `{"move": "e2e4", "mine": "c3"}`
  The maia move (adjusted per difficulty) plus the square to mine. Difficulty maps
  to ELO: 0 → 1100, 1 → 1400, 2 → 1800.
- `GET /eval?fen=<FEN>` → `{"cp": <centipawns>}`
  Standard-chess evaluation from White's perspective, used while tuning heuristics.

## Modules

| File | Responsibility |
| --- | --- |
| `main.py` | FastAPI app + endpoints |
| `maia.py` | maia-2 model wrapper (move probabilities) |
| `bot.py` | move selection + per-difficulty bomb-risk heuristics |
| `mine.py` | mine-square selection (currently random on all difficulties) |
| `evaluation.py` | position evaluation (Stockfish, material fallback) |

## Position evaluation

`evaluation.py` uses [Stockfish](https://stockfishchess.org/) via `python-chess`'s
UCI engine interface. Set `STOCKFISH_PATH` (or put `stockfish` on `PATH`) to enable
it — e.g. `brew install stockfish`. Without an engine it falls back to a simple
material count, so the service still runs. Medium/hard move and mine heuristics will
build on these evaluations.
</content>
