import { selectPromotionPiece, selectSquare, setPlayerColor, setPromotionSquare } from "../../store/gameSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { PieceType, Position } from "../../types/chess";
import ChessBoard from "../ChessBoard/ChessBoard";
import PlayerControl from "../PlayerControl/PlayerControl";
import { DEFAULT_BOARD_COLOR } from "../BoardColor/BoardColor";
import { GameWebSocket } from "../../services/websocket/gameWebSocket";
import { useEffect, useState, useRef } from "react";
import { PlayerColor, BoardColorObj } from "../../types/chess";
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
    (state: RootState) => state.game.blackKingAttackedSquares,
    (state: RootState) => state.game.whiteKingAttackedSquares,
    (board, players, selectedSquare, temporaryMove, promotionPiece, legalMoves, resolve, blackKingAttackedSquares, whiteKingAttackedSquares) => ({
        board,
        players,
        selectedSquare,
        temporaryMove,
        promotionPiece,
        legalMoves,
        resolve,
        blackKingAttackedSquares,
        whiteKingAttackedSquares
    })
);

const ChessGame: React.FC<ChessGameProps> = ({ gameId, playerColor, handleLeaveGame }) => {
    const dispatch = useAppDispatch();
    const gameState = useAppSelector(selectGameState);
    const gameSocket = useRef<GameWebSocket | null>(null);
    const [selectedColor, setSelectedColor] = useState<BoardColorObj>(DEFAULT_BOARD_COLOR);

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
        if (temporaryMove && gameState.board[position.y][position.x] === null &&
            !gameState.blackKingAttackedSquares.some(square => square.x === position.x &&
                square.y === position.y) && !gameState.whiteKingAttackedSquares.some(square => square.x === position.x && square.y === position.y)) {
            gameSocket.current?.sendMove({
                from: temporaryMove.from.position,
                to: temporaryMove.to.position,
                mine: position,
                ...(promotionPiece ? { promotion: promotionPiece } : {}),
            });
        }
    };

    const handlePromotionClick = (pieceType: PieceType) => {
        dispatch(selectPromotionPiece(pieceType));
    };

    const bothPlayersPresent =
        gameState.players.black.name !== "" && gameState.players.white.name !== "";

    return (
        <div className="mx-auto flex h-[86vh] w-full max-w-[1400px] flex-col gap-4 md:flex-row md:items-stretch">
            <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
                <ChessBoard
                    selectedColor={selectedColor}
                    orientation={playerColor}
                    onSquareClick={(!gameState.resolve && bothPlayersPresent) ? onSquareClick : () => {}}
                    handlePromotionClick={handlePromotionClick}
                />
            </div>
            <aside className="w-full flex-none md:h-full md:w-[320px]">
                <PlayerControl
                    onChangeColor={setSelectedColor}
                    selectedColor={selectedColor}
                    onLeaveGame={() => {
                        handleLeaveGame();
                        gameSocket.current?.disconnect();
                    }}
                />
            </aside>
        </div>
    );
    };

export default ChessGame;