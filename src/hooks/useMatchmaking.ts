// src/hooks/useMatchmaking.ts
import { MatchFoundEvent, PlayerColor } from '../types/chess';
import { useState } from 'react';
import { joinMatchmakingQueue } from '../services/api';
import { getOrCreatePlayerId } from '../services/playerIdentification';

interface MatchmakingState {
  status: 'idle' | 'queued' | 'matched';
  gameId: string | null;
  color: PlayerColor | null;
  error: string | null;
}

export function useMatchmaking() {
  const [state, setState] = useState<MatchmakingState>({
    status: 'idle',
    gameId: null,
    color: null,
    error: null,
  });

  // Cleanup function to close SSE connection
  const cleanupSSE = (eventSource: EventSource) => {
    eventSource.close();
    setState(prev => ({ ...prev, status: 'idle' }));
  };

  const joinQueue = async () => {
    try {
      // First, join the matchmaking queue via API
      console.log('joining queue');
      await joinMatchmakingQueue();
      
      const playerId = getOrCreatePlayerId();
      const eventSource = new EventSource(
          `/api/game/matchmaking/events?playerId=${encodeURIComponent(playerId)}`
      );
      
      // Listen for the match event
      eventSource.onmessage = (event) => {
        console.log('match event received, event data:', event.data);
        const data = JSON.parse(event.data) as MatchFoundEvent;
        console.log('match event data', data);
        if (data.gameId) {
          setState({
            status: 'matched',
            gameId: data.gameId,
            color: data.color,
            error: null
          });
          eventSource.close();
        }
      };

      // Handle connection errors
      eventSource.onerror = () => {
        setState(prev => ({
          ...prev,
          error: 'Lost connection to matchmaking service',
        }));
        eventSource.close();
      };

      // Update state to show we're in queue
      setState({
        status: 'queued',
        gameId: null,
        color: null,
        error: null
      });

      return () => cleanupSSE(eventSource);
    } catch (error) {
      setState({
        status: 'idle',
        gameId: null,
        color: null,
        error: error instanceof Error ? error.message : 'Failed to join queue'
      });
    }
  };

  const leaveQueue = () => {
    setState({
      status: 'idle',
      gameId: null,
      color: null,
      error: null
    });
  };

  return {
    status: state.status,
    gameId: state.gameId,
    color: state.color,
    error: state.error,
    joinQueue,
    leaveQueue
  };
}