interface ResolveProps {
    resolve: string | null;
    toMove: string;
}

const Resolve: React.FC<ResolveProps> = ({ resolve, toMove }) => {
    if (resolve) {
        return (
            <div className="rounded-xl bg-gray-800 px-4 py-2 text-center text-lg font-bold uppercase tracking-wide text-white">
                {resolve}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
            <span
                className={`h-3 w-3 rounded-full border ${
                    toMove === "white" ? "border-gray-400 bg-white" : "border-gray-600 bg-gray-900"
                }`}
            />
            <span className="capitalize">{toMove} to move</span>
        </div>
    );
};

export default Resolve;
