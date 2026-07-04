"""Position evaluation for the MineChess bots.

Evaluations follow *normal* chess rules (mines are ignored); they exist to inform
the medium/hard move + mine heuristics. Stockfish is required — set STOCKFISH_PATH
(or put `stockfish` on PATH) so `initialize()` can launch the engine.
"""

import os
import threading

import chess
from stockfish import Stockfish

# A checkmate is reported as this many centipawns (scaled by distance to mate).
MATE_SCORE = 100_000

_engine: Stockfish | None = None
_engine_lock = threading.Lock()  # the engine is a single subprocess; serialise access.


def initialize() -> None:
    """Launch Stockfish. Raises if the engine binary cannot be found/started."""
    global _engine
    path = os.environ.get("STOCKFISH_PATH", "stockfish")
    # turn_perspective=False keeps evaluations from White's point of view regardless
    # of whose turn it is, matching the semantics `evaluate` promises.
    _engine = Stockfish(path=path, turn_perspective=False)
    print(f"[eval] using Stockfish at '{path}'")


def shutdown() -> None:
    global _engine
    if _engine is not None:
        _engine.send_quit_command()
        _engine = None


def evaluate(board: chess.Board, depth: int = 12) -> int:
    """Centipawn score from White's perspective (positive favours White)."""
    if board.is_game_over():
        return _terminal_score(board)
    if _engine is None:
        raise RuntimeError("Stockfish engine not initialised; call initialize() first")
    with _engine_lock:
        _engine.set_depth(depth)
        _engine.set_fen_position(board.fen())
        result = _engine.get_evaluation()
    if result["type"] == "mate":
        return _mate_to_centipawns(int(result["value"]))
    return int(result["value"])


def evaluate_for(board: chess.Board, color: chess.Color, depth: int = 12) -> int:
    """Centipawn score from `color`'s perspective (positive is good for that side)."""
    score = evaluate(board, depth)
    return score if color == chess.WHITE else -score


def _mate_to_centipawns(mate_in: int) -> int:
    """Convert a "mate in N" report into a large signed centipawn score.

    Positive `mate_in` means White is mating; the closer the mate, the larger the
    magnitude. A value of 0 means mate is on the board right now.
    """
    if mate_in == 0:
        return MATE_SCORE
    sign = 1 if mate_in > 0 else -1
    return sign * (MATE_SCORE - abs(mate_in))


def _terminal_score(board: chess.Board) -> int:
    if board.is_checkmate():
        # The side to move has been mated.
        return -MATE_SCORE if board.turn == chess.WHITE else MATE_SCORE
    return 0  # stalemate or other draw
