import { RootState } from "../../store";
import { updateClock } from "../../store/gameSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { Player } from "../../types/chess";
import Clock from "../Clock/Clock";
import Graveyard from "../PlayerControl/Graveyard";
import MaterialCount from "../PlayerControl/MaterialCount";

const PlayerCard: React.FC<{ player: Player }> = ({ player }) => {
    const dispatch = useAppDispatch();
    const toMove = useAppSelector((state: RootState) => state.game.toMove);
    const resolve = useAppSelector((state: RootState) => state.game.resolve);
    const hasMoved = useAppSelector((state: RootState) => state.game.moveHistory.length !== 0);
    const capturedPieces = useAppSelector((state: RootState) => state.game.capturedPieces);

    // The clock runs only for the side to move, once the game is under way.
    const isActive = !resolve && player.timeLeft > 0 && toMove === player.color && hasMoved;

    // Show only the opponent pieces this player has captured.
    const playerCapturedPieces = player.color === "white" ? capturedPieces.white : capturedPieces.black;

    return (
        <div
            className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 transition ${
                isActive ? "bg-emerald-500/15 ring-1 ring-emerald-400/50" : "bg-gray-100 dark:bg-white/5"
            }`}
        >
            <div className="flex min-w-0 items-center gap-2">
                <span
                    className={`h-4 w-4 flex-none rounded-full border ${
                        player.color === "white" ? "border-gray-400 bg-white" : "border-gray-600 bg-gray-900"
                    }`}
                />
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold capitalize text-gray-800 dark:text-white">
                            {player.name?.trim() || player.color}
                        </span>
                        <MaterialCount playerColor={player.color} />
                    </div>
                    <Graveyard capturedPieces={playerCapturedPieces} />
                </div>
            </div>
            <Clock
                initialTime={player.timeLeft}
                isRunning={isActive}
                onTimeUpdate={(time) =>
                    dispatch(updateClock({ timeLeft: Math.floor(time), color: player.color }))
                }
            />
        </div>
    );
};

export default PlayerCard;
