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

// Difficulty maps to the bot service's ELO tiers: 0 easy, 1 medium, 2 hard.
export type BotDifficulty = 0 | 1 | 2;

export async function createBotGame(difficulty: BotDifficulty) {
    const response = await fetch(`${config.apiUrl}/api/game/bot?difficulty=${difficulty}`, {
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