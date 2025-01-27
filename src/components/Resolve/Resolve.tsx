interface ResolveProps {
    resolve: string | null;
    toMove: string;
}

const Resolve: React.FC<ResolveProps> = ({ resolve, toMove }) => {
    return resolve ? <div className="text-2xl text-white mb-4 row-span-1 text-center">{resolve}</div> : <div className="m-4 text-2xl text-white mb-4 row-span-1 text-center border-2 px-4 border-yellow-500 rounded-md">{toMove} to move</div>;
}

export default Resolve;