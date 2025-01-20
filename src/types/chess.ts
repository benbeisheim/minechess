// Represents a position on the chess board
export interface Position {
    x: number;  // 0-7, representing columns A-H
    y: number;  // 0-7, representing rows 1-8
}

// Defines all possible piece types in chess
export type PieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';

// Defines the two possible colors in chess
export type PlayerColor = 'white' | 'black';

// Represents a chess player with all its properties
export interface Player {
    name: string;
    color: PlayerColor;
    timeLeft: number;
}

export interface WSMove {
    from: Position;
    to: Position;
    promotion?: PieceType;
    mine: Position;
}

// Represents a chess piece with all its properties
export interface PieceData {
    type: PieceType;
    color: PlayerColor;
    position: Position;
    hasMoved: boolean;  // Important for special moves like castling and pawn's first move
}

// Represents the complete state of a chess game
export interface GameState {
    sound: string;
    playerColor: PlayerColor;
    boardState: BoardState;
    toMove: PlayerColor;
    moveHistory: Move[];
    capturedPieces: CapturedPieces;
    isCheck: boolean;
    selectedSquare: Position | null;
    legalMoves: Position[];
    enPassantTarget: Position | null;
    resolve: 'checkmate' | 'draw' | null;
    players: {
        white: Player;
        black: Player;
    };
    promotionSquare: Position | null;
    mine: Position | null;
    promotionPiece: PieceType | null;
    temporaryMove: {
        from: {
            position: Position;
            piece: PieceData | null;
        };
        to: {
            position: Position;
            piece: PieceData | null;
        };
    } | null;
    lastMove: {
        from: Position;
        to: Position;
    } | null;
}

export interface CapturedPieces {
    white: PieceData[];
    black: PieceData[];
}

// Represents the chess board as a 2D grid of squares
export interface BoardState {
    board: (PieceData | null) [][];
    blackKingPosition: Position;
    whiteKingPosition: Position;
}

// Represents a single square on the board
export interface Square {
    position: Position;
    piece: PieceData | null;  // null means empty square
    isHighlighted: boolean;  // For showing possible moves
    isSelected: boolean;  // For showing the selected piece
}

// Represents a move in chess notation, contains necessary information for game reconstruction (makeMove/unMakeMove)
export interface Ply {
    piece: PieceData;
    from: Position;
    to: Position;
    capturedPiece?: PieceData;  
    castleRookMove?: {
        from: Position;
        to: Position;
    };
    promoted?: PieceType;
    notation: string;  
}

export interface Move {
    whitePly: Ply;
    blackPly: Ply;
}

// Defines the shape of our game logic handlers
export interface GameRules {
    isLegalMove(from: Position, to: Position, gameState: GameState): boolean;
    calculateLegalMoves(piece: PieceData, gameState: GameState): Position[];
    isCheck(gameState: GameState): boolean;
    isCheckmate(gameState: GameState): boolean;
    isStalemate(gameState: GameState): boolean;
}

// Represents a game action that can be performed
export interface GameAction {
    type: 'MOVE' | 'RESIGN' | 'OFFER_DRAW';
    payload: {
        from?: Position;
        to?: Position;
        promotionChoice?: PieceType;
    };
}
