// src/components/TestInterface.tsx
import { useState } from 'react';
import ChessGame from '../ChessGame/ChessGame';
import { PlayerColor } from '../../types/chess';
import { createGame, joinGame } from '../../services/api';

export function TestInterface() {
    const [gameID, setGameID] = useState<string | null>(null);
    const [inputGameID, setInputGameID] = useState('');
    const [playerColor, setPlayerColor] = useState<PlayerColor>("white");

    async function handleCreateGame() {
        try {
            const createData = await createGame();
            const newGameID = createData.game_id;
            if (!newGameID) {
                throw new Error('No game ID received from server');
            }
            const joinData = await joinGame(newGameID);
            setPlayerColor(joinData.color as PlayerColor);
            setGameID(newGameID);
        } catch (err) {
            console.error(err);
        }
    }

    async function handleJoinGame(e: React.FormEvent) {
        e.preventDefault();
        try {
            const joinData = await joinGame(inputGameID);
            setPlayerColor(joinData.color as PlayerColor);
            setGameID(inputGameID);
        } catch (err) {
            console.error(err);
        }
    }

    if (gameID) {
        return (
            <div className="p-4">
                <h1 className="text-2xl mb-4 text-white border-2 border-yellow-500 rounded-md">Game ID: {gameID}</h1>
                <ChessGame
                    gameId={gameID}
                    playerColor={playerColor}
                    handleLeaveGame={() => {
                        setGameID(null);
                    }}
                />
            </div>
        );
    }
    return (
        <div className="p-4 max-w-screen-lg mx-auto">
            <h1 className="text-4xl md:text-6xl mb-4 text-white font-bold text-center">
                MineChess
            </h1>
    
            {/* Create New Private Game Section */}
            <div className="mb-6 text-center">
                <h2 className="text-lg md:text-2xl mb-3 text-amber-600">
                    Create New Private Game
                </h2>
                <button
                    onClick={handleCreateGame}
                    className="w-[40vw] max-w-xs px-[2.5vw] py-[1vw] bg-green-500 text-white rounded-md text-base md:text-lg hover:bg-green-600 transition"
                >
                    Create New Game
                </button>
            </div>
    
            {/* Join Private Game Section */}
            <div className="mb-8 text-center">
                <h2 className="text-lg md:text-2xl mb-3 text-amber-600">
                    Join Private Game
                </h2>
                <form
                    onSubmit={handleJoinGame}
                    className="flex flex-col md:flex-row justify-center items-center gap-4"
                >
                    <input
                        type="text"
                        value={inputGameID}
                        onChange={(e) => setInputGameID(e.target.value)}
                        placeholder="Enter Game ID"
                        style={{ color: 'white' }} 
                        className="w-[40vw] max-w-xs px-[2.5vw] py-[1vw] border border-white-300 rounded-md text-sm md:text-base"
                    />
                    <button
                        type="submit"
                        className="w-[40vw] max-w-xs px-[2.5vw] py-[1vw] bg-blue-500 text-white rounded-md text-base md:text-lg hover:bg-blue-600 transition"
                    >
                        Join Game
                    </button>
                </form>
            </div>
    
            {/* MineChess Rules Section */}
            <div className="mb-8 p-[4vw] bg-gray-700/75 text-white rounded-2xl shadow-lg">
                <h2 className="text-lg md:text-2xl font-bold mb-4">
                    MineChess Rules:
                </h2>
                <ol className="list-decimal list-inside space-y-3 text-sm md:text-base">
                    <li>
                        <strong>Standard Chess Rules Apply:</strong>
                        <ul className="list-disc ml-6">
                            <li>The pieces, board setup, and movement follow traditional chess rules.</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Mine Placement:</strong>
                        <ul className="list-disc ml-6 space-y-2">
                            <li>After making a move, each player can place one hidden “mine” on any unoccupied square.</li>
                            <li>Mines last for one turn (until the opponent’s next move is completed).</li>
                            <li>Mines cannot be placed on squares where either king can concurrently move.</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Mine Activation:</strong>
                        <ul className="list-disc ml-6 space-y-2">
                            <li>If a player moves a piece (except for pawns) onto a square containing a hidden mine, the piece is immediately removed from the game.</li>
                            <li>Pawns are immune to mines and can move over mined squares without triggering them.</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Mine Visibility:</strong>
                        <ul className="list-disc ml-6 space-y-2">
                            <li>Mines are hidden from the opponent until the subsequent turn.</li>
                            <li>Opponents’ prior mine placements are marked with a crosshair icon.</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Winning the Game:</strong>
                        <ul className="list-disc ml-6 space-y-2">
                            <li>The game can be won or drawn by traditional chess means: checkmate, stalemate, or time control.</li>
                            <li>
                                The game can also be won by “Bombmate,” a MineChess-specific mechanic where:
                                <ol className="list-lower-alpha pl-8 space-y-1">
                                    <li>A pinned piece moves onto a mined square.</li>
                                    <li>A piece blocks a check on a mined square.</li>
                                </ol>
                            </li>
                        </ul>
                    </li>
                </ol>
            </div>
        </div>
    );
}