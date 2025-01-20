// src/services/websocket/types.ts
// Define types for our WebSocket messages

import { AppDispatch } from "../../store";
import { updateGameState } from "../../store/gameSlice";
import { WSMove } from "../../types/chess";

export type WSMessageType = 'move' | 'gameState' | 'error';

export interface WSMessage {
    type: WSMessageType;
    payload: any;  // We could make this more specific with a union type
}

// src/services/websocket/GameWebSocket.ts
// This class manages the WebSocket connection for a specific game
export class GameWebSocket {
    private socket: WebSocket | null = null;
    private gameId: string;
    private dispatch: AppDispatch;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 3;
    private reconnectDelay: number = 1000; // Start with 1 second delay
    private isIntentionalClose: boolean = false;

    constructor(gameId: string, dispatch: AppDispatch) {
        this.gameId = gameId;
        this.dispatch = dispatch;
        this.connect();
    }

    private connect() {
        // Don't try to reconnect if we're intentionally closing
        if (this.isIntentionalClose) return;

        console.log(`Attempting to connect to game: ${this.gameId}`);
        this.socket = new WebSocket(`ws://localhost:3000/ws/game/${this.gameId}`);

        this.socket.onopen = () => {
            console.log('WebSocket connection established');
            this.reconnectAttempts = 0; // Reset attempts on successful connection
            this.reconnectDelay = 1000; // Reset delay
        };

        this.socket.onmessage = this.handleMessage.bind(this);

        this.socket.onclose = (event) => {
            console.log('WebSocket connection closed:', event);

            if (!this.isIntentionalClose) {
                this.handleReconnect();
            }
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            // Let onclose handle reconnection
        };
    }

    private handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        // Exponential backoff: increase delay with each attempt
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            this.connect();
        }, delay);
    }

    public disconnect() {
        this.isIntentionalClose = true;
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    public sendMove(move: WSMove) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'move',
                payload: move
            }));
        } else {
            console.error('WebSocket is not connected');
            // Optionally dispatch an error state
        }
    }

    private handleMessage(event: MessageEvent) {
        try {
            const message = JSON.parse(event.data);
            console.log("Received message:", message);
            
            switch (message.type) {
                case 'gameState':
                    // Update the entire game state from server
                    this.dispatch(updateGameState(message.payload));
                    break;
                    
                default:
                    console.error('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    }
}