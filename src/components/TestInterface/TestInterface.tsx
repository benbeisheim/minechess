// src/components/TestInterface.tsx
import { useState } from 'react';
import ChessGame from '../ChessGame/ChessGame';
import { PlayerColor } from '../../types/chess';
import { createGame, joinGame } from '../../services/api';
import Bombman from '../../components/Bombman/Bombman';

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
                <h1 className="text-2xl mb-4 text-gray-800 dark:text-white border-2 border-yellow-500 rounded-md">Game ID: {gameID}</h1>
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
        <div className="h-screen flex flex-col py-4 overflow-hidden">
            {/* Header with Bombman walking behind */}
            <div className="relative flex-none mb-2" style={{ containerType: 'inline-size' }}>
                <h1 className="relative z-10 text-6xl md:text-7xl font-bold text-center text-gray-800 dark:text-white">
                    MineChess
                </h1>
                <div className="absolute bottom-0 inset-x-0 h-full pointer-events-none">
                    <div className="h-full aspect-square animate-walk-bounce">
                        <Bombman />
                    </div>
                </div>
            </div>
            {/* Game Controls */}
            <div className="mb-3 text-center flex-none relative z-10">
                <button
                    onClick={handleCreateGame}
                    className="w-[40vw] max-w-xs px-[2.5vw] py-[1vw] bg-green-500 text-white rounded-md text-base md:text-lg hover:bg-green-600 transition"
                >
                    Create New Game
                </button>

                <div className="flex items-center justify-center gap-4 my-3">
                    <div className="h-px w-16 bg-gray-400 dark:bg-gray-500"></div>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">or</span>
                    <div className="h-px w-16 bg-gray-400 dark:bg-gray-500"></div>
                </div>

                <form
                    onSubmit={handleJoinGame}
                    className="flex justify-center items-center gap-3"
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
            <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 bg-gray-700/75 text-white rounded-2xl shadow-lg relative z-10">
                <h2 className="text-lg md:text-2xl font-bold mb-3">
                    MineChess Rules
                </h2>
                <ol className="list-decimal list-inside space-y-2 text-sm md:text-base">
                    <li>
                        <strong>Standard Chess Rules:</strong>
                        <ul className="list-disc ml-6">
                            <li>All standard chess rules, pieces, and board setup apply.</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Mine Placement:</strong>
                        <ul className="list-disc ml-6 space-y-1">
                            <li>After each move, the player places one hidden mine on any unoccupied square.</li>
                            <li>Mines last one turn, expiring after the opponent completes their next move.</li>
                            <li>Mines cannot be placed on squares either king can currently move to.</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Mine Activation:</strong>
                        <ul className="list-disc ml-6 space-y-1">
                            <li>Any piece except a pawn that moves onto a mined square is immediately captured.</li>
                            <li>Pawns are immune to mines.</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Mine Visibility:</strong>
                        <ul className="list-disc ml-6 space-y-1">
                            <li>Mines are hidden from the opponent until they expire.</li>
                            <li>Expired mine locations are shown with a crosshair icon.</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Winning the Game:</strong>
                        <ul className="list-disc ml-6 space-y-1">
                            <li>Standard win/draw conditions apply: checkmate, stalemate, or time control.</li>
                            <li>
                                The game can also be won by Bombmate, where:
                                <ol className="list-lower-alpha pl-8 space-y-1">
                                    <li>a. A pinned piece moves onto a mined square.</li>
                                    <li>b. A piece blocks a check on a mined square.</li>
                                </ol>
                            </li>
                        </ul>
                    </li>
                </ol>
            </div>
        </div>
    );
}
