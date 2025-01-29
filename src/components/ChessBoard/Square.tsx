import React, { useState } from 'react';
import { Position, PieceData, PlayerColor, PieceType } from '../../types/chess';
import { Piece } from '../Piece/Piece';
import { SquareHighlight } from './SquareHighlight';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { RootState } from '../../store';
import PromotionChoice from '../Piece/PromotionChoice';
import { selectSquare } from '../../store/gameSlice';
import { getLandMine } from '../../utils/landMines';
import { createSelector } from '@reduxjs/toolkit';
import ExplosionEffect from '../Explosion/Explosion';

interface SquareProps {
    position: Position;
    piece: PieceData | null;
    isLight: boolean;
    isHighlighted: boolean;
    isSelected: boolean;
    orientation: PlayerColor;
    notation: string;
    squareSize: number;
    boardColor: string; // Color
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
    boardColor,
    onSquareClick,
    handlePromotionClick,
}) => {

    console.log("Square received boardColor:", boardColor);

    const dispatch = useAppDispatch();
    const squareState = useAppSelector(
        createSelector(
            (state: RootState) => state.game.boardState.board[position.y][position.x],
            (state: RootState) => state.game.selectedSquare,
            (state: RootState) => state.game.legalMoves,
            (state: RootState) => state.game.promotionSquare,
            (state: RootState) => state.game.mine,
            (state: RootState) => state.game.temporaryMove,
            (state: RootState) => state.game.explosion,
            (state: RootState) => state.game.lastMine,
            (state: RootState) => state.game.toMove,
            (state: RootState) => state.game.blackKingAttackedSquares,
            (state: RootState) => state.game.whiteKingAttackedSquares,
            (piece, selectedSquare, legalMoves, promotionSquare, mine, temporaryMove, explosion, lastMine, toMove, 
                blackKingAttackedSquares, whiteKingAttackedSquares) => 
                    ({piece, selectedSquare, legalMoves, promotionSquare, mine, temporaryMove, explosion, lastMine, toMove, blackKingAttackedSquares, whiteKingAttackedSquares})
        )
    );

    const isPromotionSquare = squareState.promotionSquare && squareState.promotionSquare.x === position.x && squareState.promotionSquare.y === position.y;
    // Make the color classes more specific to ensure they apply
    const colorMap: Record<string, [string, string]> = {
        amber: ["bg-amber-100", "bg-amber-700"],
        gray: ["bg-gray-100", "bg-gray-600"],
        blue: ["bg-cyan-100", "bg-cyan-700"],
        green: ["bg-lime-100", "bg-lime-700"],
        purple: ["bg-fuchsia-100", "bg-fuchsia-700"],
    };

    const baseColor = colorMap[boardColor]
        ? isLight
            ? colorMap[boardColor][0]
            : colorMap[boardColor][1]
        : isLight
    
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
            {isHighlighted && <SquareHighlight 
                size={squareSize} 
                isPiece={piece !== null} 
                isLight={isLight} 
                isTemporaryMove={false} 
                isLastMine={false} 
                />}
            {isHovered && squareState.temporaryMove && !piece  && 
            !squareState.blackKingAttackedSquares.some(square => square.x === position.x && square.y === position.y) && 
            !squareState.whiteKingAttackedSquares.some(square => square.x === position.x && square.y === position.y) &&
            <SquareHighlight size={squareSize} isPiece={false} isLight={isLight} isTemporaryMove={true} isLastMine={false} />}
            {!isPromotionSquare && piece && (
                <Piece 
                    type={piece.type}
                    color={piece.color}
                    size={squareSize}
                    isSelected={isSelected}
                    onDragStart={() => {
                        dispatch(selectSquare({position: position, playerColor: orientation}));
                        setIsHovered(false);
                    }}
                />
            )}
            {squareState.lastMine && squareState.lastMine.x === position.x && squareState.lastMine.y === position.y && (orientation !== squareState.toMove || !squareState.temporaryMove) && (
                <SquareHighlight size={squareSize} isPiece={false} isLight={isLight} isTemporaryMove={true} isLastMine={true} />
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
            {squareState.mine && squareState.mine.x === position.x && squareState.mine.y === position.y && (
                <img src={getLandMine()} alt="Land Mine" className="w-[70%] h-[70%] z-10" />
            )}
            {squareState.explosion && squareState.explosion.x === position.x && squareState.explosion.y === position.y && (
                <ExplosionEffect position={position} size = {squareSize} />
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