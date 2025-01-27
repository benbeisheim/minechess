import { selectPromotionPiece, selectSquare, setPlayerColor, setPromotionSquare } from "../../store/gameSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { PieceType, Position } from "../../types/chess";
import ChessBoard from "../ChessBoard/ChessBoard";
import PlayerControl from "../PlayerControl/PlayerControl";
import { GameWebSocket } from "../../services/websocket/gameWebSocket";
import { useEffect, useState, useRef } from "react";
import { PlayerColor } from "../../types/chess";
import { RootState } from "../../store";
import { createSelector } from "@reduxjs/toolkit";

interface ChessGameProps {
    gameId: string;
    playerColor: PlayerColor;
    handleLeaveGame: () => void;
}

const selectGameState = createSelector(
    (state: RootState) => state.game.boardState.board,
    (state: RootState) => state.game.players,
    (state: RootState) => state.game.selectedSquare,
    (state: RootState) => state.game.temporaryMove,
    (state: RootState) => state.game.promotionPiece,
    (state: RootState) => state.game.legalMoves,
    (state: RootState) => state.game.resolve,
    (board, players, selectedSquare, temporaryMove, promotionPiece, legalMoves, resolve) => ({
        board,
        players,
        selectedSquare,
        temporaryMove,
        promotionPiece,
        legalMoves,
        resolve
    })
);

const ChessGame: React.FC<ChessGameProps> = ({ gameId, playerColor, handleLeaveGame }) => {
    const dispatch = useAppDispatch();
    const gameState = useAppSelector(selectGameState);
    const gameSocket = useRef<GameWebSocket | null>(null);
    const [selectedColor, setSelectedColor] = useState("amber"); // Default color

    useEffect(() => {
        dispatch(setPlayerColor(playerColor));
        gameSocket.current = new GameWebSocket(gameId, dispatch);
        
        return () => {
            gameSocket.current?.disconnect();
        };
    }, [gameId, dispatch]);

    const onSquareClick = (position: Position) => {
        const selectedSquare = gameState.selectedSquare;
        const temporaryMove = gameState.temporaryMove;
        const promotionPiece = gameState.promotionPiece;
        // For any move besides promotion, select the square
        if (selectedSquare && gameState.board[selectedSquare.y][selectedSquare.x]?.type === 'pawn' && 
        (position.y === 0 || position.y === 7) && 
        gameState.legalMoves.some(move => move.x === position.x && move.y === position.y)) {
            dispatch(setPromotionSquare(position));
            return;
        } else {
            dispatch(selectSquare({ position, playerColor }));
        }
        
        // If this click would result in a move, send it to the server
        if (temporaryMove && gameState.board[position.y][position.x] === null) {
            console.log("Sending move--------", temporaryMove, promotionPiece, position);
            if (promotionPiece) {
                gameSocket.current?.sendMove({
                    from: temporaryMove.from.position,
                    to: temporaryMove.to.position,
                    promotion: promotionPiece,
                    mine: position
                });
            } else {
                gameSocket.current?.sendMove({
                    from: temporaryMove.from.position,
                    to: temporaryMove.to.position,
                    mine: position
                });
            }
        }
    };

    const handlePromotionClick = (pieceType: PieceType) => {
        dispatch(selectPromotionPiece(pieceType));
    };

    return (
        <div className="h-[85vh] aspect-[4/3] grid grid-cols-4 gap-4">
            <div className="col-span-3 h-full">
                <ChessBoard
                    selectedColor = {selectedColor} 
                    orientation={playerColor} 
                    onSquareClick={(!gameState.resolve && gameState.players.black.name !== "" && gameState.players.white.name !== "") ? onSquareClick : () => {}} 
                    handlePromotionClick={handlePromotionClick} 
                />
            </div>
            <div className="col-span-1 h-full overflow-y-auto"> 
                <PlayerControl 
                    onChangeColor={(color) => {
                        setSelectedColor(color)
                    }}
                    onResign={() => {}}
                    onDrawOffer={() => {}}
                    onLeaveGame={() => {
                        handleLeaveGame();
                        gameSocket.current?.disconnect();
                    }}
                />
            </div>
        </div>
    );
    };

export default ChessGame;