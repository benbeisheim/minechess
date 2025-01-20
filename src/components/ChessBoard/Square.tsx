import React, { useState } from 'react';
import { Position, PieceData, PlayerColor, PieceType } from '../../types/chess';
import { Piece } from '../Piece/Piece';
import { SquareHighlight } from './SquareHighlight';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { RootState } from '../../store';
import PromotionChoice from '../Piece/PromotionChoice';
import { selectSquare } from '../../store/gameSlice';
import { getLandMine } from '../../utils/landMines';

interface SquareProps {
    position: Position;
    piece: PieceData | null;
    isLight: boolean;
    isHighlighted: boolean;
    isSelected: boolean;
    orientation: PlayerColor;
    notation: string;
    squareSize: number;
    onSquareClick?: () => void;
    handlePromotionClick: (pieceType: PieceType) => void;
}

const Square: React.FC<SquareProps> = ({
    position,
    piece,
    isLight,
    isHighlighted,
    isSelected,
    orientation,
    notation,
    squareSize,
    onSquareClick,
    handlePromotionClick
}) => {
    const { promotionSquare, mine, temporaryMove } = useAppSelector((state: RootState) => state.game);
    const dispatch = useAppDispatch();

    const isPromotionSquare = promotionSquare && promotionSquare.x === position.x && promotionSquare.y === position.y;
    // Make the color classes more specific to ensure they apply
    const baseColor = isLight ? 'bg-amber-100' : 'bg-amber-800';
    
    // Determine if this square should show labels
    const shouldShowFileLabel = orientation === 'white' ? position.y === 7 : position.y === 0;
    const shouldShowRankLabel = orientation === 'white' ? position.x === 0 : position.x === 7;
    
    // Calculate label sizes proportional to square size
    const labelSize = Math.max(squareSize * 0.2, 12); // Min size of 12px

    const [isHovered, setIsHovered] = useState(false);

    
    return (
        <div 
            className={`${baseColor}
                       relative flex items-center justify-center`}
            style={{
                width: `${squareSize}px`,
                height: `${squareSize}px`,
            }}
            data-square={notation}
            onClick={(isPromotionSquare) ? () => {return} : onSquareClick}
            onMouseOver={() => {setIsHovered(true)}}
            onMouseLeave={() => {setIsHovered(false)}}
        >
            {isHighlighted && <SquareHighlight size={squareSize} isPiece={piece !== null} isLight={isLight} isTemporaryMove={false}/>}
            {isHovered && temporaryMove && !piece && 
            <SquareHighlight size={squareSize} isPiece={false} isLight={isLight} isTemporaryMove={true} />}
            {!isPromotionSquare && piece && (
                <Piece 
                    type={piece.type}
                    color={piece.color}
                    size={squareSize}
                    isSelected={isSelected}
                    onDragStart={() => {
                        dispatch(selectSquare({position: position, playerColor: orientation}));
                    }}
                />
            )}
            {isPromotionSquare && ( <PromotionChoice handlePromotionClick={handlePromotionClick} orientation={orientation} /> )}
            {shouldShowFileLabel && (
                <div 
                    className={"absolute bottom-1 right-1 georgia " + (isLight ? "text-amber-800" : "text-amber-100")} 
                    style={{ fontSize: `${labelSize}px`}}
                >
                    {notation[0]} {/* First character of notation is file */}
                </div>
            )}
            {mine && mine.x === position.x && mine.y === position.y && (
                <img src={getLandMine()} alt="Land Mine" className="w-[70%] h-[70%]" />
            )}
            {shouldShowRankLabel && (
                <div 
                    className={"absolute top-1 left-1 georgia " + (isLight ? "text-amber-800" : "text-amber-100")}
                    style={{ fontSize: `${labelSize}px` }}
                >
                    {notation[1]} {/* Second character of notation is rank */}
                </div> 
            )}
        </div>
    );
};

export default Square;