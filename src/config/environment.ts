// src/config/environment.ts
interface Config {
    apiUrl: string;
    wsUrl: string;
}

function getConfig(): Config {
    return {
        apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
        wsUrl: import.meta.env.VITE_WS_URL ?? 'ws://localhost:3000',
    };
}

export const config = getConfig();