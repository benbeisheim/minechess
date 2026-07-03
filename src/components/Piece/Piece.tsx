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

const selectToMove = (state: RootState) => state.game.toMove;

export const Piece: React.FC<PieceProps> = ({ type, color, size, isSelected, onDragStart }) => {
    const pieceImage = getPieceImage(color, type);
    // Track whether we're dragging and the drag offset from the piece's origin.
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const toMove = useAppSelector(selectToMove);

    const pieceRef = useRef<HTMLDivElement>(null);
    // Origin rect and start time captured once when a drag begins.
    const originRect = useRef<DOMRect | null>(null);
    const dragStart = useRef(0);

    useEffect(() => {
        if (!isDragging) return;

        // Center the piece on the cursor relative to where the drag started.
        const handleMouseMove = (e: MouseEvent) => {
            const rect = originRect.current;
            if (!rect) return;
            setPosition({
                x: e.clientX - rect.x - rect.width / 2,
                y: e.clientY - rect.y - rect.height / 2,
            });
        };

        const handleMouseUp = (e: MouseEvent) => {
            // Treat a drag longer than 150ms as a drop: click the square underneath.
            const squareElement = document
                .elementsFromPoint(e.clientX, e.clientY)
                .find(element => element.hasAttribute('data-square'));

            if (squareElement && performance.now() - dragStart.current > 150) {
                (squareElement as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
            }

            setIsDragging(false);
            setPosition({ x: 0, y: 0 });
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const handleMouseDown = () => {
        if (color !== toMove) return;
        originRect.current = pieceRef.current?.getBoundingClientRect() ?? null;
        dragStart.current = performance.now();
        onDragStart();
        setIsDragging(true);
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