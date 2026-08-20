import { lazy, Suspense, useState } from 'react';
import { PlayerColor } from '../../types/chess';
import BetaBadge from '../BetaBadge/BetaBadge';

const ChessGame = lazy(() => import('../ChessGame/ChessGame'));

interface GameSessionProps {
    gameId: string;
    playerColor: PlayerColor;
    opponentLabel: string | null;
    opponentIsBot: boolean;
    onLeave: () => void;
}

export function GameSession({
    gameId,
    playerColor,
    opponentLabel,
    opponentIsBot,
    onLeave,
}: GameSessionProps) {
    const [copied, setCopied] = useState(false);

    async function copyGameId() {
        try {
            await navigator.clipboard.writeText(gameId);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard access can be denied; fail silently.
        }
    }

    return (
        <div className="flex h-full w-full flex-col items-center gap-3 p-4">
            {opponentIsBot && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-400/50 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-200">
                    <BetaBadge />
                    <span>You&apos;re playing an early build of the MineChess bot.</span>
                </div>
            )}
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white/70 px-3 py-1.5 text-sm dark:border-white/15 dark:bg-white/5">
                <span className="text-gray-500 dark:text-gray-400">Game ID</span>
                <code className="font-mono font-semibold text-gray-800 dark:text-white">{gameId}</code>
                <button
                    onClick={copyGameId}
                    title="Copy game ID"
                    className="rounded-md bg-gray-800 px-2 py-1 text-xs font-semibold text-white transition hover:bg-gray-700"
                >
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <Suspense fallback={<div className="text-gray-800 dark:text-white">Loading game…</div>}>
                <ChessGame
                    gameId={gameId}
                    playerColor={playerColor}
                    opponentLabel={opponentLabel}
                    opponentIsBot={opponentIsBot}
                    handleLeaveGame={onLeave}
                />
            </Suspense>
        </div>
    );
}
