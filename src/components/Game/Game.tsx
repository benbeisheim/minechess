// src/components/Game.tsx
import { useEffect, useState } from 'react';
import ChessGame from '../ChessGame/ChessGame';

interface GameResponse {
    game_id: string;
    message: string;
}

export function Game() {
    const [gameID, setGameID] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // When the component mounts, create a new game on the server
        async function createGame() {
            try {
                const response = await fetch('http://localhost:3000/api/game/create', {
                    method: 'POST',
                });

                if (!response.ok) {
                    throw new Error('Failed to create game');
                }

                const data: GameResponse = await response.json();
                setGameID(data.game_id);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to create game');
                console.error('Error creating game:', err);
            }
        }

        createGame();
    }, []); // Empty dependency array means this runs once when component mounts

    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!gameID) {
        return <div>Creating game...</div>;
    }

    // Once we have a gameID, render the ChessGame component
    return <ChessGame gameId={gameID} playerColor={"white"}/>;
}

export default Game;