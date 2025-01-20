import React from 'react';
import { getSquareHighlight } from '../../utils/squareHighlights';
import { getLandMine } from '../../utils/landMines';

interface SquareHighlightProps {
    size: number;
    isPiece: boolean;
    isLight: boolean;
    isTemporaryMove: boolean;
}

export const SquareHighlight: React.FC<SquareHighlightProps> = ({ size, isPiece, isLight, isTemporaryMove }) => {
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