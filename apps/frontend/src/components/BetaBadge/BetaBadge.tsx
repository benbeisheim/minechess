// A small "work in progress" pill. Used wherever the bot opponents surface so it is
// always clear that they are still under active development.
const BetaBadge: React.FC<{ children?: React.ReactNode; title?: string }> = ({
    children = "In development",
    title = "The MineChess bots are still being built — expect rough edges.",
}) => (
    <span
        title={title}
        className="inline-flex flex-none items-center gap-1 rounded-full border border-amber-400/60 bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300"
    >
        <span className="h-1.5 w-1.5 flex-none animate-pulse rounded-full bg-amber-500" />
        {children}
    </span>
);

export default BetaBadge;
