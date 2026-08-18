import React, { lazy, Suspense, useState } from 'react';
import { BoardColorObj, Position, PieceData, PlayerColor, PieceType } from '../../types/chess';
import { Piece } from '../Piece/Piece';
import { SquareHighlight } from './SquareHighlight';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import PromotionChoice from '../Piece/PromotionChoice';
import { selectSquare } from '../../store/gameSlice';
import { getLandMine } from '../../utils/landMines';

// Lazily loaded so the heavy Lottie runtime stays out of the initial bundle.
const ExplosionEffect = lazy(() => import('../Explosion/Explosion'));

interface SquareProps {
    position: Position;
    piece: PieceData | null;
    isLight: boolean;
    isHighlighted: boolean;
    isSelected: boolean;
    orientation: PlayerColor;
    notation: string;
    squareSize: number;
    boardColor: BoardColorObj,
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
    const dispatch = useAppDispatch();
    const { x, y } = position;

    // Each selector returns a primitive so this square only re-renders when its
    // own state changes, rather than on every action that touches the board.
    const isPromotionSquare = useAppSelector(({ game }) => game.promotionSquare?.x === x && game.promotionSquare?.y === y);
    const isMineSquare = useAppSelector(({ game }) => game.mine?.x === x && game.mine?.y === y);
    const isLastMineSquare = useAppSelector(({ game }) => game.lastMine?.x === x && game.lastMine?.y === y);
    const isExplosionSquare = useAppSelector(({ game }) => game.explosion?.x === x && game.explosion?.y === y);
    // True while this player still owes a mine: the opening one, or the one that
    // completes their move. Mines are out of the game once a side is a lone king.
    const isPlacingMine = useAppSelector(({ game }) => game.awaitingMinePlacement);
    const toMove = useAppSelector(({ game }) => game.toMove);
    const isKingTargetSquare = useAppSelector(({ game }) =>
        game.blackKingAttackedSquares.some(square => square.x === x && square.y === y) ||
        game.whiteKingAttackedSquares.some(square => square.x === x && square.y === y)
    );

    const squareBackgroundColor = isLight ? boardColor.light : boardColor.dark;

    // Determine if this square should show labels
    const shouldShowFileLabel = orientation === 'white' ? position.y === 7 : position.y === 0;
    const shouldShowRankLabel = orientation === 'white' ? position.x === 0 : position.x === 7;
    
    // Calculate label sizes proportional to square size
    const labelSize = Math.max(squareSize * 0.2, 12); // Min size of 12px

    const [isHovered, setIsHovered] = useState(false);

    
    return (
        <div 
            className={`relative flex items-center justify-center`}
            style={{
                width: `${squareSize}px`,
                height: `${squareSize}px`,
                backgroundColor: squareBackgroundColor,
            }}
            data-square={notation}
            onClick={isPromotionSquare ? undefined : onSquareClick}
            onMouseOver={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {isHighlighted && <SquareHighlight
                size={squareSize}
                isPiece={piece !== null}
                isLight={isLight}
                isTemporaryMove={false}
                isLastMine={false}
                />}
            {isHovered && isPlacingMine && !piece && !isKingTargetSquare &&
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
            {isLastMineSquare && (orientation !== toMove || !isPlacingMine) && (
                <SquareHighlight size={squareSize} isPiece={false} isLight={isLight} isTemporaryMove={true} isLastMine={true} />
            )}
            {isPromotionSquare && ( <PromotionChoice handlePromotionClick={handlePromotionClick} orientation={orientation} /> )}
            {shouldShowFileLabel && (
                <div 
                    className={"absolute bottom-1 right-1 georgia " + (isLight ? "text-amber-800" : "text-amber-100")} 
                    style={{ fontSize: `${labelSize}px`}}
                >
                    {notation[0]} {/* First character of notation is file   */}
                </div>
            )}
            {isMineSquare && (
                <img src={getLandMine()} alt="Land Mine" className="w-[70%] h-[70%] z-10" />
            )}
            {isExplosionSquare && (
                <Suspense fallback={null}>
                    <ExplosionEffect position={position} size={squareSize}/>
                </Suspense>
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