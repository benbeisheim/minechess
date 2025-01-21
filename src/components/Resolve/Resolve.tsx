interface ResolveProps {
    resolve: string | null;
}

const Resolve: React.FC<ResolveProps> = ({ resolve }) => {
    return resolve ? <div className="text-white">{resolve}</div> : null;
}

export default Resolve;