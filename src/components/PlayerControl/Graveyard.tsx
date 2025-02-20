import React from 'react';
import { PieceData } from '../../types/chess.ts';

interface GraveyardProps {
    capturedPieces: PieceData[];
}

// Mapping piece types to Unicode chess characters
const pieceIcons: Record<string, { white: string; black: string }> = {
    pawn: { white: "♟", black: "♙" },
    knight: { white: "♞", black: "♘" },
    bishop: { white: "♝", black: "♗" },
    rook: { white: "♜", black: "♖" },
    queen: { white: "♛", black: "♕" },
    king: { white: "♚", black: "♔" },
};

const groupCapturedPieces = (capturedPieces: PieceData[]) => {
    const grouped: Record<string, { icon: string; count: number }> = {
        pawn: { icon: "", count: 0 },
        knight: { icon: "", count: 0 },
        bishop: { icon: "", count: 0 },
        rook: { icon: "", count: 0 },
        queen: { icon: "", count: 0 },
        king: { icon: "", count: 0 },
    };

    capturedPieces.forEach(({ type, color }) => {
        if (grouped[type]) {
            grouped[type].icon = pieceIcons[type][color]; // Store the icon
            grouped[type].count++;
        }
    });

    return grouped;
};

const Graveyard: React.FC<GraveyardProps> = ({ capturedPieces }) => {
    const groupedPieces = groupCapturedPieces(capturedPieces);

    return (
        <div className="graveyard flex flex-wrap space-x-1 justify-center dark:text-white">
            {capturedPieces.length > 0 ? (
                Object.entries(groupedPieces).map(([type, { icon, count }]) =>
                    count > 0 ? (
                        <span key={type} className="flex items-center">
                            {type === "pawn" && count > 1 ? (
                                <>
                                    <span className="text-2xl">{icon}</span>
                                    <span className="text-sm dark:text-white">x{count}</span>
                                </>
                            ) : (
                                // Display multiple icons for other pieces
                                [...Array(count)].map((_, i) => (
                                    <span key={i} className="text-2xl">{icon}</span>
                                ))
                            )}
                        </span>
                    ) : null
                )
            ) : (
                <span className="text-gray-500">No captured pieces</span>
            )}
        </div>
    );
};

export default Graveyard;