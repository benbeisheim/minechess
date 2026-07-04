import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Position, GameState, PlayerColor, PieceType } from '../types/chess';
import { getLegalMoves, makeTemporaryMove, makeTemporaryPromotionMove, undoTemporaryMove } from '../gameLogic/rules';
import { getInitialPosition } from '../utils/pieces';
import { soundManager } from '../utils/sounds';

// Define the initial state of our game
const initialState: GameState = {
    sound: '',
    playerColor: 'white',
    boardState: getInitialPosition(),
    selectedSquare: null,
    legalMoves: [],
    toMove: 'white',
    enPassantTarget: null,
    moveHistory: [],
    capturedPieces: {
        white: [],
        black: []
    },
    isCheck: false,
    resolve: null,
    players: {
        white: {
            name: '',
            color: 'white',
            timeLeft: 6000
        },
        black: {
            name: '',
            color: 'black',
            timeLeft: 6000
        }
    },
    promotionSquare: null,
    mine: null,
    lastMine: null,
    promotionPiece: null,
    temporaryMove: null,
    lastMove: null,
    explosion: null,
    blackKingAttackedSquares: [],
    whiteKingAttackedSquares: [],
    opponentLeft: false
};

// Create the slice
const gameSlice = createSlice({
    name: 'game',
    initialState,
    reducers: {
        // Initialize the board
        initializeBoard() {
            return initialState;
        },
        // Local UI state management
        selectSquare(state, action: PayloadAction<{position: Position, playerColor: PlayerColor}>) {
            const { position, playerColor } = action.payload;

            // Only allow selection if it's the player's turn
            if (state.toMove !== playerColor) {
                return state;
            }

            const piece = state.boardState.board[position.y][position.x];

            if (piece?.color === playerColor) {
                // Select the piece and calculate legal moves
                if (state.temporaryMove) {
                    state = undoTemporaryMove(state, state.temporaryMove);
                    state.temporaryMove = null;
                }
                state.selectedSquare = position;
                state.legalMoves = getLegalMoves(position, state);
                state.promotionSquare = null;
                state.promotionPiece = null;
            } else if (state.selectedSquare || state.temporaryMove) {
                if (state.selectedSquare) {
                    // If a square is selected and a legal move is clicked, set the temporary move and remove legalMoves highlighting
                    if (state.legalMoves.some(move =>
                        move.x === position.x && move.y === position.y
                    )) {
                        // Clear legalMoves highlighting, selectedSquare remains selected
                        state.legalMoves = [];
                        state.promotionSquare = null;
                        state.temporaryMove = {
                            from: {
                                position: state.selectedSquare,
                                piece: state.boardState.board[state.selectedSquare.y][state.selectedSquare.x]
                            },
                            to: {
                                position: position,
                                piece: state.boardState.board[position.y][position.x]
                            }
                        };
                        // Handle castling
                        if (state.temporaryMove.from.piece?.type === 'king' && (state.temporaryMove.to.position.x - state.temporaryMove.from.position.x === 2 || state.temporaryMove.to.position.x - state.temporaryMove.from.position.x === -2)) {
                            state.temporaryMove.rookMove = {
                                from: state.temporaryMove.to.position.x === 6 ? {x: 7, y: state.temporaryMove.from.position.y} : {x: 0, y: state.temporaryMove.from.position.y},
                                to: state.temporaryMove.to.position.x === 6 ? {x: 5, y: state.temporaryMove.from.position.y} : {x: 3, y: state.temporaryMove.from.position.y}
                            };
                        }
                        // Handle en passant
                        if (state.temporaryMove.from.piece?.type === 'pawn' && state.temporaryMove.to.position.x === state.enPassantTarget?.x && state.temporaryMove.to.position.y === state.enPassantTarget?.y) {
                            state.temporaryMove.enPassant = {
                                position: {x: state.temporaryMove.to.position.x, y: state.temporaryMove.to.position.y + (state.toMove === 'white' ? 1 : -1)},
                                piece: state.boardState.board[state.temporaryMove.to.position.y + (state.toMove === 'white' ? 1 : -1)][state.temporaryMove.to.position.x]
                            };
                        }
                        state = makeTemporaryMove(state, state.temporaryMove);
                        state.selectedSquare = null;
                        if (state.temporaryMove?.to.piece) {
                            soundManager.play('capture');
                        } else {
                            soundManager.play('move');
                        }
                    } else {
                        // Invalid move square - just clear selection
                        state.selectedSquare = null;
                        state.legalMoves = [];
                        state.promotionSquare = null;
                    }
                } else {
                    // If a pending move destination is set, we're waiting for mine placement
                    if (state.boardState.board[position.y][position.x] || 
                        state.blackKingAttackedSquares.some(square => square.x === position.x && square.y === position.y) || 
                        state.whiteKingAttackedSquares.some(square => square.x === position.x && square.y === position.y)) {
                        // If the square is occupied, or attacked by one of the kings, clear selection
                        state.selectedSquare = null;
                        state.legalMoves = [];
                        state.promotionSquare = null;
                    } else {
                        // If the square is empty, set the mine
                        state.mine = position;
                        state.temporaryMove = null;
                        state.selectedSquare = null;
                        state.toMove = state.toMove === 'white' ? 'black' : 'white';
                        soundManager.play('minePlaced');
                    }
                }
            }
        },
        // Update the clock
        updateClock(state, action: PayloadAction<{timeLeft: number, color: PlayerColor}>) {
            const { timeLeft, color } = action.payload;
            state.players[color].timeLeft = timeLeft;
            if (timeLeft <= 0) {
                state.resolve = 'checkmate';
            }
            return state;
        },
        setPromotionSquare(state, action: PayloadAction<Position>) {
            state.promotionSquare = action.payload;
            state.legalMoves = [];
            return state;
        },
        selectPromotionPiece(state, action: PayloadAction<PieceType>) {
            state.promotionPiece = action.payload;
            if (state.selectedSquare && state.promotionSquare) {
            state.temporaryMove = {
                from: {
                    position: state.selectedSquare,
                    piece: state.boardState.board[state.selectedSquare.y][state.selectedSquare.x]
                },
                to: {
                    position: state.promotionSquare,
                    piece: state.boardState.board[state.promotionSquare.y][state.promotionSquare.x]
                }
                };
            }
            if (state.temporaryMove) {
                state.boardState.board = makeTemporaryPromotionMove(state.boardState.board, state.temporaryMove, state.promotionPiece);
            }
            state.promotionSquare = null;
            state.selectedSquare = null;
            return state;
        },
        setPlayerColor(state, action: PayloadAction<PlayerColor>) {
            state.playerColor = action.payload;
            return state;
        },
        setOpponentLeft(state, action: PayloadAction<boolean>) {
            state.opponentLeft = action.payload;
        },
        updateGameState(state, action: PayloadAction<GameState>) {
            if (action.payload.toMove === state.playerColor || action.payload.sound === 'explosion') {
                soundManager.play(action.payload.sound);
            }
            return {
                ...state,
                ...action.payload,
                mine: action.payload.toMove !== state.playerColor ? state.mine : null,
            };
        },
    }
});

// Export actions and reducer
export const { selectSquare, initializeBoard, updateClock, updateGameState, setPromotionSquare, selectPromotionPiece, setPlayerColor, setOpponentLeft } = gameSlice.actions;
export default gameSlice.reducer;