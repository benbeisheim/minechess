package model

import (
	"fmt"
	"math/rand"
	"strconv"
	"strings"
)

// BotPlayerID is the player ID the bot is seated under in a single-player game.
const BotPlayerID = "bot"

// EnableBot marks this game as a single-player game against the bot playing botColor.
func (g *Game) EnableBot(botColor string, difficulty int) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.isBot = true
	g.botColor = botColor
	g.botDifficulty = difficulty
}

// BotShouldMove reports whether it is currently the bot's turn in an unfinished
// bot game, returning the configured difficulty when so.
func (g *Game) BotShouldMove() (difficulty int, ok bool) {
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.isBot && g.state.Resolve == nil && !g.state.AwaitingInitialMine && g.state.ToMove == g.botColor {
		return g.botDifficulty, true
	}
	return 0, false
}

// BotShouldPlaceInitialMine reports whether the opening mine is the bot's to place,
// which it is whenever the bot is seated as black.
func (g *Game) BotShouldPlaceInitialMine() bool {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.isBot && g.state.Resolve == nil && g.state.AwaitingInitialMine && g.botColor == "black"
}

// BotInitialMine picks the bot's opening mine, on the board as it stands.
func (g *Game) BotInitialMine() Position {
	g.mu.Lock()
	defer g.mu.Unlock()
	return pickMine(g.occupiedSquares(), g.currentKingAdjacency(), g.state.Board.BlackKingPosition)
}

// FEN renders the current position as a standard FEN string for the bot service.
func (g *Game) FEN() string {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.toFEN()
}

func (g *Game) toFEN() string {
	var sb strings.Builder
	for y := 0; y < 8; y++ {
		empty := 0
		for x := 0; x < 8; x++ {
			piece := g.state.Board.Board[y][x]
			if piece == nil {
				empty++
				continue
			}
			if empty > 0 {
				sb.WriteString(strconv.Itoa(empty))
				empty = 0
			}
			sb.WriteByte(pieceFENChar(piece))
		}
		if empty > 0 {
			sb.WriteString(strconv.Itoa(empty))
		}
		if y < 7 {
			sb.WriteByte('/')
		}
	}

	side := "w"
	if g.state.ToMove == "black" {
		side = "b"
	}

	enPassant := "-"
	if g.state.EnPassantTarget != nil {
		enPassant = g.state.EnPassantTarget.getSquareNotation()
	}

	// Halfmove clock is not tracked; fullmove number is approximated from history.
	return fmt.Sprintf("%s %s %s %s 0 %d", sb.String(), side, g.castlingRights(), enPassant, len(g.state.MoveHistory)+1)
}

func pieceFENChar(piece *Piece) byte {
	var c byte
	switch piece.Type {
	case Pawn:
		c = 'p'
	case Knight:
		c = 'n'
	case Bishop:
		c = 'b'
	case Rook:
		c = 'r'
	case Queen:
		c = 'q'
	case King:
		c = 'k'
	}
	if piece.Color == "white" {
		c = c - 'a' + 'A'
	}
	return c
}

func (g *Game) castlingRights() string {
	b := g.state.Board.Board
	var rights strings.Builder

	// White pieces live on rank 1 (row index 7), black on rank 8 (row index 0).
	if k := b[7][4]; k != nil && k.Type == King && k.Color == "white" && !k.HasMoved {
		if r := b[7][7]; r != nil && r.Type == Rook && !r.HasMoved {
			rights.WriteByte('K')
		}
		if r := b[7][0]; r != nil && r.Type == Rook && !r.HasMoved {
			rights.WriteByte('Q')
		}
	}
	if k := b[0][4]; k != nil && k.Type == King && k.Color == "black" && !k.HasMoved {
		if r := b[0][7]; r != nil && r.Type == Rook && !r.HasMoved {
			rights.WriteByte('k')
		}
		if r := b[0][0]; r != nil && r.Type == Rook && !r.HasMoved {
			rights.WriteByte('q')
		}
	}

	if rights.Len() == 0 {
		return "-"
	}
	return rights.String()
}

// parseUCI converts a UCI move (e.g. "e2e4", "e7e8q") into board coordinates.
func parseUCI(uci string) (from, to Position, promotion PieceType, ok bool) {
	if len(uci) < 4 {
		return Position{}, Position{}, "", false
	}
	fromFile, fromRank := int(uci[0]-'a'), int(uci[1]-'0')
	toFile, toRank := int(uci[2]-'a'), int(uci[3]-'0')
	if fromFile < 0 || fromFile > 7 || toFile < 0 || toFile > 7 || fromRank < 1 || fromRank > 8 || toRank < 1 || toRank > 8 {
		return Position{}, Position{}, "", false
	}
	from = Position{X: fromFile, Y: 8 - fromRank}
	to = Position{X: toFile, Y: 8 - toRank}
	if len(uci) >= 5 {
		switch uci[4] {
		case 'q':
			promotion = Queen
		case 'r':
			promotion = Rook
		case 'b':
			promotion = Bishop
		case 'n':
			promotion = Knight
		}
	}
	return from, to, promotion, true
}

// BotMove turns the bot service's suggestion (a UCI move and an algebraic mine
// square) into a concrete MineChess move. If the move is empty or not legal in the
// current position, a random legal move is chosen; if the mine square is empty or
// unparseable, one is picked here as a fallback. ok is false only when the bot has
// no legal moves.
func (g *Game) BotMove(uci, mineSquare string) (WSMove, bool) {
	g.mu.Lock()
	defer g.mu.Unlock()

	legalMoves := g.getLegalMovesForColor(g.botColor)
	if len(legalMoves) == 0 {
		return WSMove{}, false
	}

	var chosen SimpleMove
	var promotion PieceType
	found := false
	if from, to, promo, valid := parseUCI(uci); valid {
		for _, m := range legalMoves {
			if m.From == from && m.To == to {
				chosen, promotion, found = m, promo, true
				break
			}
		}
	}
	if !found {
		chosen = legalMoves[rand.Intn(len(legalMoves))]
	}

	// Default a pawn reaching the back rank to a queen when no piece was specified.
	if piece := g.state.Board.Board[chosen.From.Y][chosen.From.X]; piece != nil &&
		piece.Type == Pawn && (chosen.To.Y == 0 || chosen.To.Y == 7) && promotion == "" {
		promotion = Queen
	}

	// Once either side is down to a lone king the mine mechanic is dropped, and the
	// bot's move carries no mine at all.
	if !g.minesActiveAfterMove(chosen.From, chosen.To) {
		return WSMove{From: chosen.From, To: chosen.To, Promotion: promotion}, true
	}

	// Prefer the bot service's mine; fall back to a locally chosen square when the
	// bot took a different (random) move or supplied no usable square. The suggested
	// square is checked against the placement rules the server now enforces —
	// otherwise an illegal suggestion would get the bot's whole move rejected and
	// the game would sit waiting for a reply that never comes.
	mine, ok := parseSquare(mineSquare)
	if !found || !ok || g.validateMinePlacement(WSMove{From: chosen.From, To: chosen.To, Mine: &mine}) != nil {
		mine = g.pickBotMine(chosen)
	}

	return WSMove{From: chosen.From, To: chosen.To, Promotion: promotion, Mine: &mine}, true
}

// parseSquare converts an algebraic square (e.g. "e4") into board coordinates.
func parseSquare(square string) (Position, bool) {
	if len(square) != 2 {
		return Position{}, false
	}
	file, rank := int(square[0]-'a'), int(square[1]-'0')
	if file < 0 || file > 7 || rank < 1 || rank > 8 {
		return Position{}, false
	}
	return Position{X: file, Y: 8 - rank}, true
}

// pickBotMine chooses a mine square for the bot given the move it is about to make.
// It targets squares that will be empty after the move and that neither king can step
// onto, matching the placement rule human players follow.
func (g *Game) pickBotMine(move SimpleMove) Position {
	return pickMine(g.occupancyAfterMove(move.From, move.To), g.kingAdjacencyAfterMove(move.From, move.To), move.From)
}

// pickMine picks a random square that is empty and not king-adjacent, falling back to
// any empty square and finally to fallback when the position leaves no legal choice.
func pickMine(occupied, blocked map[Position]bool, fallback Position) Position {
	candidates := make([]Position, 0, 32)
	for y := 0; y < 8; y++ {
		for x := 0; x < 8; x++ {
			p := Position{X: x, Y: y}
			if !occupied[p] && !blocked[p] {
				candidates = append(candidates, p)
			}
		}
	}
	if len(candidates) > 0 {
		return candidates[rand.Intn(len(candidates))]
	}

	// Fall back to any empty square if every legal mine square is king-adjacent.
	for y := 0; y < 8; y++ {
		for x := 0; x < 8; x++ {
			if p := (Position{X: x, Y: y}); !occupied[p] {
				return p
			}
		}
	}
	return fallback
}
