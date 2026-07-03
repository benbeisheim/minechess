import { config } from '../config/environment';
import { getOrCreatePlayerId } from './playerIdentification';
export async function createGame() {
    const response = await fetch(`${config.apiUrl}/api/game/create`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'X-Player-ID': getOrCreatePlayerId(),
        },
    });
    return response.json();
}

export async function joinGame(gameId: string) {
    const response = await fetch(`${config.apiUrl}/api/game/join/${gameId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'X-Player-ID': getOrCreatePlayerId(),
        },
    });
    return response.json();
}

export async function joinMatchmakingQueue(): Promise<void> {
    const response = await fetch(`${config.apiUrl}/api/game/matchmaking/join`, {
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