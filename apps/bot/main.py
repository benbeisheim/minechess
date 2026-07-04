from fastapi import FastAPI
from contextlib import asynccontextmanager
import chess
import maia
import evaluation
from bot import get_move

@asynccontextmanager
async def lifespan(app: FastAPI):
    maia.initialize()
    evaluation.initialize()
    yield
    evaluation.shutdown()

app = FastAPI(lifespan=lifespan)

@app.post("/moves")
def get_move_probs(fen: str, difficulty: int):
    return get_move(fen, difficulty)

@app.get("/eval")
def eval_position(fen: str):
    # Standard-chess centipawn eval from White's perspective; used while tuning the
    # bot heuristics.
    return {"cp": evaluation.evaluate(chess.Board(fen))}
