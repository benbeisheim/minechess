import React from 'react';
import { PieceData } from '../../types/chess.ts';

interface GraveyardProps {
    capturedPieces: PieceData[];
}

// ✅ Mapping piece types to Unicode chess characters
const pieceIcons: Record<string, { white: string; black: string }> = {
    pawn: { white: "♟", black: "♙" },
    knight: { white: "♞", black: "♘" },
    bishop: { white: "♝", black: "♗" },
    rook: { white: "♜", black: "♖" },
    queen: { white: "♛", black: "♕" },
    king: { white: "♚", black: "♔" },
};

const Graveyard: React.FC<GraveyardProps> = ({ capturedPieces }) => {
    return (
        <div className="graveyard flex flex-wrap gap-1 ">
            {capturedPieces.length > 0 ? (
                capturedPieces.map((piece, index) => (
                    <span key={index} className="flex items-center space-x-1 text-2xl text-white">
                        {pieceIcons[piece.type]?.[piece.color]}
                    </span>
                ))
            ) : (
                <span className="text-gray-500">No captured pieces</span>
            )}
        </div>
    );
};

export default Graveyard;