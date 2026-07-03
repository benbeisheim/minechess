import { RootState } from "../../store";
import { useAppSelector } from "../../store/hooks";
import MoveList from "../MoveList/MoveList";
import PlayerCard from "../PlayerCard/PlayerCard";
import BoardColor from "../BoardColor/BoardColor";
import Resolve from "../Resolve/Resolve";
import { BoardColorObj } from "../../types/chess";

interface PlayerControlProps {
    onLeaveGame?: () => void;
    onChangeColor: (selectedColor: BoardColorObj) => void;
    selectedColor: BoardColorObj;
}

const PlayerControl: React.FC<PlayerControlProps> = ({
    onLeaveGame,
    onChangeColor,
    selectedColor,
}) => {
    const players = useAppSelector((state: RootState) => state.game.players);
    const playerColor = useAppSelector((state: RootState) => state.game.playerColor);
    const resolve = useAppSelector((state: RootState) => state.game.resolve);
    const toMove = useAppSelector((state: RootState) => state.game.toMove);

    const opponentColor = playerColor === "white" ? "black" : "white";

    return (
        <div className="flex h-full flex-col gap-3 rounded-2xl border border-gray-200 bg-white/70 p-3 shadow-lg backdrop-blur dark:border-white/10 dark:bg-darkest-gray/80">
            <Resolve resolve={resolve} toMove={toMove} />

            <PlayerCard player={players[opponentColor]} />

            <div className="min-h-0 flex-1">
                <MoveList />
            </div>

            <PlayerCard player={players[playerColor]} />

            <BoardColor onChangeColor={onChangeColor} selectedColor={selectedColor} />

            <button
                className="w-full rounded-lg bg-red-500/90 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                onClick={onLeaveGame}
            >
                Leave game
            </button>
        </div>
    );
};

export default PlayerControl;
