import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';
import { createSelector } from '@reduxjs/toolkit';

const selectBoardState = (state: RootState) => ({
    board: state.game.boardState.board,
    whiteKingPosition: state.game.boardState.whiteKingPosition,
    blackKingPosition: state.game.boardState.blackKingPosition,
    blackKingAttackedSquares: state.game.blackKingAttackedSquares,
    whiteKingAttackedSquares: state.game.whiteKingAttackedSquares
});

const selectGameFlow = (state: RootState) => ({
    toMove: state.game.toMove,
    isCheck: state.game.isCheck,
    resolve: state.game.resolve
});

const selectInteractionState = (state: RootState) => ({
    selectedSquare: state.game.selectedSquare,
    legalMoves: state.game.legalMoves,
    promotionSquare: state.game.promotionSquare,
    temporaryMove: state.game.temporaryMove,
    promotionPiece: state.game.promotionPiece
});

const selectPlayerInfo = (state: RootState) => ({
    players: state.game.players,
});

const selectHistory = (state: RootState) => ({
    moveHistory: state.game.moveHistory,
    capturedPieces: state.game.capturedPieces
});

// Combine them into a main selector
export const selectGameState = createSelector(
    [
        selectBoardState,
        selectGameFlow,
        selectInteractionState,
        selectPlayerInfo,
        selectHistory
    ],
    (boardState, gameFlow, interactionState, playerInfo, history) => ({
        ...boardState,
        ...gameFlow,
        ...interactionState,
        ...playerInfo,
        ...history
    })
);

// Use these hooks throughout your app instead of plain useDispatch/useSelector
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;