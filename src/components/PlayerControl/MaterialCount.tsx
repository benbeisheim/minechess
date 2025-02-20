import React, { useMemo } from "react";
import { useAppSelector } from "../../store/hooks";
import { RootState } from "../../store";

// Assign material values to each piece type
const pieceValues: Record<string, number> = {
    pawn: 1,
    knight: 3,
    bishop: 3,
    rook: 5,
    queen: 9,
};

interface MaterialCountProps {
    playerColor: "white" | "black";
}

const MaterialCount: React.FC<MaterialCountProps> = ({ playerColor }) => {
    // Select boardState from Redux store with memoization
    const boardState = useAppSelector((state: RootState) => state.game.boardState);

    // Calculate material difference using useMemo for performance optimization
    const materialDiff = useMemo(() => {
        let whiteMaterial = 0;
        let blackMaterial = 0;

        // Iterate through the 2D boardState array to calculate material values
        boardState.board.forEach((row) => {
            row.forEach((square) => {
                if (square) { // Ensure there's a piece in the square
                    const { type, color } = square; // Extract piece type and color
                    const value = pieceValues[type] || 0;

                    if (color === "white") {
                        whiteMaterial += value;
                    } else {
                        blackMaterial += value;
                    }
                }
            });
        });

        return whiteMaterial - blackMaterial;
    }, [boardState]); // Recalculate only when boardState changes

    // Hide component if no material advantage
    if (materialDiff === 0) {
        return null;
    }

    // Only show the advantage for the player who is winning
    if ((playerColor === "white" && materialDiff < 0) || (playerColor === "black" && materialDiff > 0)) {
        return null;
    }

    return <span className="text-green-400">+{Math.abs(materialDiff)}</span>;
};

export default MaterialCount;