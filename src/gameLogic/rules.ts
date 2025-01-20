import { Position, BoardState, PlayerColor, GameState, PieceData, PieceType } from "../types/chess";
import { boundaryCheck, getPseudoLegalMoves } from "./moves";

export function getLegalMoves(position: Position, gameState: GameState) : Position[] {
    // Gets pseudo-legal moves and filters out those that leave king in check
    const pseudoLegalMoves = getPseudoLegalMoves(position, gameState);
    const legalMoves = filterMovesForCheck(position, pseudoLegalMoves, gameState);
    return legalMoves
}

function filterMovesForCheck(position: Position, moves: Position[], gameState: GameState) : Position[] {
    // Tests each move by temporarily applying it and checking if it leaves king in check
    const piece = gameState.boardState.board[position.y][position.x];
    if (piece?.type === 'king') {
        let castlingMoves = moves.filter(move => move.x === position.x + 2 || move.x === position.x - 2);
        moves = moves.filter(move => move.x !== position.x + 2 && move.x !== position.x - 2);
        castlingMoves = castlingMoves.filter(move => {
            if (isKingInCheck(gameState.boardState, gameState.toMove)) {
                return false;
            }
            const changes = [{position: position, piece: gameState.boardState.board[position.y][position.x]}, {position: move, piece: gameState.boardState.board[move.y][move.x]}];
            gameState.boardState.board[position.y][position.x] = null;
            gameState.boardState.board[move.y][move.x] = changes[0].piece;
            const temp =  !isKingInCheck(gameState.boardState, gameState.toMove) && 
            !isSquareAttacked({x: move.x === position.x + 2 ? position.x + 1 : position.x - 1, y: move.y}, gameState.toMove === 'white' ? 'black' : 'white', gameState.boardState);
            gameState.boardState.board[position.y][position.x] = changes[0].piece;
            gameState.boardState.board[move.y][move.x] = changes[1].piece;
            return temp;
        });
        moves = [...moves, ...castlingMoves];
    }
    moves = moves.filter(move => {
        // record original board state
        const changes = [{position: position, piece: gameState.boardState.board[position.y][position.x]}, {position: move, piece: gameState.boardState.board[move.y][move.x]}];
        // apply move
        gameState.boardState.board[position.y][position.x] = null;
        gameState.boardState.board[move.y][move.x] = changes[0].piece;
        // if king moved, update king position
        if (changes[0].piece?.type === 'king' && changes[0].piece?.color === 'white') {
            gameState.boardState.whiteKingPosition = move;
        } else if (changes[0].piece?.type === 'king' && changes[0].piece?.color === 'black') {
            gameState.boardState.blackKingPosition = move;
        }
        const temp =  !isKingInCheck(gameState.boardState, gameState.toMove);
        // revert move
        gameState.boardState.board[position.y][position.x] = changes[0].piece;
        gameState.boardState.board[move.y][move.x] = changes[1].piece;
        // if king moved, revert king position
        if (changes[0].piece?.type === 'king' && changes[0].piece?.color === 'white') {
            gameState.boardState.whiteKingPosition = position;
        } else if (changes[0].piece?.type === 'king' && changes[0].piece?.color === 'black') {
            gameState.boardState.blackKingPosition = position;
        }
        return temp;
    });
    return moves
}

export function isKingInCheck(boardState: BoardState, color: PlayerColor) : boolean {
    // Finds king position
    // Checks if any opponent piece can capture king
    const kingPos = color === 'white' ? boardState.whiteKingPosition : boardState.blackKingPosition;
    const attackingColor = color === 'white' ? 'black' : 'white';
    return isSquareAttacked(kingPos, attackingColor, boardState);
}

function isSquareAttacked(position: Position, attackingColor: PlayerColor, boardState: BoardState) : boolean {
    // Determines if any piece of attackingColor can move to position
    // Used for both check detection and calculating attacked squares
    const rookDirs = [{x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}];
    const bishopDirs = [{x: 1, y: 1}, {x: 1, y: -1}, {x: -1, y: 1}, {x: -1, y: -1}];
    const knightDirs = [{x: 2, y: 1}, {x: 2, y: -1}, {x: -2, y: 1}, {x: -2, y: -1}, {x: 1, y: 2}, {x: 1, y: -2}, {x: -1, y: 2}, {x: -1, y: -2}];
    const kingDirs = [{x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}, {x: 1, y: 1}, {x: 1, y: -1}, {x: -1, y: 1}, {x: -1, y: -1}];
    const pawnDirs = attackingColor === 'white' ? [{x: -1, y: 1}, {x: 1, y: 1}] : [{x: -1, y: -1}, {x: 1, y: -1}];
    for (const dir of pawnDirs) {
        const targetPos = {x: position.x + dir.x, y: position.y + dir.y};
        if (boundaryCheck(targetPos)) {
            const targetPiece = boardState.board[targetPos.y][targetPos.x];
            if (targetPiece?.color === attackingColor && targetPiece?.type === 'pawn') {
                return true;
            }
        }
    }
    for (const dir of rookDirs) {
        let x = position.x + dir.x;
        let y = position.y + dir.y;
        while (boundaryCheck({x, y})) {
            const targetPiece = boardState.board[y][x];
            if (targetPiece?.color === attackingColor && (targetPiece?.type === 'rook' || targetPiece?.type === 'queen')) {
                return true;
            } else if (targetPiece !== null) {
                break;
            }
            x += dir.x;
            y += dir.y;
        }
    }
    for (const dir of bishopDirs) {
        let x = position.x + dir.x;
        let y = position.y + dir.y;
        while (boundaryCheck({x, y})) {
            const targetPiece = boardState.board[y][x];
            if (targetPiece?.color === attackingColor && (targetPiece?.type === 'bishop' || targetPiece?.type === 'queen')) {
                return true;
            } else if (targetPiece !== null) {
                break;
            }
            x += dir.x;
            y += dir.y;
        }
    }
    for (const dir of knightDirs) {
        const targetPos = {x: position.x + dir.x, y: position.y + dir.y};
        if (boundaryCheck(targetPos)) {
            const targetPiece = boardState.board[targetPos.y][targetPos.x];
            if (targetPiece?.color === attackingColor && targetPiece?.type === 'knight') {
                return true;
            }
        }
    }
    for (const dir of kingDirs) {
        const targetPos = {x: position.x + dir.x, y: position.y + dir.y};
        if (boundaryCheck(targetPos)) {
            const targetPiece = boardState.board[targetPos.y][targetPos.x];
            if (targetPiece?.color === attackingColor && targetPiece?.type === 'king') {
                return true;
            }
        }
    }
    return false
}

export function isNoLegalMoves(gameState: GameState) : boolean {
    // Determines if king is in checkmate
    // Checks if any legal moves leave king in check
    const legalMoves = [];
    for (const row of gameState.boardState.board) {
        for (const square of row) {
            const piece = square;
            if (piece?.color === gameState.toMove) {
                const moves = getLegalMoves(piece.position, gameState);
                legalMoves.push(...moves);
            }
        }
    }
    return legalMoves.length === 0;
}

export function makeTemporaryMove(board: (PieceData | null) [][], temporaryMove: {from: {position: Position, piece: PieceData | null}, to: {position: Position, piece: PieceData | null}}) : (PieceData | null) [][] {
    board[temporaryMove.to.position.y][temporaryMove.to.position.x] = board[temporaryMove.from.position.y][temporaryMove.from.position.x];
    board[temporaryMove.from.position.y][temporaryMove.from.position.x] = null;
    return board;
}

export function undoTemporaryMove(board: (PieceData | null) [][], temporaryMove: {from: {position: Position, piece: PieceData | null}, to: {position: Position, piece: PieceData | null}}) : (PieceData | null) [][] {
    board[temporaryMove.from.position.y][temporaryMove.from.position.x] = temporaryMove.from.piece;
    board[temporaryMove.to.position.y][temporaryMove.to.position.x] = temporaryMove.to.piece;
    return board;
}

export function makeTemporaryPromotionMove(board: (PieceData | null) [][], temporaryMove: {from: {position: Position, piece: PieceData | null}, to: {position: Position, piece: PieceData | null}}, promotionPiece: PieceType) : (PieceData | null) [][] {
    board[temporaryMove.to.position.y][temporaryMove.to.position.x] = {
        color: temporaryMove.from.piece?.color || 'white',
        type: promotionPiece,
        position: temporaryMove.to.position,
        hasMoved: true
    };
    board[temporaryMove.from.position.y][temporaryMove.from.position.x] = null;
    return board;
}