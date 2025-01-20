import React, { useRef, useState, useEffect } from 'react';
import Square from './Square';
import { Position, PlayerColor, PieceType } from '../../types/chess';
import { useAppSelector } from '../../store/hooks';
import { RootState } from '../../store';

// The board dimensions are defined as constants to make the code more maintainable
const BOARD_SIZE = 8;
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'].reverse(); // Reversed for traditional chess board layout

interface ChessBoardProps {
    // We'll expand this interface as we add more functionality
    orientation: PlayerColor;
    onSquareClick: (position: Position) => void;
    maxSize?: number;
    padding?: number;
    handlePromotionClick: (pieceType: PieceType) => void;
}

const ChessBoard: React.FC<ChessBoardProps> = ({ 
    orientation,
    onSquareClick,
    maxSize = 1800,
    padding = 0,
    handlePromotionClick
}) => {
    // Access necessary game state via Redux
    const { boardState, selectedSquare, legalMoves } = useAppSelector((state: RootState) => ({
        boardState: state.game.boardState,
        selectedSquare: state.game.selectedSquare,
        legalMoves: state.game.legalMoves,
    }));

    const containerRef = useRef<HTMLDivElement>(null);
    const [squareSize, setSquareSize] = useState(64);

    useEffect(() => {
        const updateSize = () => {
            if (!containerRef.current) return;
            
            // Get container dimensions
            const container = containerRef.current.parentElement;
            if (!container) return;
            
            const containerWidth = container.clientWidth - (padding * 2);
            const containerHeight = container.clientHeight - (padding * 2);
            
            // Calculate the largest possible square size that fits
            const maxSquareWidth = containerWidth / 8;  // 8 squares 
            const maxSquareHeight = containerHeight / 8;
            
            // Use the smaller dimension to maintain square aspect ratio
            let newSize = Math.floor(Math.min(maxSquareWidth, maxSquareHeight));
            
            // Ensure we never set a negative or too small size
            newSize = Math.max(newSize, 20); // Minimum square size of 20px
            
            // Apply maximum size constraint
            newSize = Math.min(newSize, Math.floor(maxSize / 9));
            
            setSquareSize(newSize);
        };
    
        // Initial size calculation
        requestAnimationFrame(updateSize);
        
        // Set up resize observer
        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(updateSize);
        });
        
        if (containerRef.current?.parentElement) {
            resizeObserver.observe(containerRef.current.parentElement);
        }
        
        return () => resizeObserver.disconnect();
    }, [maxSize, padding]);
    
    // Function to determine if a square should be light or dark
    const isLightSquare = (x: number, y: number): boolean => {
        return (x + y) % 2 === 0;
    };

    // Function to create a coordinate notation for a square
    const getSquareNotation = (position: Position): string => {
        const files =  FILES;
        const ranks = RANKS;
        return orientation === 'white' ? `${files[position.x]}${ranks[position.y]}` : `${files[7 - position.x]}${ranks[7 - position.y]}`;
    };

    const isSquareHighlighted = (pos: Position): boolean => {
        return legalMoves.some(move => move.x === pos.x && move.y === pos.y);
    };


    const renderBoard = () => {
        // Create arrays of indices based on orientation
        const rankIndices = orientation === 'white' 
            ? Array.from({ length: BOARD_SIZE }, (_, i) => i)
            : Array.from({ length: BOARD_SIZE }, (_, i) => BOARD_SIZE - 1 - i);
        
        const fileIndices = orientation === 'white'
            ? Array.from({ length: BOARD_SIZE }, (_, i) => i)
            : Array.from({ length: BOARD_SIZE }, (_, i) => BOARD_SIZE - 1 - i);
    
        return rankIndices.map(rankIndex => (
            <div key={rankIndex} className="flex flex-row items-center">
                <div className="inline-flex flex-row gap-0">
                    {fileIndices.map(fileIndex => {
                        // Now the position always correctly maps to boardState
                        const position = { x: fileIndex, y: rankIndex };
                        return renderSquare(position);
                    })}
                </div>
            </div>
        ));
    };
    
    // Simplified renderSquare function - no need for coordinate transformation
    const renderSquare = (position: Position) => {
        const piece = boardState.board[position.y][position.x];
        const isSelected = selectedSquare?.x === position.x && selectedSquare?.y === position.y;
        return (
            <Square 
                key={`${position.x}-${position.y}`}
                position={position}
                piece={piece}
                isLight={isLightSquare(position.x, position.y)}
                isHighlighted={isSquareHighlighted(position)}
                isSelected={isSelected}
                notation={getSquareNotation(position)}
                squareSize={squareSize}
                orientation={orientation}
                onSquareClick={() => onSquareClick(position)}
                handlePromotionClick={handlePromotionClick}
            />
        );
    };

    return (
        <div ref={containerRef}>
            <div className="inline-flex flex-col">
                {renderBoard()}
            </div>
        </div>
    );
};

export default ChessBoard;