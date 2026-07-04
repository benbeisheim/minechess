"""Mine placement for the bots.

For now this is simple random selection on every difficulty: drop a mine on a
random empty square that neither king can step onto, evaluated on the board *after*
the bot's move (mines are placed at the end of a turn). Medium/hard will later use
position evaluations to place mines more cleverly.
"""

import random

import chess


def select_mine(fen: str, uci_move: str) -> str | None:
    """Return an algebraic square (e.g. "e4") for the mine, or None if none exists."""
    board = chess.Board(fen)
    try:
        board.push(chess.Move.from_uci(uci_move))
    except (ValueError, AssertionError):
        # Malformed/illegal move: place the mine relative to the pre-move board.
        board = chess.Board(fen)

    # Squares a king occupies or could step onto are off-limits.
    forbidden: set[int] = set()
    for color in (chess.WHITE, chess.BLACK):
        king = board.king(color)
        if king is None:
            continue
        forbidden.add(king)
        forbidden.update(sq for sq in chess.SQUARES if chess.square_distance(king, sq) == 1)

    empty = [sq for sq in chess.SQUARES if board.piece_at(sq) is None]
    candidates = [sq for sq in empty if sq not in forbidden] or empty
    if not candidates:
        return None
    return chess.square_name(random.choice(candidates))
