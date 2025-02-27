import { RootState } from "../../store";
import { useAppSelector } from "../../store/hooks";
import MoveList from "../MoveList/MoveList";
import PlayerCard from "../PlayerCard/PlayerCard";
import BoardColor from '../BoardColor/BoardColor';
import Resolve from "../Resolve/Resolve";
import { BoardColorObj } from "../../types/chess";

interface PlayerControlProps {
    onResign?: () => void;
    onDrawOffer?: () => void;
    onLeaveGame?: () => void;
    onChangeColor: (selectedColor: BoardColorObj) => void;
    selectedColor: BoardColorObj;
}

const PlayerControl: React.FC<PlayerControlProps> = ({
    onLeaveGame,
    onChangeColor,
    selectedColor,
}) => {
    
    
    const { players, playerColor, resolve, toMove } = useAppSelector((state: RootState) => state.game);

    return (
        <div className="grid grid-rows-10 h-full border-2 border-gray-800 dark:border-white rounded-md">
            {/* Top section: Resolve and "To Move" */}
            <div className="pt-4 row-span-1 flex justify-center font-bold items-center ">
                <Resolve resolve={resolve} toMove={toMove} />
            </div>

            {/* Dropdown for board color selection */}
            <div className="row-span-1 flex justify-center items-center">
                <BoardColor onChangeColor={onChangeColor} selectedColor={selectedColor} />
            </div>
            {/* Opponent player card */}
            <div className="flex row-span-2 border-l-0 border-r-0 border-t-2 border-b-2 border-gray-800 dark:border-white">
                <PlayerCard player={players[playerColor === "white" ? "black" : "white"]} orientation="top" />
            </div>

            {/* MoveList */}
            <div className="flex row-span-3">
                <MoveList />
            </div>

            {/* Player's own card */}
            <div className="flex row-span-2 border-l-0 border-r-0 border-t-2 border-b-2 border-gray-800 dark:border-white">
                <PlayerCard player={players[playerColor]} orientation="bottom" />
            </div>


            {/* Leave Game button */}
            <div className="row-span-2 flex justify-center items-center">
                <button
                    className="py-2 px-4 bg-blue-500 text-white hover:border-2 hover:border-white rounded"
                    onClick={onLeaveGame}
                >
                    Leave Game
                </button>
            </div>
        </div>
    );
};

export default PlayerControl;