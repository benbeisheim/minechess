import { Position, BoardState, PlayerColor, GameState, PieceData, PieceType, TemporaryMove } from "../types/chess";
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

export function makeTemporaryMove(gameState: GameState, temporaryMove: TemporaryMove) : GameState {
    gameState.boardState.board[temporaryMove.to.position.y][temporaryMove.to.position.x] = gameState.boardState.board[temporaryMove.from.position.y][temporaryMove.from.position.x];
    gameState.boardState.board[temporaryMove.from.position.y][temporaryMove.from.position.x] = null;
    if (temporaryMove.rookMove) {
        gameState.boardState.board[temporaryMove.rookMove.to.y][temporaryMove.rookMove.to.x] = gameState.boardState.board[temporaryMove.rookMove.from.y][temporaryMove.rookMove.from.x];
        gameState.boardState.board[temporaryMove.rookMove.from.y][temporaryMove.rookMove.from.x] = null;
    }
    if (temporaryMove.enPassant) {
        gameState.boardState.board[temporaryMove.enPassant.position.y][temporaryMove.enPassant.position.x] = null;
    }
    if (temporaryMove.from.piece?.type === 'king') {
        if (temporaryMove.from.piece?.color === 'white') {
            gameState.whiteKingAttackedSquares = updateKingAttackedSquares(temporaryMove.to.position);
        } else {
            gameState.blackKingAttackedSquares = updateKingAttackedSquares(temporaryMove.to.position);
        }
    }
    return gameState;
}

export function undoTemporaryMove(gameState: GameState, temporaryMove: TemporaryMove) : GameState {
    gameState.boardState.board[temporaryMove.from.position.y][temporaryMove.from.position.x] = temporaryMove.from.piece;
    gameState.boardState.board[temporaryMove.to.position.y][temporaryMove.to.position.x] = temporaryMove.to.piece;
    if (temporaryMove.rookMove) {
        gameState.boardState.board[temporaryMove.rookMove.from.y][temporaryMove.rookMove.from.x] = gameState.boardState.board[temporaryMove.rookMove.to.y][temporaryMove.rookMove.to.x];
        gameState.boardState.board[temporaryMove.rookMove.to.y][temporaryMove.rookMove.to.x] = null;
    }
    if (temporaryMove.enPassant) {
        gameState.boardState.board[temporaryMove.enPassant.position.y][temporaryMove.enPassant.position.x] = temporaryMove.enPassant.piece;
    }
    if (temporaryMove.from.piece?.type === 'king') {
        if (temporaryMove.from.piece?.color === 'white') {
            gameState.whiteKingAttackedSquares = updateKingAttackedSquares(temporaryMove.from.position);
        } else {
            gameState.blackKingAttackedSquares = updateKingAttackedSquares(temporaryMove.from.position);
        }
    }
    return gameState;
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

export function updateKingAttackedSquares(pos: Position) : Position[] {
    const kingDirs = [{x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}, {x: 1, y: 1}, {x: 1, y: -1}, {x: -1, y: 1}, {x: -1, y: -1}];
    const attackedSquares = [];
    for (const dir of kingDirs) {
        const targetPos = {x: pos.x + dir.x, y: pos.y + dir.y};
        if (boundaryCheck(targetPos)) {
            attackedSquares.push(targetPos);
        }
    }
    return attackedSquares;
}