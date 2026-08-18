import { useEffect, useState } from "react";
import { RootState } from "../../store";
import { updateClock } from "../../store/gameSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { Player } from "../../types/chess";
import Clock from "../Clock/Clock";
import Graveyard from "../PlayerControl/Graveyard";
import MaterialCount from "../PlayerControl/MaterialCount";
import BetaBadge from "../BetaBadge/BetaBadge";

// An animated "..." that cycles 1→2→3 dots, used while waiting for the opponent.
const WaitingDots: React.FC = () => {
    const [count, setCount] = useState(1);
    useEffect(() => {
        const id = setInterval(() => setCount((n) => (n % 3) + 1), 400);
        return () => clearInterval(id);
    }, []);
    return <span className="inline-block w-3 text-left">{".".repeat(count)}</span>;
};

const PlayerCard: React.FC<{
    player: Player;
    label?: string;
    /** Flags a bot opponent as still under development. */
    showInDevelopmentBadge?: boolean;
}> = ({ player, label, showInDevelopmentBadge }) => {
    const dispatch = useAppDispatch();
    const toMove = useAppSelector((state: RootState) => state.game.toMove);
    const resolve = useAppSelector((state: RootState) => state.game.resolve);
    // The game is under way once both seats are filled: black is already on the
    // clock then, deciding where the opening mine goes.
    const bothPlayersSeated = useAppSelector(
        (state: RootState) => !!state.game.players.white.name && !!state.game.players.black.name,
    );
    const capturedPieces = useAppSelector((state: RootState) => state.game.capturedPieces);
    const myColor = useAppSelector((state: RootState) => state.game.playerColor);

    const isSelf = player.color === myColor;
    // The opponent's name is only populated once they have joined the game.
    const waitingForOpponent = !isSelf && !player.name?.trim();

    // The clock runs only for the side to move, once the game is under way.
    const isActive = !resolve && player.timeLeft > 0 && toMove === player.color && bothPlayersSeated;

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
                        {waitingForOpponent ? (
                            <span className="text-sm font-semibold text-gray-400 dark:text-gray-500">
                                Opponent<WaitingDots />
                            </span>
                        ) : (
                            <span className="truncate text-sm font-semibold text-gray-800 dark:text-white">
                                {isSelf ? "You" : (label ?? "Opponent")}
                            </span>
                        )}
                        <MaterialCount playerColor={player.color} />
                        {showInDevelopmentBadge && <BetaBadge>Beta</BetaBadge>}
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
