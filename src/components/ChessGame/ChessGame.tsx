import { selectPromotionPiece, selectSquare, setPlayerColor, setPromotionSquare } from "../../store/gameSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { PieceType, Position } from "../../types/chess";
import ChessBoard from "../ChessBoard/ChessBoard";
import PlayerControl from "../PlayerControl/PlayerControl";
import { GameWebSocket } from "../../services/websocket/gameWebSocket";
import { useEffect, useRef } from "react";
import { PlayerColor } from "../../types/chess";
import { RootState } from "../../store";
interface ChessGameProps {
    gameId: string;
    playerColor: PlayerColor;
}

const ChessGame: React.FC<ChessGameProps> = ({ gameId, playerColor }) => {
    const dispatch = useAppDispatch();
    const gameState = useAppSelector((state: RootState) => state.game);
    const gameSocket = useRef<GameWebSocket | null>(null);

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
        if (selectedSquare && gameState.boardState.board[selectedSquare.y][selectedSquare.x]?.type === 'pawn' && 
        (position.y === 0 || position.y === 7) && 
        gameState.legalMoves.some(move => move.x === position.x && move.y === position.y)) {
            dispatch(setPromotionSquare(position));
            return;
        } else {
            dispatch(selectSquare({ position, playerColor }));
        }
        
        // If this click would result in a move, send it to the server
        if (temporaryMove && gameState.boardState.board[position.y][position.x] === null) {
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
            <div className="col-span-3 flex flex-col justify-between">
                <ChessBoard 
                    orientation={playerColor} 
                    onSquareClick={(!gameState.resolve && gameState.players.black.name !== "" && gameState.players.white.name !== "") ? onSquareClick : () => {}} 
                    handlePromotionClick={handlePromotionClick} 
                />
            </div>
            <div className="col-span-1 h-full flex justify-center items-center"> 
                <PlayerControl 
                    onResign={() => {}}
                    onDrawOffer={() => {}}
                />
            </div>
        </div>
    );
    };

export default ChessGame;