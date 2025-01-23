// src/components/TestInterface.tsx
import { useEffect, useState } from 'react';
import  ChessGame  from '../ChessGame/ChessGame';
import { PlayerColor } from '../../types/chess';
import { createGame, joinGame } from '../../services/api';
import { useMatchmaking } from '../../hooks/useMatchmaking';
export function TestInterface() {
    const [gameID, setGameID] = useState<string | null>(null);
    const [inputGameID, setInputGameID] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>(''); // For showing operation results
    const [playerColor, setPlayerColor] = useState<PlayerColor>("white");

    const { status: matchmakingStatus, gameId: matchedGameId, color: matchedColor, error: matchmakingError, joinQueue, leaveQueue } = useMatchmaking();

    // When we get a match, join the game
    useEffect(() => {
        const handleMatch = async () => {
            if (matchedGameId) {
                console.log('matchedGameId', matchedGameId);
                try {
                    setPlayerColor(matchedColor as PlayerColor);
                    setGameID(matchedGameId);
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to join matched game');
                }
            }
        };

        handleMatch();
    }, [matchedGameId]);
    
    async function handleCreateGame() {
        try {
            setStatus('Creating game...');
            // First create the game
            const createData = await createGame();
            console.log('createData', createData);
            // Extract the game ID using the correct property name
            const newGameID = createData.game_id;
            if (!newGameID) {
                throw new Error('No game ID received from server');
            }
    
            setStatus(`Game created with ID: ${newGameID}`);
    
            // Then join it
            const joinData = await joinGame(newGameID);
            console.log('joinData', joinData);
            setPlayerColor(joinData.color as PlayerColor);
            setStatus('Successfully created and joined game');
            setGameID(newGameID);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setStatus('Operation failed');
            console.error('Error:', err);
        }
    }

    async function handleJoinGame(e: React.FormEvent) {
        e.preventDefault();
        try {
            setStatus('Joining game...');
            const joinData = await joinGame(inputGameID);
            console.log('joinData', joinData);
            setPlayerColor(joinData.color as PlayerColor);
            setStatus('Successfully joined game');
            setGameID(inputGameID);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setStatus('Operation failed');
            console.error('Error:', err);
        }
    }

    // If we're in a game, show the chess board
    if (gameID) {
        return (
            <div className="p-4">
                <h1 className="text-2xl mb-4 text-white">Game ID: {gameID}</h1>
                <ChessGame 
                    gameId={gameID} 
                    playerColor={playerColor} 
                    handleLeaveGame={() => {
                        setGameID(null);
                        setStatus('');
                    }} 
                />
            </div>
        );
    }

    return (
        <div className="p-4">
            <h1 className="text-2xl mb-4 text-white">BombChess</h1>
            
            {(error || matchmakingError) && (
                <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
                    Error: {error || matchmakingError}
                </div>
            )}
            
            {(status || matchmakingStatus === 'queued') && (
                <div className="mb-4 p-4 bg-blue-100 text-blue-700 rounded">
                    Status: {matchmakingStatus === 'queued' ? 'Waiting for opponent...' : status}
                </div>
            )}

            <div className="mb-8">
                <h2 className="text-xl mb-2 text-amber-600">Join Queue to Play with Random Opponent</h2>
                {matchmakingStatus === 'queued' ? (
                    <button 
                        onClick={leaveQueue}
                        className="px-4 py-2 bg-red-500 text-white rounded"
                    >
                        Leave Queue
                    </button>
                ) : (
                    <button 
                        onClick={joinQueue}
                        className="px-4 py-2 bg-green-500 text-white rounded"
                    >
                        Join Queue
                    </button>
                )}
            </div>

            <div className="mb-8">
                <h2 className="text-xl mb-2 text-amber-600">Create New Private Game</h2>
                <button 
                    onClick={handleCreateGame}
                    className="px-4 py-2 bg-green-500 text-white rounded"
                >
                    Create New Game
                </button>
            </div>

            <div>
                <h2 className="text-xl mb-2 text-amber-600">Join Private Game</h2>
                <form onSubmit={handleJoinGame} className="space-y-4">
                    <input
                        type="text"
                        value={inputGameID}
                        onChange={(e) => setInputGameID(e.target.value)}
                        placeholder="Enter Game ID"
                        className="px-4 py-2 border rounded"
                    />
                    <button 
                        type="submit"
                        className="px-4 py-2 bg-blue-500 text-white rounded"
                    >
                        Join Game
                    </button>
                </form>
            </div>
        </div>
    );
}