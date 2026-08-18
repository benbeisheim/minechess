import { PieceData, PlayerColor, Position } from '../types/chess';

type Board = (PieceData | null)[][];

/**
 * The mine mechanic is dropped as soon as either player has nothing left but their
 * king, and the game plays on as regular chess from there. The server applies the
 * same rule, so the two have to agree on when a move carries a mine.
 */
export function minesActive(board: Board): boolean {
    const { white, black } = countNonKingPieces(board);
    return white > 0 && black > 0;
}

/**
 * minesActive for the position the given move leads to, which is what decides
 * whether the move has to be followed by a mine placement. A capture is the only way
 * a move itself can reduce a side to a lone king; a mine it happens to set off is
 * hidden from us, and the server settles that case when it applies the move.
 */
export function minesActiveAfterMove(
    board: Board,
    from: Position,
    to: Position,
    enPassantTarget: Position | null,
): boolean {
    const counts = countNonKingPieces(board);
    const remove = (color: PlayerColor) => { counts[color] -= 1; };

    const captured = board[to.y][to.x];
    if (captured && captured.type !== 'king') {
        remove(captured.color);
    }
    const piece = board[from.y][from.x];
    if (piece?.type === 'pawn' && enPassantTarget && to.x === enPassantTarget.x && to.y === enPassantTarget.y) {
        remove(piece.color === 'white' ? 'black' : 'white');
    }

    return counts.white > 0 && counts.black > 0;
}

/** A mine may only go on an empty square that neither king can step onto. */
export function isLegalMineSquare(
    board: Board,
    whiteKingAttackedSquares: Position[],
    blackKingAttackedSquares: Position[],
    position: Position,
): boolean {
    if (board[position.y][position.x]) {
        return false;
    }
    const covers = (squares: Position[]) =>
        squares.some(square => square.x === position.x && square.y === position.y);
    return !covers(whiteKingAttackedSquares) && !covers(blackKingAttackedSquares);
}

function countNonKingPieces(board: Board): Record<PlayerColor, number> {
    const counts: Record<PlayerColor, number> = { white: 0, black: 0 };
    for (const row of board) {
        for (const piece of row) {
            if (piece && piece.type !== 'king') {
                counts[piece.color] += 1;
            }
        }
    }
    return counts;
}
