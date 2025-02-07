import { RootState } from "../../store";
import { updateClock } from "../../store/gameSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { Player, PieceData } from "../../types/chess";
import Clock from "../Clock/Clock";

const PlayerCard: React.FC<{
    player: Player;
    orientation: "top" | "bottom";
}> = ({ player, orientation }) => {
    const dispatch = useAppDispatch();
    const { toMove, resolve, moveHistory, capturedPieces } = useAppSelector((state: RootState) => state.game);
    const timeLeft = player.timeLeft;
    const isActive = !resolve && timeLeft > 0 && toMove === player.color && moveHistory.length !== 0;

    //  Show only the opponent’s pieces that the current player has captured
    const playerCapturedPieces: PieceData[] =
        player.color === "white" ? capturedPieces.black : capturedPieces.white;

    console.log(`Captured pieces for ${player.color}:`, playerCapturedPieces); // Debugging

    return (
        <div className="flex-col w-full grid grid-rows-2 justify-center items-center">
            {orientation === "top" && (
                <div className="row-span-1 font-bold text-gray-800 dark:text-white w-full text-center">
                    {player.color || "waiting for opponent..."}
                </div>
            )}

            <Clock
                initialTime={timeLeft}
                isRunning={isActive}
                onTimeUpdate={(time) => {
                    dispatch(
                        updateClock({
                            timeLeft: Math.floor(time),
                            color: player.color,
                        })
                    );
                }}
            />

            {orientation === "bottom" && (
                <div className="row-span-1 font-bold text-gray-800 dark:text-white w-full text-center">
                    {player.color || "waiting for opponent..."}
                </div>
            )}
        </div>
    );
};

export default PlayerCard;