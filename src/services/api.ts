import { config } from '../config/environment';

export async function createGame() {
    console.log('createGame fetching from config.apiUrl:', `${config.apiUrl}/api/game/create`);
    const response = await fetch(`${config.apiUrl}/api/game/create`, {
        method: 'POST',
        credentials: 'include',
    });
    console.log('createGame response', response);
    const data = await response.json();
    console.log('createGame data', data);
    return data;
}

export async function joinGame(gameId: string) {
    const response = await fetch(`${config.apiUrl}/api/game/join/${gameId}`, {
        method: 'POST',
        credentials: 'include',
    });
    console.log('joinGame response', response);
    const data = await response.json();
    console.log('joinGame data', data);
    return data;
}