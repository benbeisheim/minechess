import { Position, BoardState, GameState } from "../types/chess";

export function getPseudoLegalMoves(position: Position, gameState: GameState) : Position[] {
    // Routes to specific piece movement functions based on piece type
    // Returns all moves that follow that piece's movement rules
    switch (gameState.boardState.board[position.y][position.x]?.type) {
        case 'pawn':
            return getPseudoLegalPawnMoves(position, gameState);
        case 'knight':
            return getPseudoLegalKnightMoves(position, gameState.boardState);
        case 'bishop':
            return getPseudoLegalBishopMoves(position, gameState.boardState);
        case 'rook':
            return getPseudoLegalRookMoves(position, gameState.boardState);
        case 'queen':
            return getPseudoLegalQueenMoves(position, gameState.boardState);
        case 'king':
            return getPseudoLegalKingMoves(position, gameState);
        default:
            return []
    }
}

// Individual piece movement calculators
// These consider basic movement rules and piece capture
function getPseudoLegalPawnMoves(position: Position, gameState: GameState) : Position[] {
    // Handles:
    // - Forward movement (one or two squares on first move)
    const moves = [];
    const piece = gameState.boardState.board[position.y][position.x];
    const dir = piece?.color === 'white' ? -1 : 1;
    // check first square ahead
    const ahead = { x: position.x, y: position.y + dir };
    if (gameState.boardState.board[ahead.y][ahead.x] === null) {
        moves.push(ahead);
    }
    // check second square if pawn has not moved
    if (!piece?.hasMoved) {
        if (gameState.boardState.board[ahead.y][ahead.x] === null && gameState.boardState.board[ahead.y + dir][ahead.x] === null) {
            moves.push({ x: position.x, y: position.y + 2 * dir });
        }
    }
    // - Diagonal captures
    if (position.x > 0 && gameState.boardState.board[position.y+dir][position.x - 1]?.color === (piece?.color === 'white' ? 'black' : 'white')) {
        moves.push({ x: position.x - 1, y: position.y + dir });
    }
    if (position.x < 7 && gameState.boardState.board[position.y+dir][position.x + 1]?.color === (piece?.color === 'white' ? 'black' : 'white')) {
        moves.push({ x: position.x + 1, y: position.y + dir });
    }
    // - En passant opportunities
    if (gameState.enPassantTarget) {
        if (gameState.enPassantTarget.x === position.x - 1 && gameState.enPassantTarget.y === position.y + dir) {
            moves.push(gameState.enPassantTarget);
        }
        if (gameState.enPassantTarget.x === position.x + 1 && gameState.enPassantTarget.y === position.y + dir) {
            moves.push(gameState.enPassantTarget);
        }
    }
    return moves
}

function getPseudoLegalKnightMoves(position: Position, boardState: BoardState) : Position[] {
    const piece = boardState.board[position.y][position.x];
    const moves: Position[] = [];
    const allMoves = [{x: position.x + 2, y: position.y + 1}, {x: position.x + 2, y: position.y - 1}, {x: position.x - 2, y: position.y + 1}, {x: position.x - 2, y: position.y - 1}, {x: position.x + 1, y: position.y + 2}, {x: position.x + 1, y: position.y - 2}, {x: position.x - 1, y: position.y + 2}, {x: position.x - 1, y: position.y - 2}]
    for (const move of allMoves) {
        if (boundaryCheck(move)) {
            const targetPiece = boardState.board[move.y][move.x];
            if (targetPiece === null || targetPiece.color !== piece?.color) {
                moves.push(move);
            }
        }
    }
    return moves
}

function getPseudoLegalBishopMoves(position: Position, boardState: BoardState) : Position[] {
    // Diagonal movements
    const piece = boardState.board[position.y][position.x];
    const moves: Position[] = [];
    const dirs = [{x: 1, y: 1}, {x: 1, y: -1}, {x: -1, y: 1}, {x: -1, y: -1}]
    for (const dir of dirs) {
        let x = position.x + dir.x;
        let y = position.y + dir.y;
        while (boundaryCheck({x: x, y: y})) {
            const targetPiece = boardState.board[y][x];
            if (targetPiece === null) {
                moves.push({x: x, y: y});
            } else if (targetPiece.color !== piece?.color) {
                moves.push({x: x, y: y});
                break;
            } else {
                break;
            }
            x += dir.x;
            y += dir.y;
        }
    }
    return moves
}

function getPseudoLegalRookMoves(position: Position, boardState: BoardState) : Position[] {
    // Straight line movements
    // Stops at first piece encountered in each direction
    const piece = boardState.board[position.y][position.x];
    const moves: Position[] = [];
    const dirs = [{x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}]
    for (const dir of dirs) {
        let x = position.x + dir.x;
        let y = position.y + dir.y;
        while (boundaryCheck({x: x, y: y})) {
            const targetPiece = boardState.board[y][x];
            if (targetPiece === null) {
                moves.push({x: x, y: y});
            } else if (targetPiece.color !== piece?.color) {
                moves.push({x: x, y: y});
                break;
            } else {
                break;
            }
            x += dir.x;
            y += dir.y;
        }
    }
    return moves
}

function getPseudoLegalQueenMoves(position: Position, boardState: BoardState) : Position[] {
    // Combines bishop and rook movements
    return getPseudoLegalBishopMoves(position, boardState).concat(getPseudoLegalRookMoves(position, boardState))
}

function getPseudoLegalKingMoves(position: Position, gameState: GameState) : Position[] {
    // Single square movements
    const piece = gameState.boardState.board[position.y][position.x];
    const moves: Position[] = [];
    const allMoves = [{x: position.x + 1, y: position.y}, {x: position.x - 1, y: position.y}, {x: position.x, y: position.y + 1}, {x: position.x, y: position.y - 1}, {x: position.x + 1, y: position.y + 1}, {x: position.x + 1, y: position.y - 1}, {x: position.x - 1, y: position.y + 1}, {x: position.x - 1, y: position.y - 1}]
    for (const move of allMoves) {
        if (boundaryCheck(move)) {
            const targetPiece = gameState.boardState.board[move.y][move.x];
            if (targetPiece === null || targetPiece.color !== piece?.color) {
                moves.push(move);
            }
        }
    }
    // Castling
    if (!piece?.hasMoved) {
        if (gameState.boardState.board[position.y][position.x + 3]?.hasMoved === false && 
            gameState.boardState.board[position.y][position.x + 2] === null && 
            gameState.boardState.board[position.y][position.x + 1] === null) {
            moves.push({x: position.x + 2, y: position.y});
        }
        if (gameState.boardState.board[position.y][position.x - 4]?.hasMoved === false && 
            gameState.boardState.board[position.y][position.x - 3] === null && 
            gameState.boardState.board[position.y][position.x - 2] === null && 
            gameState.boardState.board[position.y][position.x - 1] === null) {
            moves.push({x: position.x - 2, y: position.y});
        }
    }
    return moves
}

export function boundaryCheck(position: Position) : boolean {
    return position.x >= 0 && position.x < 8 && position.y >= 0 && position.y < 8;
}