import { config } from '../config/environment';

export async function createGame() {
    const response = await fetch(`${config.apiUrl}/api/game/create`, {
        method: 'POST',
        credentials: 'include',
    });
    return response.json();
}

export async function joinGame(gameId: string) {
    const response = await fetch(`${config.apiUrl}/api/game/join/${gameId}`, {
        method: 'POST',
        credentials: 'include',
    });
    return response.json();
}