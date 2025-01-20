import { RootState } from '../../store';
import { useAppSelector } from '../../store/hooks';
import { PieceType, PlayerColor } from '../../types/chess';
import { getPieceImage } from '../../utils/pieces';
import { useEffect, useRef, useState } from 'react';


interface PieceProps {
    type: PieceType;
    color: PlayerColor;
    size: number;  
    isSelected: boolean;
    onDragStart: () => void;
}

export const Piece: React.FC<PieceProps> = ({ type, color, size, isSelected, onDragStart }) => {
    const pieceImage = getPieceImage(color, type);
    // State to track if we're dragging and the current position
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const { toMove } = useAppSelector((state: RootState) => state.game);
    
    // Reference to the piece element for getting its initial position
    const pieceRef = useRef<HTMLDivElement>(null);
    const pieceRect = pieceRef.current?.getBoundingClientRect();

    const dragStart = useRef(performance.now());


    useEffect(() => {
        // Function to handle mouse movement during drag
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !pieceRef.current) return;            
            // Update position to center the piece on the cursor
            setPosition({
                x: e.clientX - pieceRect!.x - pieceRect!.width / 2,
                y: e.clientY - pieceRect!.y - pieceRect!.height / 2
            });
        };

        // Function to handle mouse up (end of drag)
        const handleMouseUp = (e: MouseEvent) => {
            if (isDragging) {
                // Find the square element under the cursor
                const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
                const squareElement = elementsAtPoint.find(element => 
                    element.hasAttribute('data-square')
                );

                // If we found a square, simulate a click on it
                if (squareElement && performance.now() - dragStart.current > 150) {
                    console.log("Clicking on square", squareElement);
                    (squareElement as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
                }

                setIsDragging(false);
                setPosition({ x: 0, y: 0 });
            }
        };

        // Add event listeners when dragging starts
        if (isDragging) {
            console.log("Adding event listeners for dragging");
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        // Clean up event listeners
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const handleMouseDown = () => {
        if (color === toMove) {
            console.log("Dragging piece");
            dragStart.current = performance.now();
            onDragStart();
            setIsDragging(true);
        }
    };

    return (
        <div 
            ref={pieceRef}
            onMouseDown={handleMouseDown}
            className="absolute inset-0 flex items-center justify-center"
            style={{
                width: `${size}px`,
                height: `${size}px`,
                // Apply transform when dragging
                transform: isDragging ? `translate(${position.x}px, ${position.y}px)` : 'none',
                // Ensure dragged piece appears above other pieces
                zIndex: isDragging ? 1000 : 1,
                // Optional: add a smooth transition when dropping
                transition: isDragging ? 'none' : 'transform 0.1s'
            }}
        >
            <img 
                src={pieceImage} 
                alt={`${color} ${type}`}
                className={(isSelected) ? 'w-[100%] h-[100%]' : 'w-[85%] h-[85%]'}
                // Prevent image dragging from interfering
                draggable={false}
            />
        </div>
    );
};