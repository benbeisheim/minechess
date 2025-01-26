import React from 'react';
import { getSquareHighlight, getTargetCross } from '../../utils/squareHighlights';
import { getLandMine } from '../../utils/landMines';

interface SquareHighlightProps {
    size: number;
    isPiece: boolean;
    isLight: boolean;
    isTemporaryMove: boolean;
    isLastMine: boolean;
}

export const SquareHighlight: React.FC<SquareHighlightProps> = ({ size, isPiece, isLight, isTemporaryMove, isLastMine }) => {
    if (isLastMine) {
        return (
            <div 
                className="absolute inset-0 flex items-center justify-center"
                style={{ width: `${size}px`, height: `${size}px` }}
            >
                <img src={getTargetCross()} alt="Target Cross" className="w-[100%] h-[100%] opacity-60" />
            </div>
        )
    }
    const highlight = isTemporaryMove ? getLandMine() : getSquareHighlight(isLight);
    return  (
        <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{ width: `${size}px`, height: `${size}px` }}
        >
            <img 
                src={highlight} 
                className={isTemporaryMove ? "w-[70%] h-[70%] " : (isPiece ? (isLight ? "w-[100%] h-[100%] " : "w-[80%] h-[80%]") : (isLight ? "w-[40%] h-[40%]" : "w-[30%] h-[30%]"))} 
            />
        </div>
    )
};