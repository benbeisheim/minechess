import { RootState } from "../../store";
import { useAppSelector } from "../../store/hooks";
import MoveList from "../MoveList/MoveList";
import PlayerCard from "../PlayerCard/PlayerCard";
import Resolve from "../Resolve/Resolve";
import { useState } from "react";

interface PlayerControlProps {
    onResign?: () => void;
    onDrawOffer?: () => void;
    onLeaveGame?: () => void;
    onChangeColor: (selectedColor: string) => void;
}

const PlayerControl: React.FC<PlayerControlProps> = ({
    onLeaveGame,
    onChangeColor,
}) => {
    
    
    const { players, playerColor, resolve, toMove } = useAppSelector((state: RootState) => state.game);
    const [color, setColor] = useState("amber");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const colorDropMap: Record<string, [ string, string]> = {
        amber: ["text-amber-700", "bg-amber-500"],
        gray: ["text-gray-300", "bg-gray-500"],
        blue: ["text-cyan-500", "bg-cyan-500"],
        green: ["text-lime-500", "bg-lime-500"],
        purple: ["text-fuchsia-500", "bg-fuchsia-500"],
    };
    const handleColorChange = (selectedColor: string) => {
        console.log("handling color change", selectedColor);
        onChangeColor(selectedColor);
        setColor(selectedColor)
        setIsDropdownOpen(false);
    };

    return (
        <div className="grid grid-rows-10 h-full border-2 border-gray-800 dark:border-white rounded-md">
            {/* Top section: Resolve and "To Move" */}
            <div className="pt-4 row-span-1 flex justify-center font-bold items-center ">
                <Resolve resolve={resolve} toMove={toMove} />
            </div>

            {/* Dropdown for board color selection */}
            <div className="row-span-1 flex justify-center items-center">
                <label className="mr-1 text-sm text-gray-800 dark:text-white">Board Color:</label>
                <div className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className= {`p-1 rounded ${colorDropMap[color][1]} text-white hover:border-2`} 
                    >
                        {color} &darr;
                    </button>
                    {isDropdownOpen && (
                        <ul className="absolute mt-1 bg-gray-700 rounded shadow-lg z-10">
                            {Object.keys(colorDropMap).map((color) => (
                                <li
                                    key={colorDropMap[color][0]}
                                    onClick={() => handleColorChange(color)}
                                    className={`p-2 cursor-pointer hover:bg-${colorDropMap[color][1]} hover:text-white ${colorDropMap[color][0]}`}
                                >
                                    {color}
                                </li> 
                            ))}
                        </ul>
                    )}
                </div>
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