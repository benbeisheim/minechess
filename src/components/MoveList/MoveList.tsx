import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { useEffect, useRef } from "react";

const MoveList: React.FC = () => {
    const moveHistory = useSelector((state: RootState) => state.game.moveHistory);
    const scrollRef = useRef<HTMLDivElement>(null);
    
    // Scroll to bottom when moves are added
    useEffect(() => {
        const scrollElement = scrollRef.current;
        if (scrollElement) {
            scrollElement.scrollTop = scrollElement.scrollHeight;
        }
    }, [moveHistory]);
    
    
    const renderMoveHistory = () => {

        return moveHistory.map((move, index) => {
            return (
                <tr key={index}>
                    <td className="text-white text-center px-2">{Math.floor(index) + 1}.</td>
                    <td className="text-white text-center px-2">{move.whitePly.notation}</td>
                    <td className="text-white text-center px-2">{move.blackPly.notation}</td>
                </tr>
            );
        });
    };

    return (
        // Single flex container that grows and handles overflow
        <div className="h-full w-full flex flex-col bg-darkest-gray">
            <div className="shrink-0">
                <table className="w-full">
                    <thead>
                        <tr>
                            <th className="text-white text-left px-2">Move</th>
                            <th className="text-white text-left px-2">White</th>
                            <th className="text-white text-left px-2">Black</th>
                        </tr>
                    </thead>
                </table>
            </div>
            {/* Direct scrollable container */}
            <div className="flex-grow overflow-y-auto w-full" ref={scrollRef}>
                <table className="w-full">
                    <tbody>
                        {renderMoveHistory()}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MoveList;