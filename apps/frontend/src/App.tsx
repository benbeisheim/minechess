import { useState } from 'react';
import { Lobby } from './components/Lobby/Lobby';
import { GameSession } from './components/GameSession/GameSession';
import { PlayerColor } from './types/chess';
import { createGame, joinGame, createBotGame, BotDifficulty } from './services/api';

function App() {
    const [gameId, setGameId] = useState<string | null>(null);
    const [playerColor, setPlayerColor] = useState<PlayerColor>('white');
    const [opponentLabel, setOpponentLabel] = useState<string | null>(null);
    const [opponentIsBot, setOpponentIsBot] = useState(false);

    async function handleCreateGame() {
        try {
            const createData = await createGame();
            const newGameId = createData.game_id;
            if (!newGameId) {
                throw new Error('No game ID received from server');
            }
            const joinData = await joinGame(newGameId);
            setPlayerColor(joinData.color as PlayerColor);
            setOpponentLabel(null);
            setOpponentIsBot(false);
            setGameId(newGameId);
        } catch (err) {
            console.error(err);
        }
    }

    async function handleJoinGame(joinGameId: string) {
        try {
            const joinData = await joinGame(joinGameId);
            setPlayerColor(joinData.color as PlayerColor);
            setOpponentLabel(null);
            setOpponentIsBot(false);
            setGameId(joinGameId);
        } catch (err) {
            console.error(err);
        }
    }

    async function handlePlayBot(label: string, difficulty: BotDifficulty) {
        try {
            const data = await createBotGame(difficulty);
            if (!data.game_id) {
                throw new Error('No game ID received from server');
            }
            setPlayerColor(data.color as PlayerColor);
            setOpponentLabel(`Bot · ${label}`);
            setOpponentIsBot(true);
            setGameId(data.game_id);
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <div className="h-screen bg-pearl dark:bg-darker-gray overflow-hidden">
            <main className="flex justify-center items-center h-full">
                {gameId == null ? (
                    <Lobby
                        onCreateGame={handleCreateGame}
                        onJoinGame={handleJoinGame}
                        onPlayBot={handlePlayBot}
                    />
                ) : (
                    <GameSession
                        gameId={gameId}
                        playerColor={playerColor}
                        opponentLabel={opponentLabel}
                        opponentIsBot={opponentIsBot}
                        onLeave={() => setGameId(null)}
                    />
                )}
            </main>
        </div>
    );
}

export default App;
