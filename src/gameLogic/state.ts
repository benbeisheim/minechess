/*
    This file contains the logic for executing a move and updating the game state.

import { BoardState, Move, Position } from "../types/chess";
import { GameState } from "../types/chess";
import { getFileNotation, getSquareNotation } from "../utils/chessBoard";
import { getPieceNotation } from "../utils/pieces";
import { isKingInCheck, isNoLegalMoves } from "./rules";

export function executeMove(from: Position, to: Position, gameState: GameState) {
    // add move to history
    const move: Move = {
        piece: gameState.boardState.board[from.y][from.x]!,
        from: from,
        to: to,
        capturedPiece: gameState.boardState.board[to.y][to.x]!,
        notation: getNotation(from, to, gameState)
    };
    // make move
    makeMove(from, to, gameState);
    // update moved pieces position
    gameState.boardState.board[to.y][to.x]!.position = {x: to.x, y: to.y};
    // if king moved, update king position
    updateKingPosition(to, gameState.boardState);
    // if en pessant target captured, remove captured piece
    handleEnPassant(to, gameState, move);
    // If king castled, update rook position and add move to history
    handleCastle(from, to, gameState, move);
    // if pawn advanced two squares, set en passant target
    if (gameState.boardState.board[to.y][to.x]?.type === 'pawn' && Math.abs(from.y - to.y) === 2) {
        gameState.enPassantTarget = {x: from.x, y: to.y + (gameState.toMove === 'white' ? 1 : -1)};
    } else {
        gameState.enPassantTarget = null;
    }
    // set moving piece to hasMoved
    gameState.boardState.board[to.y][to.x]!.hasMoved = true;
    // switch turn
    gameState.toMove = gameState.toMove === 'white' ? 'black' : 'white';
    // check if king is in check
    gameState.isCheck = isKingInCheck(gameState.boardState, gameState.toMove);
    if (gameState.isCheck) {
        move.notation += '+';
    }
    // if king is in check and no legal moves, game is over
    if (gameState.isCheck && isNoLegalMoves(gameState)) {
        move.notation = move.notation.slice(0, -1) + '#';
        gameState.resolve = 'checkmate';
    // if king is not in check and no legal moves, game is stalemate
    } else if (!gameState.isCheck && isNoLegalMoves(gameState)) {
        move.notation = move.notation.slice(0, -1) + '=';
        gameState.resolve = 'stalemate';
    }
    // add move to history
    gameState.moveHistory.push(move);
    // set selected square to null and legal moves to empty array
    gameState.selectedSquare = null;
    gameState.legalMoves = [];
}

function getNotation(from: Position, to: Position, gameState: GameState) {
    const notationPrefix = getPieceNotation(gameState.boardState.board[from.y][from.x]!);
    const notationCapture = gameState.boardState.board[to.y][to.x] ? 'x' : '';
    const notationSuffix = getSquareNotation(to);
    const pawnFileSpecifier = (gameState.boardState.board[from.y][from.x]?.type === 'pawn' && from.x !== to.x) ? getFileNotation(from.x) : '';
    return `${notationPrefix}${pawnFileSpecifier}${notationCapture}${notationSuffix}`;
}

function makeMove(from: Position, to: Position, gameState: GameState) {
    gameState.boardState.board[to.y][to.x] = gameState.boardState.board[from.y][from.x];
    gameState.boardState.board[from.y][from.x] = null;
}

function updateKingPosition(to: Position, boardState: BoardState) {
    if (boardState.board[to.y][to.x]?.type !== 'king') return;
    if (boardState.board[to.y][to.x]?.color === 'white') {
        boardState.whiteKingPosition = to;
    } else {
        boardState.blackKingPosition = to;
    }
}

function handleEnPassant(to: Position, gameState: GameState, move: Move) {
    if (gameState.enPassantTarget && gameState.enPassantTarget.x === to.x && gameState.enPassantTarget.y === to.y) {
        gameState.capturedPieces.push(gameState.boardState.board[gameState.enPassantTarget.y][gameState.enPassantTarget.x]!);
        gameState.boardState.board[gameState.enPassantTarget.y + (gameState.toMove === 'white' ? 1 : -1)][gameState.enPassantTarget.x] = null;
        move.notation = move.notation.slice(0, 1) + 'x' + move.notation.slice(1);
    }
}

function handleCastle(from: Position, to: Position, gameState: GameState, move: Move) {
    if (gameState.boardState.board[to.y][to.x]?.type === 'king' && Math.abs(from.x - to.x) === 2) {
        const rook = gameState.boardState.board[to.y][to.x === 2 ? 0 : 7];
        rook!.hasMoved = true;
        gameState.boardState.board[to.y][to.x === 2 ? 3 : 5] = gameState.boardState.board[to.y][to.x === 2 ? 0 : 7];
        gameState.boardState.board[to.y][to.x === 2 ? 0 : 7] = null;
        move.rookMove = {
            from: {x: to.x === 2 ? 0 : 7, y: to.y},
            to: {x: to.x === 2 ? 3 : 5, y: to.y}
        };
        move.notation = to.x === 2 ? 'O-O-O' : 'O-O';
    }
}
*/