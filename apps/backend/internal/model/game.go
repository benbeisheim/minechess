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

// writeTimeout bounds a single frame write, so one wedged client cannot stall the
// game's broadcasts. A connection that trips it is dropped.
const writeTimeout = 10 * time.Second

// gameConn wraps a client connection with its own write mutex. The websocket
// library supports only one concurrent writer per connection, and state
// broadcasts, "opponent left" notices and per-move errors are all produced by
// different goroutines.
type gameConn struct {
	conn *websocket.Conn
	mu   sync.Mutex
}

func (c *gameConn) writeJSON(v any) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if err := c.conn.SetWriteDeadline(time.Now().Add(writeTimeout)); err != nil {
		return err
	}
	return c.conn.WriteJSON(v)
}

// The connections for a specific game
type GameConnections struct {
	connections map[string]*gameConn // playerID -> connection
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

	// started is set once both players are seated and white's clock is running.
	started bool
	// flagTimer fires when the side to move runs out of time.
	flagTimer *time.Timer
	// lastActivity is used by the manager to reap abandoned games.
	lastActivity time.Time

	// broadcastMu serialises state pushes. Snapshotting the state under it keeps
	// clients from ever receiving an older state after a newer one.
	broadcastMu sync.Mutex

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
	// AwaitingInitialMine is true until black arms the opening mine. The game now
	// starts with that placement rather than with white's first move.
	AwaitingInitialMine bool `json:"awaitingInitialMine"`
	// MinesEnabled goes false for good once either side is reduced to a lone king;
	// from that point the game continues as regular chess.
	MinesEnabled bool `json:"minesEnabled"`
}

type CapturedPieces struct {
	White []Piece `json:"white"`
	Black []Piece `json:"black"`
}

func NewGame(id string) *Game {
	return &Game{
		ID:           id,
		mu:           sync.Mutex{},
		state:        newGameState(),
		connections:  NewGameConnections(),
		whiteClock:   NewClock(time.Duration(1200) * time.Second),
		blackClock:   NewClock(time.Duration(1200) * time.Second),
		lastActivity: time.Now(),
	}
}

func NewGameConnections() *GameConnections {
	return &GameConnections{
		connections: make(map[string]*gameConn),
	}
}

func newGameState() GameState {
	return GameState{
		Sound: "",
		Board: newBoard(),
		// Black opens the game by arming a mine, so black is on move first.
		ToMove:          "black",
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
		AwaitingInitialMine:      true,
		MinesEnabled:             true,
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

// GetState returns a deep copy of the game state. A shallow copy would hand the
// caller the live board (and slices) which the game keeps mutating, so anything
// read or marshalled outside the lock would race with the next move.
func (g *Game) GetState() GameState {
	g.mu.Lock()
	defer g.mu.Unlock()

	return g.state.clone()
}

func (state GameState) clone() GameState {
	c := state

	if state.Board != nil {
		board := &BoardState{
			Board:             make([][]*Piece, len(state.Board.Board)),
			WhiteKingPosition: state.Board.WhiteKingPosition,
			BlackKingPosition: state.Board.BlackKingPosition,
		}
		for y, row := range state.Board.Board {
			board.Board[y] = make([]*Piece, len(row))
			for x, piece := range row {
				if piece != nil {
					pieceCopy := *piece
					board.Board[y][x] = &pieceCopy
				}
			}
		}
		c.Board = board
	}

	c.MoveHistory = append([]Move(nil), state.MoveHistory...)
	c.LegalMoves = append([]Position(nil), state.LegalMoves...)
	c.CapturedPieces = CapturedPieces{
		White: append([]Piece(nil), state.CapturedPieces.White...),
		Black: append([]Piece(nil), state.CapturedPieces.Black...),
	}
	c.WhiteKingAttackedSquares = append([]Position(nil), state.WhiteKingAttackedSquares...)
	c.BlackKingAttackedSquares = append([]Position(nil), state.BlackKingAttackedSquares...)

	c.SelectedSquare = clonePosition(state.SelectedSquare)
	c.EnPassantTarget = clonePosition(state.EnPassantTarget)
	c.Mine = clonePosition(state.Mine)
	c.LastMine = clonePosition(state.LastMine)
	c.PromotionSquare = clonePosition(state.PromotionSquare)
	c.PendingMoveDestination = clonePosition(state.PendingMoveDestination)
	c.Explosion = clonePosition(state.Explosion)
	if state.Resolve != nil {
		resolve := *state.Resolve
		c.Resolve = &resolve
	}
	if state.PromotionPiece != nil {
		promotionPiece := *state.PromotionPiece
		c.PromotionPiece = &promotionPiece
	}
	if state.LastMove != nil {
		lastMove := *state.LastMove
		c.LastMove = &lastMove
	}

	return c
}

func clonePosition(p *Position) *Position {
	if p == nil {
		return nil
	}
	c := *p
	return &c
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

// MakeMove applies playerID's move and pushes the resulting state to every
// connection. When a move is rejected as illegal the current state is pushed too,
// so a client whose local board has drifted can resynchronise.
func (g *Game) MakeMove(playerID string, move WSMove) error {
	resync, err := g.applyMove(playerID, move)
	if err == nil || resync {
		g.broadcastState()
	}
	return err
}

func (g *Game) applyMove(playerID string, move WSMove) (resync bool, err error) {
	g.mu.Lock()
	defer g.mu.Unlock()

	if g.state.Resolve != nil {
		return false, errors.New("game is already over")
	}
	if g.state.Players.White.ID == "" || g.state.Players.Black.ID == "" {
		return false, errors.New("waiting for an opponent to join")
	}

	// Only the player whose turn it is may move. Without this check any connected
	// client — including a spectator — could move either side's pieces.
	playerColor := g.colorOf(playerID)
	if playerColor == "" {
		return false, errors.New("not a player in this game")
	}
	// From here on the sender is a player in this game, so every rejection is worth
	// answering with the current state: their local board has drifted from the
	// server's and the push is what lets them recover.
	if playerColor != g.state.ToMove {
		return true, errors.New("not your turn")
	}
	if g.state.AwaitingInitialMine {
		return true, errors.New("black must place the opening mine first")
	}

	// Guard against out-of-bounds coordinates before indexing the board.
	if !isValidPosition(move.From) || !isValidPosition(move.To) {
		return true, errors.New("invalid move, out of bounds")
	}

	piece := g.state.Board.Board[move.From.Y][move.From.X]
	if piece == nil {
		return true, errors.New("no piece at from square")
	}

	if g.state.ToMove != piece.Color {
		return true, errors.New("not your piece")
	}

	// Validate the move, the promotion choice and the mine before touching state.
	if err := g.validateMove(move); err != nil {
		return true, err
	}
	promotion, err := resolvePromotion(piece, move)
	if err != nil {
		return true, err
	}
	move.Promotion = promotion
	// A move that leaves either side with nothing but a king ends the mine mechanic,
	// so it carries no mine; anything the client sent with it is dropped.
	if g.minesActiveAfterMove(move.From, move.To) {
		if err := g.validateMinePlacement(move); err != nil {
			return true, err
		}
	} else {
		move.Mine = nil
	}

	g.clockFor(g.state.ToMove).Stop()

	if err := g.executeMove(move); err != nil {
		return true, err
	}

	if g.state.Resolve == nil {
		// Start opposing player's clock and re-arm the flag timer for them.
		g.clockFor(g.state.ToMove).Start()
		g.armFlagTimer(g.state.ToMove)
	} else {
		g.endClocks()
	}

	// update client clock for both players
	g.state.Players.White.TimeLeft = g.whiteClock.Deciseconds()
	g.state.Players.Black.TimeLeft = g.blackClock.Deciseconds()
	g.lastActivity = time.Now()

	return false, nil
}

// PlaceInitialMine applies black's opening mine and pushes the resulting state.
// The game starts with this placement: white cannot move until it is down.
func (g *Game) PlaceInitialMine(playerID string, mine Position) error {
	resync, err := g.applyInitialMine(playerID, mine)
	if err == nil || resync {
		g.broadcastState()
	}
	return err
}

func (g *Game) applyInitialMine(playerID string, mine Position) (resync bool, err error) {
	g.mu.Lock()
	defer g.mu.Unlock()

	if g.state.Resolve != nil {
		return false, errors.New("game is already over")
	}
	if g.state.Players.White.ID == "" || g.state.Players.Black.ID == "" {
		return false, errors.New("waiting for an opponent to join")
	}
	if g.colorOf(playerID) != "black" {
		return false, errors.New("only black places the opening mine")
	}
	if !g.state.AwaitingInitialMine {
		return true, errors.New("the opening mine has already been placed")
	}

	// The opening mine goes on the board as it stands, so the placement rule is
	// applied to the current position rather than to a position after a move.
	if err := validateMineSquare(mine, g.occupiedSquares(), g.currentKingAdjacency()); err != nil {
		return true, err
	}

	g.clockFor(g.state.ToMove).Stop()

	mineCopy := mine
	g.mine = &mineCopy
	g.state.AwaitingInitialMine = false
	g.state.Sound = "minePlaced"

	// Hand the move to white, exactly as completing a move does.
	g.switchTurn()
	g.clockFor(g.state.ToMove).Start()
	g.armFlagTimer(g.state.ToMove)

	g.state.Players.White.TimeLeft = g.whiteClock.Deciseconds()
	g.state.Players.Black.TimeLeft = g.blackClock.Deciseconds()
	g.lastActivity = time.Now()

	return false, nil
}

// colorOf returns the colour playerID is seated as, or "" if they are only a
// spectator. Callers must hold g.mu.
func (g *Game) colorOf(playerID string) string {
	if playerID == "" {
		return ""
	}
	switch playerID {
	case g.state.Players.White.ID:
		return "white"
	case g.state.Players.Black.ID:
		return "black"
	}
	return ""
}

func (g *Game) clockFor(color string) *Clock {
	if color == "black" {
		return g.blackClock
	}
	return g.whiteClock
}

// resolvePromotion settles what the moving piece becomes. A pawn reaching the back
// rank must become something: defaulting to a queen keeps a pawn from being left on
// rank 1/8, where move generation would run off the board. A promotion piece sent
// with an ordinary move is ignored, but one that is not a real promotion piece is
// refused outright — the server used to apply it blindly, so a client could promote
// itself a second king.
func resolvePromotion(piece *Piece, move WSMove) (PieceType, error) {
	if move.Promotion != "" {
		switch move.Promotion {
		case Queen, Rook, Bishop, Knight:
		default:
			return "", fmt.Errorf("invalid promotion piece: %s", move.Promotion)
		}
	}

	if piece.Type != Pawn || (move.To.Y != 0 && move.To.Y != 7) {
		return "", nil
	}
	if move.Promotion == "" {
		return Queen, nil
	}
	return move.Promotion, nil
}

// startIfReady starts the clock of the side to move the first time both players are
// seated. That is black, whose opening mine placement is timed like any other turn.
// Callers must hold g.mu.
func (g *Game) startIfReady() {
	if g.started || g.state.Resolve != nil {
		return
	}
	if g.state.Players.White.ID == "" || g.state.Players.Black.ID == "" {
		return
	}
	g.started = true
	g.clockFor(g.state.ToMove).Start()
	g.armFlagTimer(g.state.ToMove)
}

// armFlagTimer schedules the flag fall for the side to move. Callers must hold g.mu.
func (g *Game) armFlagTimer(color string) {
	g.disarmFlagTimer()

	remaining := g.clockFor(color).TimeLeft()
	if remaining <= 0 {
		remaining = time.Millisecond
	}
	flagged := color
	g.flagTimer = time.AfterFunc(remaining, func() { g.flagFall(flagged) })
}

// disarmFlagTimer cancels any pending flag fall. Callers must hold g.mu.
func (g *Game) disarmFlagTimer() {
	if g.flagTimer != nil {
		g.flagTimer.Stop()
		g.flagTimer = nil
	}
}

// endClocks stops both clocks once the game is decided. Callers must hold g.mu.
func (g *Game) endClocks() {
	g.disarmFlagTimer()
	g.whiteClock.Stop()
	g.blackClock.Stop()
}

// flagFall ends the game when the side to move runs out of time. Previously the
// clocks were purely decorative: they could run past zero forever because nothing
// on the server ever noticed.
func (g *Game) flagFall(color string) {
	g.mu.Lock()
	if g.state.Resolve != nil || g.state.ToMove != color || g.clockFor(color).TimeLeft() > 0 {
		g.mu.Unlock()
		return
	}

	g.endClocks()
	result := getOtherColor(color) + " wins on time"
	g.state.Resolve = &result
	g.state.Sound = ""
	g.state.Players.White.TimeLeft = g.whiteClock.Deciseconds()
	g.state.Players.Black.TimeLeft = g.blackClock.Deciseconds()
	g.mu.Unlock()

	g.broadcastState()
}

// Close releases the game's background resources.
func (g *Game) Close() {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.endClocks()
}

// IdleSince reports when the game last saw a move or a connection.
func (g *Game) IdleSince() time.Time {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.lastActivity
}

// ConnectionCount is the number of clients currently attached to this game.
func (g *Game) ConnectionCount() int {
	g.connections.mu.RLock()
	defer g.connections.mu.RUnlock()
	return len(g.connections.connections)
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

	if g.state.ToMove != "white" && g.state.ToMove != "black" {
		return fmt.Errorf("invalid turn state: %s", g.state.ToMove)
	}

	ply := g.makePly(move)
	g.state.Sound = "" // clear last turns sounds

	// A piece standing on the destination is captured whether or not the square is
	// mined; recording it only on the non-explosion path used to drop it from the
	// graveyard and material count for the rest of the game.
	targetPiece := g.state.Board.Board[move.To.Y][move.To.X]
	if targetPiece != nil {
		switch g.state.ToMove {
		case "white":
			g.state.CapturedPieces.White = append(g.state.CapturedPieces.White, *targetPiece)
		case "black":
			g.state.CapturedPieces.Black = append(g.state.CapturedPieces.Black, *targetPiece)
		}
	}

	switch {
	case g.mine != nil && move.To == *g.mine && piece.Type != Pawn:
		g.state.Sound = "explosion"
	case targetPiece != nil:
		g.state.Sound = "capture"
	default:
		g.state.Sound = "move"
	}

	// Move the piece
	g.state.Board.Board[move.From.Y][move.From.X] = nil
	g.state.Board.Board[move.To.Y][move.To.X] = piece

	// Update piece state
	movedType := piece.Type // the type before any promotion changes it
	piece.HasMoved = true
	piece.Position = move.To

	// Handle promotion
	if move.Promotion != "" {
		piece.Type = move.Promotion
	}

	// Handle special moves based on piece type
	if movedType == King {
		ply = g.handleCastle(move, ply)
		switch g.state.ToMove {
		case "white":
			g.state.Board.WhiteKingPosition = move.To
		case "black":
			g.state.Board.BlackKingPosition = move.To
		}
	} else if movedType == Pawn {
		ply = g.handleEnPassant(move, ply)
	}

	// The en passant target is only live for the single ply after a double pawn
	// push. It used to be updated inside the pawn branch alone, so any other move
	// left a stale target behind — long enough for a pawn to "capture en passant"
	// onto an empty square, which then dereferenced the pawn that was not there.
	if movedType == Pawn && abs(move.To.Y-move.From.Y) == 2 {
		g.state.EnPassantTarget = &Position{X: move.To.X, Y: (move.From.Y + move.To.Y) / 2}
	} else {
		g.state.EnPassantTarget = nil
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
	if g.mine != nil && move.To == *g.mine && piece.Type != King && piece.Type != Pawn {
		explosionSquare := move.To
		g.state.Explosion = &explosionSquare

		// The piece that stepped on the mine is lost; credit it to the opponent.
		switch g.state.ToMove {
		case "white":
			g.state.CapturedPieces.Black = append(g.state.CapturedPieces.Black, *piece)
		case "black":
			g.state.CapturedPieces.White = append(g.state.CapturedPieces.White, *piece)
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

	// Mines leave the game for good the moment either side is down to a lone king.
	// From then on this is ordinary chess, so nothing stays armed and the expired
	// mine marker is cleared rather than sitting on the board for the rest of the
	// game.
	g.state.MinesEnabled = g.minesActive()
	if g.state.MinesEnabled {
		if g.mine != nil {
			mineCopy := *g.mine
			g.state.LastMine = &mineCopy
		}
		g.mine = clonePosition(move.Mine)
	} else {
		g.mine = nil
		g.state.LastMine = nil
	}

	// Switch turn and check game state
	g.switchTurn()
	g.state.IsCheck = isKingInCheck(g.state.Board, g.state.ToMove)

	// A Bombmate already decided the game; don't let the mate/stalemate scan below
	// overwrite it with the opposite result.
	if g.state.Resolve == nil && g.isNoLegalMoves(g.state.ToMove) {
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

	return nil
}

func isValidPosition(pos Position) bool {
	return pos.X >= 0 && pos.X < 8 && pos.Y >= 0 && pos.Y < 8
}

// validateMinePlacement enforces the mine rules server-side for the mine that comes
// with a move: the square must be on the board, empty once the move lands, and not
// one either king could step onto. The server used to accept whatever square the
// client sent.
func (g *Game) validateMinePlacement(move WSMove) error {
	if move.Mine == nil {
		return errors.New("invalid move, no mine placed")
	}
	return validateMineSquare(*move.Mine, g.occupancyAfterMove(move.From, move.To), g.kingAdjacencyAfterMove(move.From, move.To))
}

// validateMineSquare is the placement rule itself. The opening mine is checked
// against the board as it stands, a move's mine against the board the move leads to.
func validateMineSquare(mine Position, occupied, kingAdjacent map[Position]bool) error {
	if !isValidPosition(mine) {
		return errors.New("invalid mine, out of bounds")
	}
	if occupied[mine] {
		return errors.New("invalid mine, square is occupied")
	}
	if kingAdjacent[mine] {
		return errors.New("invalid mine, square is adjacent to a king")
	}
	return nil
}

// occupiedSquares reports which squares hold a piece in the current position.
func (g *Game) occupiedSquares() map[Position]bool {
	occupied := make(map[Position]bool, 32)
	for y := 0; y < 8; y++ {
		for x := 0; x < 8; x++ {
			if g.state.Board.Board[y][x] != nil {
				occupied[Position{X: x, Y: y}] = true
			}
		}
	}
	return occupied
}

// minesActive reports whether the mine mechanic still applies. It is dropped as soon
// as either player has nothing but their king left, and the game plays on as regular
// chess from there.
func (g *Game) minesActive() bool {
	white, black := g.nonKingCounts()
	return white > 0 && black > 0
}

// minesActiveAfterMove is minesActive for the position the given move leads to, which
// is what decides whether that move has to carry a mine. A capture is the only way a
// move itself can reduce a side to a lone king; a mine the move sets off is accounted
// for afterwards, when the move has been applied.
func (g *Game) minesActiveAfterMove(from, to Position) bool {
	white, black := g.nonKingCounts()
	remove := func(color string) {
		if color == "white" {
			white--
		} else {
			black--
		}
	}

	if captured := g.state.Board.Board[to.Y][to.X]; captured != nil && captured.Type != King {
		remove(captured.Color)
	}
	piece := g.state.Board.Board[from.Y][from.X]
	if piece != nil && piece.Type == Pawn && g.state.EnPassantTarget != nil && to == *g.state.EnPassantTarget {
		remove(getOtherColor(piece.Color))
	}

	return white > 0 && black > 0
}

// nonKingCounts is how many pieces besides the king each side has on the board.
func (g *Game) nonKingCounts() (white, black int) {
	for y := 0; y < 8; y++ {
		for x := 0; x < 8; x++ {
			piece := g.state.Board.Board[y][x]
			if piece == nil || piece.Type == King {
				continue
			}
			if piece.Color == "white" {
				white++
			} else {
				black++
			}
		}
	}
	return white, black
}

// occupancyAfterMove reports which squares hold a piece once the given move lands,
// accounting for the vacated square, an en passant capture and a castling rook.
// This mirrors the board the client places its mine on.
func (g *Game) occupancyAfterMove(from, to Position) map[Position]bool {
	occupied := g.occupiedSquares()

	piece := g.state.Board.Board[from.Y][from.X]
	delete(occupied, from)
	occupied[to] = true
	if piece == nil {
		return occupied
	}

	if piece.Type == Pawn && g.state.EnPassantTarget != nil && to == *g.state.EnPassantTarget {
		captured := Position{X: to.X, Y: to.Y + 1}
		if piece.Color == "black" {
			captured = Position{X: to.X, Y: to.Y - 1}
		}
		delete(occupied, captured)
	}

	if piece.Type == King && abs(from.X-to.X) == 2 {
		switch to.X {
		case 2:
			delete(occupied, Position{X: 0, Y: from.Y})
			occupied[Position{X: 3, Y: from.Y}] = true
		case 6:
			delete(occupied, Position{X: 7, Y: from.Y})
			occupied[Position{X: 5, Y: from.Y}] = true
		}
	}

	return occupied
}

// currentKingAdjacency is the set of squares either king could step onto right now.
func (g *Game) currentKingAdjacency() map[Position]bool {
	return kingAdjacency(g.state.Board.WhiteKingPosition, g.state.Board.BlackKingPosition)
}

// kingAdjacencyAfterMove is the set of squares either king could step onto once the
// given move lands — the squares mines may not be placed on.
func (g *Game) kingAdjacencyAfterMove(from, to Position) map[Position]bool {
	whiteKing, blackKing := g.state.Board.WhiteKingPosition, g.state.Board.BlackKingPosition
	if piece := g.state.Board.Board[from.Y][from.X]; piece != nil && piece.Type == King {
		if piece.Color == "white" {
			whiteKing = to
		} else {
			blackKing = to
		}
	}
	return kingAdjacency(whiteKing, blackKing)
}

// kingAdjacency is the set of squares adjacent to the given kings.
func kingAdjacency(kings ...Position) map[Position]bool {
	adjacent := make(map[Position]bool, 16)
	for _, king := range kings {
		for dy := -1; dy <= 1; dy++ {
			for dx := -1; dx <= 1; dx++ {
				if dx == 0 && dy == 0 {
					continue
				}
				square := Position{X: king.X + dx, Y: king.Y + dy}
				if boundaryCheck(square) {
					adjacent[square] = true
				}
			}
		}
	}
	return adjacent
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
	// A pawn on the last rank has no moves. It should always have promoted, but a
	// stray one would otherwise index the board out of bounds and panic the server.
	forwardY := piece.Position.Y + dir.Y
	if forwardY < 0 || forwardY > 7 {
		return pawnMoves
	}
	// Check move forward 1
	if g.state.Board.Board[forwardY][piece.Position.X] == nil {
		pawnMoves = append(pawnMoves, SimpleMove{From: piece.Position, To: Position{X: piece.Position.X, Y: forwardY}})
		// Check move forward 2 if not moved
		doubleY := piece.Position.Y + dir.Y*2
		if !piece.HasMoved && doubleY >= 0 && doubleY <= 7 && g.state.Board.Board[doubleY][piece.Position.X] == nil {
			pawnMoves = append(pawnMoves, SimpleMove{From: piece.Position, To: Position{X: piece.Position.X, Y: doubleY}})
		}
	}
	// Check capture left
	if piece.Position.X > 0 && g.state.Board.Board[forwardY][piece.Position.X-1] != nil && g.state.Board.Board[forwardY][piece.Position.X-1].Color != piece.Color {
		pawnMoves = append(pawnMoves, SimpleMove{From: piece.Position, To: Position{X: piece.Position.X - 1, Y: forwardY}})
	}
	// Check capture right
	if piece.Position.X < 7 && g.state.Board.Board[forwardY][piece.Position.X+1] != nil && g.state.Board.Board[forwardY][piece.Position.X+1].Color != piece.Color {
		pawnMoves = append(pawnMoves, SimpleMove{From: piece.Position, To: Position{X: piece.Position.X + 1, Y: forwardY}})
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
	// Check for castle moves. A king may not castle out of, through or into check;
	// only the destination square used to be checked (by filterLegalMoves).
	if !piece.HasMoved && piece.Position.X == 4 {
		opponent := getOtherColor(piece.Color)
		if !isSquareAttacked(g.state.Board, opponent, piece.Position) {
			if g.canCastle(piece, 0, []int{1, 2, 3}, 3, opponent) {
				kingMoves = append(kingMoves, SimpleMove{From: piece.Position, To: Position{X: piece.Position.X - 2, Y: piece.Position.Y}})
			}
			if g.canCastle(piece, 7, []int{5, 6}, 5, opponent) {
				kingMoves = append(kingMoves, SimpleMove{From: piece.Position, To: Position{X: piece.Position.X + 2, Y: piece.Position.Y}})
			}
		}
	}
	return kingMoves
}

// canCastle reports whether the king may castle with the rook on file rookX.
// betweenFiles must be empty and passFile — the square the king steps over — must
// not be attacked. The destination square is covered by filterLegalMoves.
func (g *Game) canCastle(king *Piece, rookX int, betweenFiles []int, passFile int, opponent string) bool {
	y := king.Position.Y

	rook := g.state.Board.Board[y][rookX]
	if rook == nil || rook.Type != Rook || rook.Color != king.Color || rook.HasMoved {
		return false
	}
	for _, x := range betweenFiles {
		if g.state.Board.Board[y][x] != nil {
			return false
		}
	}
	return !isSquareAttacked(g.state.Board, opponent, Position{X: passFile, Y: y})
}

// handleEnPassant removes the pawn captured en passant. The en passant target
// itself is updated by the caller, for every move rather than pawn moves only.
func (g *Game) handleEnPassant(move WSMove, ply Ply) Ply {
	if g.state.EnPassantTarget == nil || move.To != *g.state.EnPassantTarget {
		return ply
	}

	capturedY := move.To.Y + 1 // white captures a pawn on the rank below the target
	if g.state.ToMove == "black" {
		capturedY = move.To.Y - 1
	}
	if capturedY < 0 || capturedY > 7 {
		return ply
	}

	capturedPawn := g.state.Board.Board[capturedY][move.To.X]
	if capturedPawn == nil {
		return ply
	}

	switch g.state.ToMove {
	case "white":
		g.state.CapturedPieces.White = append(g.state.CapturedPieces.White, *capturedPawn)
	case "black":
		g.state.CapturedPieces.Black = append(g.state.CapturedPieces.Black, *capturedPawn)
	}
	g.state.Board.Board[capturedY][move.To.X] = nil
	ply.Notation = "x" + ply.Notation

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
	//
	// The pieces are copied rather than referenced: the history used to hold live
	// board pointers, so a recorded ply changed as the pieces in it moved on.
	return Ply{
		Piece:          copyPiece(g.state.Board.Board[move.From.Y][move.From.X]),
		From:           move.From,
		To:             move.To,
		CapturedPiece:  copyPiece(g.state.Board.Board[move.To.Y][move.To.X]),
		CastleRookMove: nil,
		Promotion:      move.Promotion,
		Notation:       g.getNotation(move),
	}
}

func copyPiece(piece *Piece) *Piece {
	if piece == nil {
		return nil
	}
	c := *piece
	return &c
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
	if isAuthorized {
		g.lastActivity = time.Now()
		// Both seats filled: white's clock starts now rather than on their reply to
		// black, which used to leave white's opening move untimed.
		g.startIfReady()
	}
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
	g.connections.connections[playerID] = &gameConn{conn: conn}
	g.connections.mu.Unlock()

	// Send initial state to the newly connected player (and anyone else watching).
	g.broadcastState()
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

// broadcastState pushes the current state to every connection. The state is
// marshalled under both g.mu (so it never races with the move being applied) and
// broadcastMu (so a client can never receive an older state after a newer one).
func (g *Game) broadcastState() {
	g.broadcastMu.Lock()
	defer g.broadcastMu.Unlock()

	g.mu.Lock()
	g.state.Players.White.TimeLeft = g.whiteClock.Deciseconds()
	g.state.Players.Black.TimeLeft = g.blackClock.Deciseconds()
	jsonGameState, err := json.Marshal(g.state)
	g.mu.Unlock()

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
	activeConnections := make(map[string]*gameConn, len(g.connections.connections))
	for playerID, conn := range g.connections.connections {
		activeConnections[playerID] = conn
	}
	g.connections.mu.RUnlock()

	var failed []string
	for playerID, conn := range activeConnections {
		if err := conn.writeJSON(msg); err != nil {
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

// SendError delivers a message to a single player over the connection they are
// registered with, so it is serialised against broadcasts on the same socket. It
// reports whether the player had a connection to send on.
func (g *Game) SendError(playerID string, message string) bool {
	g.connections.mu.RLock()
	conn, ok := g.connections.connections[playerID]
	g.connections.mu.RUnlock()

	if !ok {
		return false
	}

	payload, err := json.Marshal(struct {
		Message string `json:"message"`
	}{Message: message})
	if err != nil {
		log.Printf("failed to marshal error payload: %v", err)
		return true
	}

	if err := conn.writeJSON(ws.Message{Type: ws.MessageTypeError, Payload: payload}); err != nil {
		log.Printf("failed to send error to player %s: %v", playerID, err)
	}
	return true
}
