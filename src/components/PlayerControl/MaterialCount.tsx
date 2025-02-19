import React from 'react';
import { PieceData } from '../../types/chess.ts';

interface MaterialCountProps {
    capturedPieces: PieceData[];
    playerColor: "white" | "black"; // 🔥 Add playerColor prop
}

// Assign material values to each piece type
const pieceValues: Record<string, number> = {
    pawn: 1,
    knight: 3,
    bishop: 3,
    rook: 5,
    queen: 9,
    king: 0, // King has no material value
};

// Calculate material difference
const calculateMaterialAdvantage = (capturedPieces: PieceData[]) => {
    let whiteMaterial = 0;
    let blackMaterial = 0;

    capturedPieces.forEach(({ type, color }) => {
        const value = pieceValues[type] || 0;
        if (color === "white") {
            blackMaterial += value; // White lost it, so black gained material
        } else {
            whiteMaterial += value; // Black lost it, so white gained material
        }
    });

    return { whiteMaterial, blackMaterial };
};
const MaterialCount: React.FC<MaterialCountProps> = ({ capturedPieces, playerColor }) => {
    const { whiteMaterial, blackMaterial } = calculateMaterialAdvantage(capturedPieces);
    const materialDiff = whiteMaterial - blackMaterial;

    // Hide if the game hasn't started (no captures yet) or if there's no material advantage
    if (capturedPieces.length === 0 || materialDiff === 0) {
        return null;
    }

    // Only display for the player who is winning material
    if ((playerColor === "white" && materialDiff < 0) || (playerColor === "black" && materialDiff > 0)) {
        return null;
    }

    return (
        <span className="text-green-400">+{Math.abs(materialDiff)}</span>
    );
};

export default MaterialCount;