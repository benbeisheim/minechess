interface ResolveProps {
    resolve: string | null;
}

const Resolve: React.FC<ResolveProps> = ({ resolve }) => {
    return <div>{resolve}</div>;
}

export default Resolve;