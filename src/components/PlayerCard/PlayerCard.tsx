import { RootState } from "../../store";
import { updateClock } from "../../store/gameSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { Player, PieceData } from "../../types/chess";
import Clock from "../Clock/Clock";
import Graveyard from "../PlayerControl/Graveyard";
import MaterialCount from "../PlayerControl/MaterialCount";

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
        player.color === "white" ? capturedPieces.white : capturedPieces.black;

    console.log(`Captured pieces for ${player.color}:`, playerCapturedPieces); // Debugging

    return (
        <div className="flex-col w-full grid grid-rows-3 justify-center items-center">

            {/* Opponent Player Name + Material Count */}
            {orientation === "top" && (
                <div className="row-span-1 font-bold text-gray-800 dark:text-white w-full text-center flex items-center justify-center space-x-2">
                    <span className="">{player.color || "waiting for opponent..."}</span>
                    <MaterialCount
                    
                        playerColor={player.color} // Pass the player's color
                    />
                </div>
            )}
            {orientation === "bottom" && (
                <Graveyard capturedPieces={playerCapturedPieces}/>
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

            {/* Player Name + Material Count */}
            {orientation === "bottom" && (
                <div className="row-span-1 font-bold text-gray-800 dark:text-white w-full text-center flex items-center justify-center space-x-2">
                    <span>{player.color || "waiting for opponent..."}</span>
                    <MaterialCount
                    
                        playerColor={player.color}
                    />
                </div>
            )}
            {orientation === "top" && (
                <Graveyard capturedPieces={playerCapturedPieces}/>
            )}
        </div>
    );
};

export default PlayerCard;