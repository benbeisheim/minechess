import { RootState } from "../../store";
import { updateClock } from "../../store/gameSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { Player } from "../../types/chess";
import Clock from "../Clock/Clock";

const PlayerCard: React.FC<{
    player: Player;
    orientation: "top" | "bottom";
}> = ({ player, orientation }) => {
    const dispatch = useAppDispatch();
    const { toMove, resolve, moveHistory } = useAppSelector((state: RootState) => state.game);
    const timeLeft = player.timeLeft;
    const isActive = !resolve && timeLeft > 0 && toMove === player.color && moveHistory.length !== 0;

    return orientation === "top" ? (
        <div className="flex-col w-full border-2 border-neutral-500 grid grid-rows-2">
            <div className="row-span-1 font-bold text-white w-full text-center">{player.color || "waiting for opponent..."}</div>
            <Clock 
                initialTime={timeLeft}
                isRunning={isActive}
                onTimeUpdate={(time) => {
                    dispatch(updateClock({
                        timeLeft: Math.floor(time),
                        color: player.color
                    }));
                }}
            />
        </div>
    ) : (
        <div className="flex-col w-full border-2 border-neutral-500 grid grid-rows-2">
            <Clock 
                initialTime={timeLeft}
                isRunning={isActive}
                onTimeUpdate={(time) => {
                    dispatch(updateClock({
                        timeLeft: Math.floor(time),
                        color: player.color
                    }));
                }}
            />
            <div className="row-span-1 font-bold text-white w-full text-center">{player.color || "waiting for opponent..."}</div>
        </div>
    );
};

export default PlayerCard;