import wP from '../assets/pieces/alpha/wP.svg';
import wN from '../assets/pieces/alpha/wN.svg';
import wB from '../assets/pieces/alpha/wB.svg';
import wR from '../assets/pieces/alpha/wR.svg';
import wQ from '../assets/pieces/alpha/wQ.svg';
import wK from '../assets/pieces/alpha/wK.svg';
import bP from '../assets/pieces/alpha/bP.svg';
import bN from '../assets/pieces/alpha/bN.svg';
import bB from '../assets/pieces/alpha/bB.svg';
import bR from '../assets/pieces/alpha/bR.svg';
import bQ from '../assets/pieces/alpha/bQ.svg';
import bK from '../assets/pieces/alpha/bK.svg';

import { PieceType, PlayerColor, BoardState, PieceData } from '../types/chess';

// Create a mapping of piece types to their SVG files
export const pieceImages = {
    white: {
        pawn: wP,
        knight: wN,
        bishop: wB,
        rook: wR,
        queen: wQ,
        king: wK
    },
    black: {
        pawn: bP,
        knight: bN,
        bishop: bB,
        rook: bR,
        queen: bQ,
        king: bK
    }
} as const;

// Helper function to get the correct image for a piece
export function getPieceImage(color: PlayerColor, type: PieceType): string {
    return pieceImages[color][type];
}

export const getInitialPosition = (): BoardState => {
    // Create an 8x8 array of nulls
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Helper to place a piece
    const placePiece = (x: number, y: number, type: PieceType, color: PlayerColor) => {
        board[y][x] = {
            type,
            color,
            position: { x, y },
            hasMoved: false
        };
    };

    // Place pawns
    for (let x = 0; x < 8; x++) {
        placePiece(x, 1, 'pawn', 'black');  // Black pawns
        placePiece(x, 6, 'pawn', 'white');  // White pawns
    }

    // Place other pieces for both colors
    const pieceOrder: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    for (let x = 0; x < 8; x++) {
        placePiece(x, 0, pieceOrder[x], 'black');  // Black pieces
        placePiece(x, 7, pieceOrder[x], 'white');  // White pieces
    }

    return {
        board,
        blackKingPosition: { x: 0, y: 4 },
        whiteKingPosition: { x: 7, y: 4 }
    };
};

const pieceToNotation = {
    pawn: '',
    knight: 'N',
    bishop: 'B',
    rook: 'R',
    queen: 'Q',
    king: 'K'
};

export const getPieceNotation = (piece: PieceData): string => {
    return pieceToNotation[piece.type];
};