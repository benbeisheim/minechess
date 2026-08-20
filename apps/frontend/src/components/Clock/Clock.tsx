import { useEffect, useRef, useState } from "react";

const Clock: React.FC<{
    initialTime: number;  // Time in centiseconds (0.01s)
    isRunning: boolean;
    onTimeUpdate: (time: number) => void;
}> = ({ initialTime, isRunning, onTimeUpdate }) => {
    // Use refs to maintain state without triggering re-renders
    const timeRef = useRef(initialTime);
    const lastUpdateRef = useRef(performance.now());
    const previousUpdateRef = useRef(initialTime);  // Track last Redux update
    const frameRef = useRef<number>();
    const onTimeUpdateRef = useRef(onTimeUpdate);
    onTimeUpdateRef.current = onTimeUpdate;

    // Initialize display time from props
    const [displayTime, setDisplayTime] = useState(initialTime);
    const displayTimeRef = useRef(displayTime);
    displayTimeRef.current = displayTime;

    // Reset refs when initialTime changes
    useEffect(() => {
        timeRef.current = initialTime;
        previousUpdateRef.current = initialTime;
        setDisplayTime(initialTime);
    }, [initialTime]);

    useEffect(() => {
        if (!isRunning) {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
            return;
        }
        lastUpdateRef.current = performance.now();

        const updateClock = (currentTime: number) => {
            const elapsed = currentTime - lastUpdateRef.current;
            const decrementAmount = Math.floor(elapsed / 100);  // for deciseconds

            if (decrementAmount > 0) {
                timeRef.current -= decrementAmount;
                lastUpdateRef.current = currentTime - (elapsed % 100);

                // Update display when decisecond changes
                if (Math.floor(timeRef.current) !== Math.floor(displayTimeRef.current)) {
                    setDisplayTime(timeRef.current);

                    // Only call onTimeUpdate every second (every 10 deciseconds)
                    if (Math.floor(timeRef.current / 10) !== Math.floor(previousUpdateRef.current / 10)) {
                        onTimeUpdateRef.current(timeRef.current);
                        previousUpdateRef.current = timeRef.current;
                    }
                }
            }

            frameRef.current = requestAnimationFrame(updateClock);
        };

        frameRef.current = requestAnimationFrame(updateClock);

        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, [isRunning]);

    // Format time for display (mm:ss.d)
    const formatTime = (time: number) => {
        const minutes = Math.max(0, Math.floor(time / 600));
        const seconds = Math.max(0, Math.floor((time % 600) / 10));
        const deciseconds = Math.max(0, time % 10);  // Remainder after calculating seconds

        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${deciseconds}`;
    };

    return (
        <div className="flex-none rounded-lg bg-white px-3 py-1 font-mono text-xl font-semibold tabular-nums text-gray-800 shadow-sm dark:bg-black/30 dark:text-white">
            {formatTime(displayTime)}
        </div>
    );
};

export default Clock;
