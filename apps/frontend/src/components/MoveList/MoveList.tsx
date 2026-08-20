import { useEffect, useRef } from "react";
import { useAppSelector } from "../../store/hooks";

const COLUMNS = "grid grid-cols-[2rem_1fr_1fr] gap-1 px-2";

const MoveList: React.FC = () => {
    const moveHistory = useAppSelector((state) => state.game.moveHistory);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Scroll to the newest move whenever the history grows.
    useEffect(() => {
        const scrollElement = scrollRef.current;
        if (scrollElement) {
            scrollElement.scrollTop = scrollElement.scrollHeight;
        }
    }, [moveHistory]);

    return (
        <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/20">
            <div className={`${COLUMNS} border-b border-gray-200 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-white/10 dark:text-gray-400`}>
                <span>#</span>
                <span>White</span>
                <span>Black</span>
            </div>
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
                {moveHistory.length === 0 ? (
                    <p className="px-2 py-3 text-center text-xs text-gray-400 dark:text-gray-500">No moves yet</p>
                ) : (
                    moveHistory.map((move, index) => (
                        <div
                            key={index}
                            className={`${COLUMNS} py-0.5 text-sm text-gray-700 dark:text-gray-200 ${
                                index % 2 ? "bg-black/[0.03] dark:bg-white/[0.04]" : ""
                            }`}
                        >
                            <span className="text-gray-400 dark:text-gray-500">{index + 1}.</span>
                            <span className="font-medium">{move.whitePly.notation}</span>
                            <span className="font-medium">{move.blackPly.notation}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MoveList;
