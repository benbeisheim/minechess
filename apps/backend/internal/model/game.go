package model

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/benbeisheim/minechess-backend/internal/ws"
	"github.com/gofiber/websocket/v2"
)

// The connections for a specific game
type GameConnections struct {
	connections map[string]*websocket.Conn // playerID -> connection
	mu          sync.RWMutex
}

// The Game struct focuses on a single game's state and its observers
type Game struct {
	ID          string
	mu          sync.Mutex
	state       GameState
	connections *GameConnections // Connections just for this game
	mine        *Position
	whiteClock  *Clock
	blackClock  *Clock

	// Single-player bot metadata. isBot is false for normal PvP games.
	isBot         bool
	botColor      string
	botDifficulty int
}

type GameState struct {
	Sound           string         `json:"sound"`
	Board           *BoardState    `json:"boardState"`
	ToMove          string         `json:"toMove"`
	MoveHistory     []Move         `json:"moveHistory"`
	CapturedPieces  CapturedPieces `json:"capturedPieces"`
	IsCheck         bool           `json:"isCheck"`
	SelectedSquare  *Position      `json:"selectedSquare"` // Made nullable
	LegalMoves      []Position     `json:"legalMoves"`
	EnPassantTarget *Position      `json:"enPassantTarget"` // Made nullable
	Resolve         *string        `json:"resolve"`         // Made nullable
	Players         struct {
		White ClientPlayer `json:"white"`
		Black ClientPlayer `json:"black"`
	} `json:"players"`
	PromotionSquare          *Position   `json:"promotionSquare"`        // Made nullable
	PromotionPiece           *PieceType  `json:"promotionPiece"`         // Made nullable
	Mine                     *Position   `json:"mine"`                   // Made nullable
	LastMine                 *Position   `json:"lastMine"`               // Made nullable
	PendingMoveDestination   *Position   `json:"pendingMoveDestination"` // Made nullable
	LastMove                 *SimpleMove `json:"lastMove"`               // Made nullable
	Explosion                *Position   `json:"explosion"`              // Made nullable
	WhiteKingAttackedSquares []Position  `json:"whiteKingAttackedSquares"`
	BlackKingAttackedSquares []Position  `json:"blackKingAttackedSquares"`
}

type CapturedPieces struct {
	White []Piece `json:"white"`
	Black []Piece `json:"black"`
}

func NewGame(id string) *Game {
	return &Game{
		ID:          id,
		mu:          sync.Mutex{},
		state:       newGameState(),
		connections: NewGameConnections(),
		whiteClock:  NewClock(time.Duration(1200) * time.Second),
		blackClock:  NewClock(time.Duration(1200) * time.Second),
	}
}

func NewGameConnections() *GameConnections {
	return &GameConnections{
		connections: make(map[string]*websocket.Conn),
	}
}

func newGameState() GameState {
	return GameState{
		Sound:           "",
		Board:           newBoard(),
		ToMove:          "white",
		MoveHistory:     make([]Move, 0),
		CapturedPieces:  newCapturedPieces(),
		IsCheck:         false,
		SelectedSquare:  nil,
		LegalMoves:      make([]Position, 0),
		EnPassantTarget: nil,
		Resolve:         nil,
		Players: struct {
			White ClientPlayer `json:"white"`
			Black ClientPlayer `json:"black"`
		}{
			White: ClientPlayer{
				ID:       "",
				Color:    "",
				TimeLeft: 12000,
			},
			Black: ClientPlayer{
				ID:       "",
				Color:    "",
				TimeLeft: 12000,
			},
		},
		PromotionSquare:          nil,
		PromotionPiece:           nil,
		Mine:                     nil,
		LastMine:                 nil,
		LastMove:                 nil,
		Explosion:                nil,
		WhiteKingAttackedSquares: []Position{{X: 3, Y: 7}, {X: 5, Y: 7}, {X: 3, Y: 6}, {X: 4, Y: 6}, {X: 5, Y: 6}},
		BlackKingAttackedSquares: []Position{{X: 3, Y: 0}, {X: 5, Y: 0}, {X: 3, Y: 1}, {X: 4, Y: 1}, {X: 5, Y: 1}},
	}
}

func newCapturedPieces() CapturedPieces {
	return CapturedPieces{
		White: make([]Piece, 0),
		Black: make([]Piece, 0),
	}
}

func (g *Game) AddPlayer(playerID string) (PlayerColor, error) {
	g.mu.Lock()
	defer g.mu.Unlock()

	if g.state.Players.White.ID == "" {
		g.state.Players.White = ClientPlayer{
			ID:       playerID,
			Color:    "white",
			TimeLeft: 12000,
		}
		return PlayerColorWhite, nil
	}
	if g.state.Players.Black.ID == "" {
		g.state.Players.Black = ClientPlayer{
			ID:       playerID,
			Color:    "black",
			TimeLeft: 12000,
		}
		return PlayerColorBlack, nil
	}
	return "", errors.New("game is full")
}

func (g *Game) GetState() GameState {
	g.mu.Lock()
	defer g.mu.Unlock()

	return g.state
}

func (g *Game) IsPlayerInGame(playerID string) bool {
	g.mu.Lock()
	defer g.mu.Unlock()

	if g.state.Players.White.ID != "" && g.state.Players.White.ID == playerID {
		return true
	}
	if g.state.Players.Black.ID != "" && g.state.Players.Black.ID == playerID {
		return true
	}
	return false
}

func (g *Game) isPlayerInGame(playerID string) bool {
	if g.state.Players.White.ID != "" && g.state.Players.White.ID == playerID {
		return true
	}
	if g.state.Players.Black.ID != "" && g.state.Players.Black.ID == playerID {
		return true
	}
	return false
}

func (g *Game) canSpectate() bool {
	return g.state.Players.White.ID == "" || g.state.Players.Black.ID == ""
}

func (g *Game) MakeMove(move WSMove) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	// Guard against out-of-bounds coordinates before indexing the board.
	if !isValidPosition(move.From) || !isValidPosition(move.To) {
		return errors.New("invalid move, out of bounds")
	}

	piece := g.state.Board.Board[move.From.Y][move.From.X]
	if piece == nil {
		return errors.New("no piece at from square")
	}

	if g.state.ToMove != piece.Color {
		return errors.New("not your turn")
	}

	// Validate and execute the move
	if err := g.validateMove(move); err != nil {
		go g.broadcastState()
		return err
	}
	if g.state.ToMove == "white" {
		g.whiteClock.Stop()
	} else {
		g.blackClock.Stop()
	}

	err := g.executeMove(move)
	if err != nil {
		return err
	}
	// Start opposing players clock
	if g.state.ToMove == "white" {
		g.whiteClock.Start()
	} else {
		g.blackClock.Start()
	}

	// update client clock for both players
	g.state.Players.White.TimeLeft = int(g.whiteClock.timeLeft.Milliseconds() / 100)
	g.state.Players.Black.TimeLeft = int(g.blackClock.timeLeft.Milliseconds() / 100)

	return nil
}

/*
	func (g *Game) Resign(playerID string) error {
		g.mu.Lock()
		defer g.mu.Unlock()

		if !g.IsPlayerInGame(playerID) {
			return errors.New("player not in game")
		}

		return nil
	}

	func (g *Game) OfferDraw(playerID string) error {
	    g.mu.Lock()
	    defer g.mu.Unlock()

	    if !g.IsPlayerInGame(playerID) {
	        return errors.New("player not in game")
	    }

	    g.drawOffer = &DrawOffer{
	        OfferedBy: playerID,
	        OfferedAt: time.Now(),
	    }
	    return nil
	}
*/
func (g *Game) validateMove(move WSMove) error {
	// check if move is out of bounds
	if move.From.X < 0 || move.From.X > 7 || move.From.Y < 0 || move.From.Y > 7 || move.To.X < 0 || move.To.X > 7 || move.To.Y < 0 || move.To.Y > 7 {
		return errors.New("invalid move, out of bounds")
	}
	// check if move is legal
	moveToCheck := SimpleMove{From: move.From, To: move.To}
	isLegal := false
	for _, legalMove := range g.getLegalMovesForPiece(g.state.Board.Board[move.From.Y][move.From.X]) {
		if legalMove.From == moveToCheck.From && legalMove.To == moveToCheck.To {
			isLegal = true
			break
		}
	}
	if !isLegal {
		return errors.New("invalid move, not legal")
	}

	return nil
}

func (g *Game) executeMove(move WSMove) error {
	// Initial state validation
	if g.state.Board == nil {
		return fmt.Errorf("invalid game state: board is nil")
	}
	if g.state.Board.Board == nil {
		return fmt.Errorf("invalid game state: board array is nil")
	}

	// Validate move coordinates
	if !isValidPosition(move.From) || !isValidPosition(move.To) {
		return fmt.Errorf("invalid move coordinates: from %v to %v", move.From, move.To)
	}

	// Get piece at source position
	piece := g.state.Board.Board[move.From.Y][move.From.X]
	if piece == nil {
		return fmt.Errorf("no piece at source position %v", move.From)
	}

	ply := g.makePly(move)
	g.state.Sound = "" // clear last turns sounds

	// Handle explosion/capture sound logic
	if g.mine != nil && move.To.X == g.mine.X && move.To.Y == g.mine.Y && piece.Type != Pawn {
		g.state.Sound = "explosion"
	} else {
		targetPiece := g.state.Board.Board[move.To.Y][move.To.X]
		if targetPiece != nil {
			g.state.Sound = "capture"
			switch g.state.ToMove {
			case "white":
				g.state.CapturedPieces.White = append(g.state.CapturedPieces.White, *targetPiece)
			case "black":
				g.state.CapturedPieces.Black = append(g.state.CapturedPieces.Black, *targetPiece)
			default:
				return fmt.Errorf("invalid turn state: %s", g.state.ToMove)
			}
		} else {
			g.state.Sound = "move"
		}
	}

	// Move the piece
	g.state.Board.Board[move.From.Y][move.From.X] = nil
	g.state.Board.Board[move.To.Y][move.To.X] = piece

	// Update piece state
	piece.HasMoved = true
	piece.Position = move.To

	// Handle promotion
	if move.Promotion != "" {
		piece.Type = move.Promotion
	}

	// Handle special moves based on piece type
	if piece.Type == King {
		ply = g.handleCastle(move, ply)
		switch g.state.ToMove {
		case "white":
			g.state.Board.WhiteKingPosition = move.To
		case "black":
			g.state.Board.BlackKingPosition = move.To
		}
	} else if piece.Type == Pawn {
		ply = g.handleEnPassant(move, ply)
	}

	// Update move history
	if g.state.ToMove == "white" {
		g.state.MoveHistory = append(g.state.MoveHistory, Move{WhitePly: ply})
	} else {
		if len(g.state.MoveHistory) == 0 {
			return fmt.Errorf("invalid move history state: no moves exist for black's turn")
		}
		lastIdx := len(g.state.MoveHistory) - 1
		g.state.MoveHistory[lastIdx].BlackPly = ply
	}

	// Handle explosion logic
	if g.mine != nil && move.To.X == g.mine.X && move.To.Y == g.mine.Y && piece.Type != King && piece.Type != Pawn {
		g.state.Explosion = &move.To

		// Get piece before nullifying for capture list
		if targetPiece := g.state.Board.Board[move.To.Y][move.To.X]; targetPiece != nil {
			switch g.state.ToMove {
			case "white":
				g.state.CapturedPieces.Black = append(g.state.CapturedPieces.Black, *targetPiece)
			case "black":
				g.state.CapturedPieces.White = append(g.state.CapturedPieces.White, *targetPiece)
			}
		}

		g.state.Board.Board[move.To.Y][move.To.X] = nil

		if isKingInCheck(g.state.Board, g.state.ToMove) {
			result := getOtherColor(g.state.ToMove) + " wins by Bombmate"
			g.state.Resolve = &result
		}
	} else {
		g.state.Explosion = nil
	}

	// Update king attack squares
	g.state.WhiteKingAttackedSquares = g.getKingAttackedSquares("white")
	g.state.BlackKingAttackedSquares = g.getKingAttackedSquares("black")

	// Update mine state
	if g.mine != nil {
		mineCopy := *g.mine
		g.state.LastMine = &mineCopy
	}
	g.mine = &move.Mine

	// Switch turn and check game state
	g.switchTurn()
	g.state.IsCheck = isKingInCheck(g.state.Board, g.state.ToMove)

	if g.isNoLegalMoves(g.state.ToMove) {
		if g.state.IsCheck {
			result := getOtherColor(g.state.ToMove) + " wins by Checkmate"
			g.state.Resolve = &result
		} else {
			result := "draw by Stalemate"
			g.state.Resolve = &result
		}
	}

	// Update sound if in check
	if g.state.IsCheck {
		g.state.Sound = "check"
	}

	// Set last move
	lastMove := SimpleMove{From: move.From, To: move.To}
	g.state.LastMove = &lastMove

	go g.broadcastState()

	return nil
}

func isValidPosition(pos Position) bool {
	return pos.X >= 0 && pos.X < 8 && pos.Y >= 0 && pos.Y < 8
}

func (g *Game) getKingAttackedSquares(color string) []Position {
	kingAttackedSquares := []Position{}
	kingDirs := []Position{{X: 1, Y: 0}, {X: -1, Y: 0}, {X: 0, Y: 1}, {X: 0, Y: -1}, {X: 1, Y: 1}, {X: 1, Y: -1}, {X: -1, Y: 1}, {X: -1, Y: -1}}
	kingPos := g.state.Board.WhiteKingPosition
	if color == "black" {
		kingPos = g.state.Board.BlackKingPosition
	}
	for _, dir := range kingDirs {
		targetPos := Position{X: kingPos.X + dir.X, Y: kingPos.Y + dir.Y}
		if boundaryCheck(targetPos) {
			kingAttackedSquares = append(kingAttackedSquares, targetPos)
		}
	}
	return kingAttackedSquares
}

func getOtherColor(color string) string {
	if color == "white" {
		return "black"
	}
	return "white"
}

func isKingInCheck(boardState *BoardState, color string) bool {
	if color == "white" {
		return isSquareAttacked(boardState, "black", boardState.WhiteKingPosition)
	}
	return isSquareAttacked(boardState, "white", boardState.BlackKingPosition)
}

func isSquareAttacked(boardState *BoardState, attackingColor string, position Position) bool {
	rookDirs := []Position{{X: 1, Y: 0}, {X: -1, Y: 0}, {X: 0, Y: 1}, {X: 0, Y: -1}}
	bishopDirs := []Position{{X: 1, Y: 1}, {X: 1, Y: -1}, {X: -1, Y: 1}, {X: -1, Y: -1}}
	knightDirs := []Position{{X: 2, Y: 1}, {X: 2, Y: -1}, {X: -2, Y: 1}, {X: -2, Y: -1}, {X: 1, Y: 2}, {X: 1, Y: -2}, {X: -1, Y: 2}, {X: -1, Y: -2}}
	kingDirs := []Position{{X: 1, Y: 0}, {X: -1, Y: 0}, {X: 0, Y: 1}, {X: 0, Y: -1}, {X: 1, Y: 1}, {X: 1, Y: -1}, {X: -1, Y: 1}, {X: -1, Y: -1}}
	pawnDirs := []Position{{X: -1, Y: 1}, {X: 1, Y: 1}}
	if attackingColor == "black" {
		pawnDirs = []Position{{X: -1, Y: -1}, {X: 1, Y: -1}}
	}

	for _, dir := range rookDirs {
		targetPos := Position{X: position.X + dir.X, Y: position.Y + dir.Y}
		for boundaryCheck(targetPos) {
			if boardState.Board[targetPos.Y][targetPos.X] != nil {
				if boardState.Board[targetPos.Y][targetPos.X].Color == attackingColor && (boardState.Board[targetPos.Y][targetPos.X].Type == Queen || boardState.Board[targetPos.Y][targetPos.X].Type == Rook) {
					return true
				} else {
					break
				}
			}
			targetPos = Position{X: targetPos.X + dir.X, Y: targetPos.Y + dir.Y}
		}
	}
	for _, dir := range bishopDirs {
		targetPos := Position{X: position.X + dir.X, Y: position.Y + dir.Y}
		for boundaryCheck(targetPos) {
			if boardState.Board[targetPos.Y][targetPos.X] != nil {
				if boardState.Board[targetPos.Y][targetPos.X].Color == attackingColor && (boardState.Board[targetPos.Y][targetPos.X].Type == Queen || boardState.Board[targetPos.Y][targetPos.X].Type == Bishop) {
					return true
				} else {
					break
				}
			}
			targetPos = Position{X: targetPos.X + dir.X, Y: targetPos.Y + dir.Y}
		}
	}
	for _, dir := range knightDirs {
		targetPos := Position{X: position.X + dir.X, Y: position.Y + dir.Y}
		if boundaryCheck(targetPos) && boardState.Board[targetPos.Y][targetPos.X] != nil && boardState.Board[targetPos.Y][targetPos.X].Color == attackingColor && boardState.Board[targetPos.Y][targetPos.X].Type == Knight {
			return true
		}
	}
	for _, dir := range kingDirs {
		targetPos := Position{X: position.X + dir.X, Y: position.Y + dir.Y}
		if boundaryCheck(targetPos) && boardState.Board[targetPos.Y][targetPos.X] != nil && boardState.Board[targetPos.Y][targetPos.X].Color == attackingColor && boardState.Board[targetPos.Y][targetPos.X].Type == King {
			return true
		}
	}
	for _, dir := range pawnDirs {
		targetPos := Position{X: position.X + dir.X, Y: position.Y + dir.Y}
		if boundaryCheck(targetPos) && boardState.Board[targetPos.Y][targetPos.X] != nil && boardState.Board[targetPos.Y][targetPos.X].Color == attackingColor && boardState.Board[targetPos.Y][targetPos.X].Type == Pawn {
			return true
		}
	}
	return false
}

func boundaryCheck(position Position) bool {
	return position.X >= 0 && position.X < 8 && position.Y >= 0 && position.Y < 8
}

func (g *Game) isNoLegalMoves(color string) bool {
	return len(g.getLegalMovesForColor(color)) == 0
}

func (g *Game) getLegalMovesForColor(color string) []SimpleMove {
	legalMoves := []SimpleMove{}
	for y := 0; y < 8; y++ {
		for x := 0; x < 8; x++ {
			if g.state.Board.Board[y][x] != nil && g.state.Board.Board[y][x].Color == color {
				legalMoves = append(legalMoves, g.getLegalMovesForPiece(g.state.Board.Board[y][x])...)
			}
		}
	}
	return legalMoves
}

func (g *Game) getLegalMovesForPiece(piece *Piece) []SimpleMove {
	switch piece.Type {
	case Pawn:
		psuedoMoves := g.getPsuedoPawnMoves(piece)
		return g.filterLegalMoves(psuedoMoves)
	case Knight:
		psuedoMoves := g.getPsuedoKnightMoves(piece)
		return g.filterLegalMoves(psuedoMoves)
	case Bishop:
		psuedoMoves := g.getPsuedoBishopMoves(piece)
		return g.filterLegalMoves(psuedoMoves)
	case Rook:
		psuedoMoves := g.getPsuedoRookMoves(piece)
		return g.filterLegalMoves(psuedoMoves)
	case Queen:
		psuedoMoves := g.getPsuedoQueenMoves(piece)
		return g.filterLegalMoves(psuedoMoves)
	case King:
		psuedoMoves := g.getPsuedoKingMoves(piece)
		return g.filterLegalMoves(psuedoMoves)
	default:
		return []SimpleMove{}
	}
}

// TempMove represents a move that can be undone
type TempMove struct {
	from          Position
	to            Position
	movedPiece    *Piece
	capturedPiece *Piece
	oldKingPos    Position
}

func (g *Game) filterLegalMoves(pseudoMoves []SimpleMove) []SimpleMove {
	if len(pseudoMoves) == 0 {
		return nil
	}

	legalMoves := make([]SimpleMove, 0, len(pseudoMoves))

	for _, move := range pseudoMoves {
		if temp, ok := g.tryMove(move); ok {
			// Check if this move leaves or puts the king in check
			if !isKingInCheck(g.state.Board, g.state.ToMove) {
				legalMoves = append(legalMoves, move)
			}
			g.undoMove(temp)
		}
	}

	return legalMoves
}

// tryMove attempts to make a move and returns data needed to undo it
func (g *Game) tryMove(move SimpleMove) (TempMove, bool) {
	temp := TempMove{
		from:          move.From,
		to:            move.To,
		movedPiece:    g.state.Board.Board[move.From.Y][move.From.X],
		capturedPiece: g.state.Board.Board[move.To.Y][move.To.X],
	}

	if temp.movedPiece == nil {
		return TempMove{}, false
	}

	// Create deep copy of the piece to avoid reference issues
	movedPieceCopy := *temp.movedPiece
	movedPieceCopy.Position = move.To

	// Update board state
	g.state.Board.Board[move.To.Y][move.To.X] = &movedPieceCopy
	g.state.Board.Board[move.From.Y][move.From.X] = nil

	// Handle king position updates
	if temp.movedPiece.Type == King {
		switch g.state.ToMove {
		case "white":
			temp.oldKingPos = g.state.Board.WhiteKingPosition
			g.state.Board.WhiteKingPosition = move.To
		case "black":
			temp.oldKingPos = g.state.Board.BlackKingPosition
			g.state.Board.BlackKingPosition = move.To
		}
	}

	return temp, true
}

// undoMove reverts a move using the saved temporary state
func (g *Game) undoMove(temp TempMove) {
	// Restore original board state
	g.state.Board.Board[temp.from.Y][temp.from.X] = temp.movedPiece
	g.state.Board.Board[temp.to.Y][temp.to.X] = temp.capturedPiece

	// Restore king position if necessary
	if temp.movedPiece.Type == King {
		switch g.state.ToMove {
		case "white":
			g.state.Board.WhiteKingPosition = temp.oldKingPos
		case "black":
			g.state.Board.BlackKingPosition = temp.oldKingPos
		}
	}
}

func (g *Game) getPsuedoPawnMoves(piece *Piece) []SimpleMove {
	pawnMoves := []SimpleMove{}
	dir := Position{X: 0, Y: -1}
	enPassantDirs := []Position{{X: 1, Y: -1}, {X: -1, Y: -1}}
	if piece.Color == "black" {
		dir = Position{X: 0, Y: 1}
		enPassantDirs = []Position{{X: 1, Y: 1}, {X: -1, Y: 1}}
	}
	// Check move forward 1
	if g.state.Board.Board[piece.Position.Y+dir.Y][piece.Position.X] == nil {
		pawnMoves = append(pawnMoves, SimpleMove{From: piece.Position, To: Position{X: piece.Position.X, Y: piece.Position.Y + dir.Y}})
		// Check move forward 2 if not moved
		if !piece.HasMoved && g.state.Board.Board[piece.Position.Y+dir.Y*2][piece.Position.X] == nil {
			pawnMoves = append(pawnMoves, SimpleMove{From: piece.Position, To: Position{X: piece.Position.X, Y: piece.Position.Y + dir.Y*2}})
		}
	}
	// Check capture left
	if piece.Position.X > 0 && g.state.Board.Board[piece.Position.Y+dir.Y][piece.Position.X-1] != nil && g.state.Board.Board[piece.Position.Y+dir.Y][piece.Position.X-1].Color != piece.Color {
		pawnMoves = append(pawnMoves, SimpleMove{From: piece.Position, To: Position{X: piece.Position.X - 1, Y: piece.Position.Y + dir.Y}})
	}
	// Check capture right
	if piece.Position.X < 7 && g.state.Board.Board[piece.Position.Y+dir.Y][piece.Position.X+1] != nil && g.state.Board.Board[piece.Position.Y+dir.Y][piece.Position.X+1].Color != piece.Color {
		pawnMoves = append(pawnMoves, SimpleMove{From: piece.Position, To: Position{X: piece.Position.X + 1, Y: piece.Position.Y + dir.Y}})
	}
	// Check en passant
	for _, dir := range enPassantDirs {
		if g.state.EnPassantTarget != nil && g.state.EnPassantTarget.X == piece.Position.X+dir.X && g.state.EnPassantTarget.Y == piece.Position.Y+dir.Y {
			pawnMoves = append(pawnMoves, SimpleMove{From: piece.Position, To: Position{X: piece.Position.X + dir.X, Y: piece.Position.Y + dir.Y}})
		}
	}
	return pawnMoves
}

func (g *Game) getPsuedoKnightMoves(piece *Piece) []SimpleMove {
	// TODO: Implement psuedo knight moves
	knightMoves := []SimpleMove{}
	knightDirs := []Position{{X: 2, Y: 1}, {X: 2, Y: -1}, {X: -2, Y: 1}, {X: -2, Y: -1}, {X: 1, Y: 2}, {X: 1, Y: -2}, {X: -1, Y: 2}, {X: -1, Y: -2}}
	for _, dir := range knightDirs {
		targetPos := Position{X: piece.Position.X + dir.X, Y: piece.Position.Y + dir.Y}
		if boundaryCheck(targetPos) && (g.state.Board.Board[targetPos.Y][targetPos.X] == nil || g.state.Board.Board[targetPos.Y][targetPos.X].Color != piece.Color) {
			knightMoves = append(knightMoves, SimpleMove{From: piece.Position, To: targetPos})
		}
	}
	return knightMoves
}

func (g *Game) getPsuedoBishopMoves(piece *Piece) []SimpleMove {
	// TODO: Implement psuedo bishop moves
	bishopMoves := []SimpleMove{}
	bishopDirs := []Position{{X: 1, Y: 1}, {X: 1, Y: -1}, {X: -1, Y: 1}, {X: -1, Y: -1}}
	for _, dir := range bishopDirs {
		targetPos := Position{X: piece.Position.X + dir.X, Y: piece.Position.Y + dir.Y}
		for boundaryCheck(targetPos) {
			if g.state.Board.Board[targetPos.Y][targetPos.X] == nil {
				bishopMoves = append(bishopMoves, SimpleMove{From: piece.Position, To: targetPos})
			} else if g.state.Board.Board[targetPos.Y][targetPos.X].Color != piece.Color {
				bishopMoves = append(bishopMoves, SimpleMove{From: piece.Position, To: targetPos})
				break
			} else {
				break
			}
			targetPos = Position{X: targetPos.X + dir.X, Y: targetPos.Y + dir.Y}
		}
	}
	return bishopMoves
}

func (g *Game) getPsuedoRookMoves(piece *Piece) []SimpleMove {
	// TODO: Implement psuedo rook moves
	rookMoves := []SimpleMove{}
	rookDirs := []Position{{X: 1, Y: 0}, {X: -1, Y: 0}, {X: 0, Y: 1}, {X: 0, Y: -1}}
	for _, dir := range rookDirs {
		targetPos := Position{X: piece.Position.X + dir.X, Y: piece.Position.Y + dir.Y}
		for boundaryCheck(targetPos) {
			if g.state.Board.Board[targetPos.Y][targetPos.X] == nil {
				rookMoves = append(rookMoves, SimpleMove{From: piece.Position, To: targetPos})
			} else if g.state.Board.Board[targetPos.Y][targetPos.X].Color != piece.Color {
				rookMoves = append(rookMoves, SimpleMove{From: piece.Position, To: targetPos})
				break
			} else {
				break
			}
			targetPos = Position{X: targetPos.X + dir.X, Y: targetPos.Y + dir.Y}
		}
	}
	return rookMoves
}

func (g *Game) getPsuedoQueenMoves(piece *Piece) []SimpleMove {
	return append(g.getPsuedoBishopMoves(piece), g.getPsuedoRookMoves(piece)...)
}

func (g *Game) getPsuedoKingMoves(piece *Piece) []SimpleMove {
	kingMoves := []SimpleMove{}
	kingDirs := []Position{{X: 1, Y: 0}, {X: -1, Y: 0}, {X: 0, Y: 1}, {X: 0, Y: -1}, {X: 1, Y: 1}, {X: 1, Y: -1}, {X: -1, Y: 1}, {X: -1, Y: -1}}
	for _, dir := range kingDirs {
		targetPos := Position{X: piece.Position.X + dir.X, Y: piece.Position.Y + dir.Y}
		if boundaryCheck(targetPos) && (g.state.Board.Board[targetPos.Y][targetPos.X] == nil || g.state.Board.Board[targetPos.Y][targetPos.X].Color != piece.Color) {
			kingMoves = append(kingMoves, SimpleMove{From: piece.Position, To: targetPos})
		}
	}
	if !piece.HasMoved {
		// check for castle moves
		if g.state.Board.Board[piece.Position.Y][0] != nil && g.state.Board.Board[piece.Position.Y][0].Type == Rook && !g.state.Board.Board[piece.Position.Y][0].HasMoved {
			if g.state.Board.Board[piece.Position.Y][1] == nil && g.state.Board.Board[piece.Position.Y][2] == nil && g.state.Board.Board[piece.Position.Y][3] == nil {
				kingMoves = append(kingMoves, SimpleMove{From: piece.Position, To: Position{X: piece.Position.X - 2, Y: piece.Position.Y}})
			}
		}
		if g.state.Board.Board[piece.Position.Y][7] != nil && g.state.Board.Board[piece.Position.Y][7].Type == Rook && !g.state.Board.Board[piece.Position.Y][7].HasMoved {
			if g.state.Board.Board[piece.Position.Y][5] == nil && g.state.Board.Board[piece.Position.Y][6] == nil {
				kingMoves = append(kingMoves, SimpleMove{From: piece.Position, To: Position{X: piece.Position.X + 2, Y: piece.Position.Y}})
			}
		}
	}
	return kingMoves
}

func (g *Game) handleEnPassant(move WSMove, ply Ply) Ply {
	// if the move is an en passant capture, remove the captured piece and alter ply notation
	if g.state.EnPassantTarget != nil && move.To.X == g.state.EnPassantTarget.X && move.To.Y == g.state.EnPassantTarget.Y {
		switch g.state.ToMove {
		case "white":
			g.state.CapturedPieces.White = append(g.state.CapturedPieces.White, *g.state.Board.Board[move.To.Y+1][move.To.X])
			g.state.Board.Board[move.To.Y+1][move.To.X] = nil
		case "black":
			g.state.CapturedPieces.Black = append(g.state.CapturedPieces.Black, *g.state.Board.Board[move.To.Y-1][move.To.X])
			g.state.Board.Board[move.To.Y-1][move.To.X] = nil
		}
		ply.Notation = "x" + ply.Notation
	}
	// if the move is double pawn move, set en passant target
	switch move.To.Y - move.From.Y {
	case 2:
		g.state.EnPassantTarget = &Position{X: move.To.X, Y: move.To.Y - 1}
	case -2:
		g.state.EnPassantTarget = &Position{X: move.To.X, Y: move.To.Y + 1}
	default:
		g.state.EnPassantTarget = nil
	}

	return ply
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func (g *Game) handleCastle(move WSMove, ply Ply) Ply {
	// assume only called for king move
	if abs(move.From.X-move.To.X) == 2 {
		switch move.To.X {
		case 2:
			rook := g.state.Board.Board[move.From.Y][0]
			rook.Position = Position{X: 3, Y: move.From.Y}
			g.state.Board.Board[move.From.Y][0] = nil
			g.state.Board.Board[move.From.Y][3] = rook
			rook.HasMoved = true
			ply.CastleRookMove = &CastleRookMove{
				From: Position{X: 0, Y: move.From.Y},
				To:   Position{X: 3, Y: move.From.Y},
			}
			ply.Notation = "O-O-O"
		case 6:
			rook := g.state.Board.Board[move.From.Y][7]
			rook.Position = Position{X: 5, Y: move.From.Y}
			g.state.Board.Board[move.From.Y][7] = nil
			g.state.Board.Board[move.From.Y][5] = rook
			rook.HasMoved = true
			ply.CastleRookMove = &CastleRookMove{
				From: Position{X: 7, Y: move.From.Y},
				To:   Position{X: 5, Y: move.From.Y},
			}
			ply.Notation = "O-O"
		}
	}
	return ply
}

func (g *Game) makePly(move WSMove) Ply {
	// return ply without rook castle move, add castle rook move in castle detection
	// at some point, will need to add en passant capture in order to allow for game reconstruction
	return Ply{
		Piece:          g.state.Board.Board[move.From.Y][move.From.X],
		From:           move.From,
		To:             move.To,
		CapturedPiece:  g.state.Board.Board[move.To.Y][move.To.X],
		CastleRookMove: nil,
		Promotion:      move.Promotion,
		Notation:       g.getNotation(move),
	}
}

func (g *Game) getNotation(move WSMove) string {
	piece := g.state.Board.Board[move.From.Y][move.From.X]
	from := move.From
	to := move.To
	pieceNotationPrefix := piece.Type.getPieceNotation()
	pieceNotationCapture := ""
	if g.state.Board.Board[to.Y][to.X] != nil {
		pieceNotationCapture = "x"
	}
	pieceNotationSuffix := to.getSquareNotation()
	pawnFileSpecifier := ""
	if piece.Type == Pawn && from.X != to.X {
		pawnFileSpecifier = from.getFileNotation()
	}
	if g.mine != nil && to.X == g.mine.X && to.Y == g.mine.Y {
		pieceNotationSuffix += "*"
	}
	return fmt.Sprintf("%s%s%s%s", pieceNotationPrefix, pawnFileSpecifier, pieceNotationCapture, pieceNotationSuffix)
}

func (g *Game) switchTurn() {
	if g.state.ToMove == "white" {
		g.state.ToMove = "black"
	} else {
		g.state.ToMove = "white"
	}
}

func (g *Game) RegisterConnection(playerID string, conn *websocket.Conn) error {
	g.mu.Lock()
	isAuthorized := g.isPlayerInGame(playerID) || g.canSpectate()
	g.mu.Unlock()

	if !isAuthorized {
		return errors.New("not authorized to join this game")
	}

	g.connections.mu.Lock()
	if _, exists := g.connections.connections[playerID]; exists {
		// A live connection already exists for this player; reject the new one and
		// leave the existing registration untouched.
		g.connections.mu.Unlock()
		conn.WriteMessage(
			websocket.CloseMessage,
			websocket.FormatCloseMessage(
				websocket.CloseNormalClosure,
				"Connection already exists",
			),
		)
		conn.Close()
		return errors.New("connection already exists")
	}

	// Register new connection
	g.connections.connections[playerID] = conn
	g.connections.mu.Unlock()

	// Send initial state to the newly connected player (and anyone else watching).
	go g.broadcastState()
	return nil
}

func (g *Game) UnregisterConnection(playerID string) {
	g.connections.mu.Lock()
	_, existed := g.connections.connections[playerID]
	if existed {
		delete(g.connections.connections, playerID)
	}
	g.connections.mu.Unlock()

	if !existed {
		return
	}

	// If one of the two players dropped, tell the remaining player so their client
	// can return to the lobby rather than waiting on a dead opponent.
	if g.IsPlayerInGame(playerID) {
		g.broadcastMessage(ws.Message{
			Type:    ws.MessageTypeOpponentLeft,
			Payload: json.RawMessage(`{}`),
		})
	}
}

func (g *Game) broadcastState() {
	jsonGameState, err := json.Marshal(g.state)
	if err != nil {
		log.Printf("failed to marshal game state: %v", err)
		return
	}
	g.broadcastMessage(ws.Message{
		Type:    ws.MessageTypeGameState,
		Payload: json.RawMessage(jsonGameState),
	})
}

// broadcastMessage sends a message to every connection in the game. It snapshots
// the connection set under a read lock, then writes without holding any lock so a
// failed/slow write can never deadlock against the connection mutex.
func (g *Game) broadcastMessage(msg ws.Message) {
	g.connections.mu.RLock()
	activeConnections := make(map[string]*websocket.Conn, len(g.connections.connections))
	for playerID, conn := range g.connections.connections {
		activeConnections[playerID] = conn
	}
	g.connections.mu.RUnlock()

	var failed []string
	for playerID, conn := range activeConnections {
		if err := conn.WriteJSON(msg); err != nil {
			log.Printf("failed to send message to player %s: %v", playerID, err)
			failed = append(failed, playerID)
		}
	}

	if len(failed) > 0 {
		g.connections.mu.Lock()
		for _, playerID := range failed {
			delete(g.connections.connections, playerID)
		}
		g.connections.mu.Unlock()
	}
}
