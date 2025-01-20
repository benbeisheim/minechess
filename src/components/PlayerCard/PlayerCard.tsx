import { RootState } from "../../store";
import { updateClock } from "../../store/gameSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { Player } from "../../types/chess";
import Clock from "../Clock/Clock";

const PlayerCard: React.FC<{
    player: Player;
}> = ({ player }) => {
    const dispatch = useAppDispatch();
    const { toMove, resolve, moveHistory } = useAppSelector((state: RootState) => state.game);
    const timeLeft = player.timeLeft;
    const isActive = !resolve && timeLeft > 0 && toMove === player.color && moveHistory.length !== 0;

    return (
        <div className="flex-col w-full border-2 border-neutral-500">
            <div className="text-2xl font-bold text-white w-full text-center">{player.color}</div>
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
    );
};

export default PlayerCard;