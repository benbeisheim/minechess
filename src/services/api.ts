import { config } from '../config/environment';
import { getOrCreatePlayerId } from './playerIdentification';
export async function createGame() {
    const playerId = getOrCreatePlayerId();
    console.log('createGame fetching from config.apiUrl:', `${config.apiUrl}/api/game/create`);
    const response = await fetch(`${config.apiUrl}/api/game/create`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'X-Player-ID': playerId,
        },
    });
    console.log('createGame response', response);
    const data = await response.json();
    console.log('createGame data', data);
    return data;
}

export async function joinGame(gameId: string) {
    const playerId = getOrCreatePlayerId();
    const response = await fetch(`${config.apiUrl}/api/game/join/${gameId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'X-Player-ID': playerId,
        },
    });
    const data = await response.json();
    return data;
}

export async function joinMatchmakingQueue(): Promise<void> {
    const response = await fetch('/api/game/matchmaking/join', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'X-Player-ID': getOrCreatePlayerId(),
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to join matchmaking queue');
    }
}