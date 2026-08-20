import React from 'react';
import { PieceData } from '../../types/chess';

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

    if (capturedPieces.length === 0) {
        return <div className="h-5 text-xs text-gray-400 dark:text-gray-600">—</div>;
    }

    return (
        <div className="flex flex-wrap items-center gap-0.5 leading-none text-gray-700 dark:text-gray-200">
            {Object.entries(groupedPieces).map(([type, { icon, count }]) =>
                count > 0 ? (
                    <span key={type} className="flex items-center">
                        {type === "pawn" && count > 1 ? (
                            <>
                                <span className="text-lg">{icon}</span>
                                <span className="text-xs">x{count}</span>
                            </>
                        ) : (
                            // Display multiple icons for other pieces
                            [...Array(count)].map((_, i) => (
                                <span key={i} className="text-lg">{icon}</span>
                            ))
                        )}
                    </span>
                ) : null
            )}
        </div>
    );
};

export default Graveyard;