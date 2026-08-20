import { lazy, Suspense, useState } from 'react';
import { BotDifficulty } from '../../services/api';
import BetaBadge from '../BetaBadge/BetaBadge';

const Bombman = lazy(() => import('../Bombman/Bombman'));

const BOT_LEVELS: { label: string; difficulty: BotDifficulty }[] = [
    { label: 'Easy', difficulty: 0 },
    { label: 'Medium', difficulty: 1 },
    { label: 'Hard', difficulty: 2 },
];

interface LobbyProps {
    onCreateGame: () => void;
    onJoinGame: (gameId: string) => void;
    onPlayBot: (label: string, difficulty: BotDifficulty) => void;
}

export function Lobby({ onCreateGame, onJoinGame, onPlayBot }: LobbyProps) {
    const [inputGameId, setInputGameId] = useState('');

    function handleJoinGame(e: React.FormEvent) {
        e.preventDefault();
        onJoinGame(inputGameId);
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
                        <Suspense fallback={null}>
                            <Bombman />
                        </Suspense>
                    </div>
                </div>
            </div>
            {/* Game Controls */}
            <div className="relative z-10 mx-auto mb-3 w-full max-w-md flex-none space-y-3 px-4">
                {/* Play the computer */}
                <div className="rounded-2xl border border-gray-300 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Play the computer
                        </h2>
                        <BetaBadge />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {BOT_LEVELS.map(({ label, difficulty }) => (
                            <button
                                key={label}
                                onClick={() => onPlayBot(label, difficulty)}
                                className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600"
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        The bots are still in development — they play legal chess, but their
                        strength and mine placement are still being tuned.
                    </p>
                </div>

                {/* Play a friend */}
                <div className="rounded-2xl border border-gray-300 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Play a friend
                    </h2>
                    <button
                        onClick={onCreateGame}
                        className="mb-3 w-full rounded-md bg-green-500 px-4 py-2 font-semibold text-white transition hover:bg-green-600"
                    >
                        Create new game
                    </button>
                    <form onSubmit={handleJoinGame} className="flex gap-2">
                        <input
                            type="text"
                            value={inputGameId}
                            onChange={(e) => setInputGameId(e.target.value)}
                            placeholder="Enter Game ID"
                            className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 dark:border-white/15 dark:bg-white/10 dark:text-white"
                        />
                        <button
                            type="submit"
                            className="rounded-md bg-blue-500 px-4 py-2 font-semibold text-white transition hover:bg-blue-600"
                        >
                            Join
                        </button>
                    </form>
                </div>
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
                            <li>Black opens the game by placing a mine. White then plays the first move.</li>
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
                        <strong>Dropping the Mines:</strong>
                        <ul className="list-disc ml-6 space-y-1">
                            <li>As soon as either player has nothing left but their king, the mines are dropped.</li>
                            <li>Any armed mine is defused and the game plays on as regular chess.</li>
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
