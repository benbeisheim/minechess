interface ResolveProps {
    resolve: string | null;
    toMove: string;
}

const Resolve: React.FC<ResolveProps> = ({ resolve, toMove }) => {
    return resolve ? <div className="text-2xl text-white mb-4 row-span-1 text-center">{resolve}</div> : <div className="text-2xl text-white mb-4 row-span-1 text-center">{toMove} to move</div>;
}

export default Resolve;