import { useEffect } from "react";

interface OpponentLeftProps {
    onExit: () => void;
}

// Shown when the server reports that the opponent disconnected. Offers an
// immediate way back to the lobby and also redirects automatically.
const OpponentLeft: React.FC<OpponentLeftProps> = ({ onExit }) => {
    useEffect(() => {
        const id = setTimeout(onExit, 6000);
        return () => clearTimeout(id);
    }, [onExit]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl dark:bg-darkest-gray">
                <h2 className="mb-2 text-xl font-bold text-gray-800 dark:text-white">Opponent left</h2>
                <p className="mb-5 text-sm text-gray-600 dark:text-gray-300">
                    Your opponent disconnected from the game. Returning to the home screen…
                </p>
                <button
                    onClick={onExit}
                    className="w-full rounded-lg bg-blue-500 py-2 font-semibold text-white transition hover:bg-blue-600"
                >
                    Back to home
                </button>
            </div>
        </div>
    );
};

export default OpponentLeft;
