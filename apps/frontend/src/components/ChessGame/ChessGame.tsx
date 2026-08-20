import { initializeBoard, selectPromotionPiece, selectSquare, setOpponentLeft, setPlayerColor, setPromotionSquare } from "../../store/gameSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { PieceType, Position } from "../../types/chess";
import ChessBoard from "../ChessBoard/ChessBoard";
import PlayerControl from "../PlayerControl/PlayerControl";
import OpponentLeft from "../OpponentLeft/OpponentLeft";
import { DEFAULT_BOARD_COLOR } from "../BoardColor/BoardColor";
import { GameWebSocket } from "../../services/websocket/gameWebSocket";
import { useEffect, useState, useRef } from "react";
import { PlayerColor, BoardColorObj } from "../../types/chess";
import { RootState } from "../../store";
import { createSelector } from "@reduxjs/toolkit";
import { isLegalMineSquare, minesActiveAfterMove } from "../../gameLogic/mines";

interface ChessGameProps {
    gameId: string;
    playerColor: PlayerColor;
    handleLeaveGame: () => void;
    opponentLabel?: string | null;
    /** True when the opponent is one of the (still in-development) bots. */
    opponentIsBot?: boolean;
}

const selectGameState = createSelector(
    (state: RootState) => state.game.boardState.board,
    (state: RootState) => state.game.players,
    (state: RootState) => state.game.selectedSquare,
    (state: RootState) => state.game.temporaryMove,
    (state: RootState) => state.game.promotionPiece,
    (state: RootState) => state.game.promotionSquare,
    (state: RootState) => state.game.legalMoves,
    (state: RootState) => state.game.resolve,
    (state: RootState) => state.game.blackKingAttackedSquares,
    (state: RootState) => state.game.whiteKingAttackedSquares,
    (state: RootState) => state.game.enPassantTarget,
    (state: RootState) => state.game.awaitingInitialMine,
    (state: RootState) => state.game.awaitingMinePlacement,
    (board, players, selectedSquare, temporaryMove, promotionPiece, promotionSquare, legalMoves, resolve, blackKingAttackedSquares, whiteKingAttackedSquares, enPassantTarget, awaitingInitialMine, awaitingMinePlacement) => ({
        board,
        players,
        selectedSquare,
        temporaryMove,
        promotionPiece,
        promotionSquare,
        legalMoves,
        resolve,
        blackKingAttackedSquares,
        whiteKingAttackedSquares,
        enPassantTarget,
        awaitingInitialMine,
        awaitingMinePlacement
    })
);

const ChessGame: React.FC<ChessGameProps> = ({ gameId, playerColor, handleLeaveGame, opponentLabel, opponentIsBot }) => {
    const dispatch = useAppDispatch();
    const gameState = useAppSelector(selectGameState);
    const opponentLeft = useAppSelector((state: RootState) => state.game.opponentLeft);
    const gameSocket = useRef<GameWebSocket | null>(null);
    const [selectedColor, setSelectedColor] = useState<BoardColorObj>(DEFAULT_BOARD_COLOR);

    useEffect(() => {
        dispatch(initializeBoard());
        dispatch(setPlayerColor(playerColor));
        dispatch(setOpponentLeft(false)); // clear any stale flag from a previous game
        gameSocket.current = new GameWebSocket(gameId, dispatch);

        return () => {
            gameSocket.current?.disconnect();
        };
    }, [gameId, dispatch]);

    const leaveGame = () => {
        gameSocket.current?.disconnect();
        handleLeaveGame();
    };

    // The board this click is read against is the one on screen, so it already has
    // any temporary move applied — which is exactly the board a mine is placed on.
    const isMineSquare = (position: Position) =>
        isLegalMineSquare(gameState.board, gameState.whiteKingAttackedSquares, gameState.blackKingAttackedSquares, position);

    const onSquareClick = (position: Position) => {
        const { selectedSquare, temporaryMove, promotionPiece, legalMoves, enPassantTarget } = gameState;

        // The game opens with black arming a mine, before white's first move. No
        // piece is involved, so this click is a placement and nothing else.
        if (gameState.awaitingInitialMine) {
            if (playerColor === 'black' && isMineSquare(position)) {
                dispatch(selectSquare({ position, playerColor }));
                gameSocket.current?.placeMine(position);
            }
            return;
        }

        // For any move besides promotion, select the square
        if (selectedSquare && gameState.board[selectedSquare.y][selectedSquare.x]?.type === 'pawn' && 
        (position.y === 0 || position.y === 7) && 
        gameState.legalMoves.some(move => move.x === position.x && move.y === position.y)) {
            dispatch(setPromotionSquare(position));
            return;
        } else {
            dispatch(selectSquare({ position, playerColor }));
        }

        // If this click would result in a move, send it to the server. It completes
        // the move either by dropping the mine that goes with it, or — once mines
        // have left the game — by being the destination of the move itself.
        if (gameState.awaitingMinePlacement && temporaryMove && isMineSquare(position)) {
            gameSocket.current?.sendMove({
                from: temporaryMove.from.position,
                to: temporaryMove.to.position,
                mine: position,
                ...(promotionPiece ? { promotion: promotionPiece } : {}),
            });
        } else if (selectedSquare && legalMoves.some(move => move.x === position.x && move.y === position.y) &&
            !minesActiveAfterMove(gameState.board, selectedSquare, position, enPassantTarget)) {
            gameSocket.current?.sendMove({ from: selectedSquare, to: position });
        }
    };

    const handlePromotionClick = (pieceType: PieceType) => {
        const { selectedSquare, promotionSquare, enPassantTarget } = gameState;
        dispatch(selectPromotionPiece(pieceType));

        // With mines out of the game the promotion choice is what completes the move;
        // otherwise it is sent once the mine is placed.
        if (selectedSquare && promotionSquare &&
            !minesActiveAfterMove(gameState.board, selectedSquare, promotionSquare, enPassantTarget)) {
            gameSocket.current?.sendMove({ from: selectedSquare, to: promotionSquare, promotion: pieceType });
        }
    };

    const bothPlayersPresent =
        gameState.players.black.name !== "" && gameState.players.white.name !== "";

    return (
        <div className="mx-auto flex h-[86vh] flex-col items-center gap-4 md:flex-row md:items-stretch">
            {opponentLeft && <OpponentLeft onExit={leaveGame} />}
            {/* Board wrapper is a square sized to the panel height on desktop so it sits
                flush against the controls; on mobile it flexes to the available column space. */}
            <div className="flex w-full min-h-0 flex-1 items-center justify-center md:aspect-square md:h-full md:w-auto md:flex-none">
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
                    onLeaveGame={leaveGame}
                    opponentLabel={opponentLabel}
                    opponentIsBot={opponentIsBot}
                />
            </aside>
        </div>
    );
    };

export default ChessGame;