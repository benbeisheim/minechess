import { RootState } from "../../store";
import { useAppSelector } from "../../store/hooks";
import MoveList from "../MoveList/MoveList";
import PlayerCard from "../PlayerCard/PlayerCard";
import Resolve from "../Resolve/Resolve";

interface PlayerControlProps {
    onResign?: () => void;
    onDrawOffer?: () => void;
    onLeaveGame?: () => void;
}

const PlayerControl: React.FC<PlayerControlProps> = ({ onResign, onDrawOffer, onLeaveGame }) => {
    const { players, playerColor, resolve, toMove } = useAppSelector((state: RootState) => state.game);
    return (
            <div className="grid grid-rows-10 h-full border-2 border-neutral-500">
                <div className="row-span-1 flex justify-center items-center">
                    <button className="py-2 bg-gray-700 hover:bg-gray-600" onClick={onLeaveGame}>Leave Game</button>
                </div>
                {<Resolve resolve={resolve} toMove={toMove} />}
                <div className="row-span-1 grid grid-cols-2 gap-2">
                    <button className="h-full col-span-1 bg-gray-700 hover:bg-gray-600" onClick={onResign}>Resign</button>
                    <button className="h-full col-span-1 bg-gray-700 hover:bg-gray-600" onClick={onDrawOffer}>Offer Draw</button>
                </div>
                <div className="row-span-1">
                    <PlayerCard player={players[playerColor === "white" ? "black" : "white"]} orientation="top" />
                </div>
                <div className="row-span-4">
                    <MoveList />
                </div>
                <div className="row-span-1">
                    <PlayerCard player={players[playerColor]} orientation="bottom" />
                </div>
            </div>
    );
};

export default PlayerControl;