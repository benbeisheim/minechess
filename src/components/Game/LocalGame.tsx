/*
import { useEffect } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { initializeBoard } from '../../store/gameSlice';
import ChessGame from "../ChessGame/ChessGame";

const LocalGame: React.FC = () => {
    const dispatch = useAppDispatch();

    useEffect(() => {
        // Initialize the board when component mounts
        dispatch(initializeBoard());
    }, [dispatch]);

    return (
        <ChessGame gameId={'local'} playerColor={"white"}/>
    );
};
export default LocalGame;
*/