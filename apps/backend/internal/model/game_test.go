package model

import "testing"

const (
	whitePlayer = "white-player"
	blackPlayer = "black-player"
)

func newStartedGame(t *testing.T) *Game {
	t.Helper()
	g := NewGame("test")
	if _, err := g.AddPlayer(whitePlayer); err != nil {
		t.Fatalf("AddPlayer white: %v", err)
	}
	if _, err := g.AddPlayer(blackPlayer); err != nil {
		t.Fatalf("AddPlayer black: %v", err)
	}
	return g
}

// newEmptyGame is a started game with a bare board, so tests can set up exactly the
// position they care about. Both kings are placed on their home squares.
func newEmptyGame(t *testing.T) *Game {
	t.Helper()
	g := newStartedGame(t)
	for y := 0; y < 8; y++ {
		for x := 0; x < 8; x++ {
			g.state.Board.Board[y][x] = nil
		}
	}
	g.place(King, "white", Position{X: 4, Y: 7})
	g.place(King, "black", Position{X: 4, Y: 0})
	return g
}

func (g *Game) place(pieceType PieceType, color string, at Position) *Piece {
	piece := &Piece{Type: pieceType, Color: color, Position: at, HasMoved: false}
	g.state.Board.Board[at.Y][at.X] = piece
	if pieceType == King {
		if color == "white" {
			g.state.Board.WhiteKingPosition = at
		} else {
			g.state.Board.BlackKingPosition = at
		}
	}
	return piece
}

// e2-e4, the move most tests open with. Files a-h are X 0-7 and ranks run from the
// top, so white's pawns start on Y=6.
func openingMove(mine Position) WSMove {
	return WSMove{From: Position{X: 4, Y: 6}, To: Position{X: 4, Y: 4}, Mine: mine}
}

// MakeMove must reject out-of-bounds coordinates without panicking (previously it
// indexed the board before validating bounds).
func TestMakeMoveOutOfBoundsReturnsError(t *testing.T) {
	g := newStartedGame(t)
	err := g.MakeMove(whitePlayer, WSMove{From: Position{X: 0, Y: 9}, To: Position{X: 0, Y: 4}, Mine: Position{X: 0, Y: 4}})
	if err == nil {
		t.Fatal("expected an error for an out-of-bounds move, got nil")
	}
}

// MakeMove must reject a move from an empty square without panicking (previously it
// dereferenced a nil piece to read its colour).
func TestMakeMoveFromEmptySquareReturnsError(t *testing.T) {
	g := newStartedGame(t)
	err := g.MakeMove(whitePlayer, WSMove{From: Position{X: 4, Y: 4}, To: Position{X: 4, Y: 3}, Mine: Position{X: 0, Y: 4}})
	if err == nil {
		t.Fatal("expected an error for a move from an empty square, got nil")
	}
}

// A legal opening move should succeed and advance the turn to black.
func TestMakeLegalOpeningMove(t *testing.T) {
	g := newStartedGame(t)
	err := g.MakeMove(whitePlayer, openingMove(Position{X: 0, Y: 4}))
	if err != nil {
		t.Fatalf("expected legal move to succeed, got %v", err)
	}
	if got := g.GetState().ToMove; got != "black" {
		t.Fatalf("expected it to be black's turn after white's move, got %q", got)
	}
}

// Only the player to move may move: black must not be able to play white's pieces.
func TestMakeMoveRejectsTheWrongPlayer(t *testing.T) {
	g := newStartedGame(t)
	if err := g.MakeMove(blackPlayer, openingMove(Position{X: 0, Y: 4})); err == nil {
		t.Fatal("expected black to be refused white's move, got nil")
	}
	if got := g.GetState().ToMove; got != "white" {
		t.Fatalf("the rejected move should not have advanced the turn, got %q", got)
	}
}

// Spectators are allowed to watch, but never to move.
func TestMakeMoveRejectsSpectators(t *testing.T) {
	g := newStartedGame(t)
	if err := g.MakeMove("a-spectator", openingMove(Position{X: 0, Y: 4})); err == nil {
		t.Fatal("expected a spectator to be refused, got nil")
	}
}

// A decided game accepts no further moves.
func TestMakeMoveRejectedOnceResolved(t *testing.T) {
	g := newStartedGame(t)
	resolve := "white wins by Checkmate"
	g.state.Resolve = &resolve

	if err := g.MakeMove(whitePlayer, openingMove(Position{X: 0, Y: 4})); err == nil {
		t.Fatal("expected a finished game to refuse moves, got nil")
	}
}

// Mines may not be dropped on an occupied square or next to a king; the server used
// to accept whatever square the client sent.
func TestMakeMoveRejectsIllegalMinePlacement(t *testing.T) {
	tests := []struct {
		name string
		mine Position
	}{
		{"occupied square", Position{X: 0, Y: 6}}, // a2, still holding a pawn
		{"off the board", Position{X: 8, Y: 4}},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			g := newStartedGame(t)
			if err := g.MakeMove(whitePlayer, openingMove(tc.mine)); err == nil {
				t.Fatalf("expected mine on %+v to be rejected, got nil", tc.mine)
			}
		})
	}
}

// Mines may not be placed where a king could step. Every empty square is far from
// both kings in the opening position, so this needs a sparser board.
func TestMakeMoveRejectsMineNextToAKing(t *testing.T) {
	rookLift := func(mine Position) WSMove {
		return WSMove{From: Position{X: 0, Y: 7}, To: Position{X: 0, Y: 5}, Mine: mine}
	}

	g := newEmptyGame(t)
	g.place(Rook, "white", Position{X: 0, Y: 7}) // a1
	// d2 is empty here, but sits next to the white king on e1.
	if err := g.MakeMove(whitePlayer, rookLift(Position{X: 3, Y: 6})); err == nil {
		t.Fatal("expected a mine next to the king to be rejected, got nil")
	}

	// The same move with a mine well away from both kings is fine.
	g = newEmptyGame(t)
	g.place(Rook, "white", Position{X: 0, Y: 7})
	if err := g.MakeMove(whitePlayer, rookLift(Position{X: 7, Y: 4})); err != nil {
		t.Fatalf("expected a mine on h4 to be accepted, got %v", err)
	}
}

// A pawn reaching the last rank must promote. Left as a pawn it would sit on rank 8
// and panic move generation on the next turn.
func TestPawnPromotesByDefaultOnTheLastRank(t *testing.T) {
	g := newEmptyGame(t)
	g.place(Pawn, "white", Position{X: 0, Y: 1}) // a7

	err := g.MakeMove(whitePlayer, WSMove{
		From: Position{X: 0, Y: 1},
		To:   Position{X: 0, Y: 0},
		Mine: Position{X: 0, Y: 4},
	})
	if err != nil {
		t.Fatalf("expected the promotion move to succeed, got %v", err)
	}

	promoted := g.state.Board.Board[0][0]
	if promoted == nil || promoted.Type != Queen {
		t.Fatalf("expected a queen on a8, got %+v", promoted)
	}
	// Generating moves for the promoted piece must not run off the board.
	g.getLegalMovesForColor("white")
}

// A pawn may only promote to a real piece; a second king is not on offer.
func TestMakeMoveRejectsInvalidPromotion(t *testing.T) {
	g := newStartedGame(t)
	move := openingMove(Position{X: 0, Y: 4})
	move.Promotion = King

	if err := g.MakeMove(whitePlayer, move); err == nil {
		t.Fatal("expected promotion to a king to be rejected, got nil")
	}
}

// The client keeps its last promotion choice around until the next server state
// arrives, so an ordinary move may carry a stale promotion piece. That must be
// ignored rather than turning the pawn's neighbour into a queen.
func TestPromotionIgnoredOnAnOrdinaryMove(t *testing.T) {
	g := newStartedGame(t)
	move := openingMove(Position{X: 0, Y: 4})
	move.Promotion = Queen

	if err := g.MakeMove(whitePlayer, move); err != nil {
		t.Fatalf("expected the move to succeed, got %v", err)
	}
	if piece := g.state.Board.Board[4][4]; piece == nil || piece.Type != Pawn {
		t.Fatalf("expected the pawn to stay a pawn, got %+v", piece)
	}
}

// Capturing onto a mined square costs both pieces, and both must show up in the
// graveyard — the captured piece used to be dropped entirely.
func TestCaptureOnMinedSquareRecordsBothPieces(t *testing.T) {
	g := newEmptyGame(t)
	g.place(Rook, "white", Position{X: 0, Y: 7}) // a1
	g.place(Rook, "black", Position{X: 0, Y: 3}) // a5
	mined := Position{X: 0, Y: 3}
	g.mine = &mined

	err := g.MakeMove(whitePlayer, WSMove{
		From: Position{X: 0, Y: 7},
		To:   Position{X: 0, Y: 3},
		Mine: Position{X: 7, Y: 4},
	})
	if err != nil {
		t.Fatalf("expected the capture to succeed, got %v", err)
	}

	state := g.GetState()
	if len(state.CapturedPieces.White) != 1 {
		t.Fatalf("expected white to have captured the black rook, got %+v", state.CapturedPieces.White)
	}
	if len(state.CapturedPieces.Black) != 1 {
		t.Fatalf("expected the exploded white rook to be recorded, got %+v", state.CapturedPieces.Black)
	}
	if g.state.Board.Board[3][0] != nil {
		t.Fatal("expected the mined square to be empty after the explosion")
	}
}

// The en passant target must expire after a single ply. While it survived a
// non-pawn move, a pawn could "capture en passant" onto an empty square, and
// executing that move dereferenced the pawn that was not there.
func TestEnPassantTargetExpiresAfterANonPawnMove(t *testing.T) {
	g := newStartedGame(t)

	// 1. e4 — sets the en passant target on e3.
	if err := g.MakeMove(whitePlayer, openingMove(Position{X: 0, Y: 4})); err != nil {
		t.Fatalf("e4: %v", err)
	}
	if g.state.EnPassantTarget == nil {
		t.Fatal("expected a double pawn push to set the en passant target")
	}

	// 1... Nf6, a knight move: the target must be cleared.
	knight := WSMove{From: Position{X: 6, Y: 0}, To: Position{X: 5, Y: 2}, Mine: Position{X: 0, Y: 5}}
	if err := g.MakeMove(blackPlayer, knight); err != nil {
		t.Fatalf("Nf6: %v", err)
	}
	if g.state.EnPassantTarget != nil {
		t.Fatalf("expected the en passant target to expire, got %+v", g.state.EnPassantTarget)
	}

	// d2-e3 would have been generated as a phantom en passant capture.
	phantom := WSMove{From: Position{X: 3, Y: 6}, To: Position{X: 4, Y: 5}, Mine: Position{X: 0, Y: 4}}
	if err := g.MakeMove(whitePlayer, phantom); err == nil {
		t.Fatal("expected the phantom en passant capture to be rejected")
	}
}

// A real en passant capture still works, and removes the captured pawn.
func TestEnPassantCapture(t *testing.T) {
	g := newStartedGame(t)

	moves := []struct {
		player string
		move   WSMove
	}{
		// 1. e4 a6 2. e5 d5 3. exd6 e.p.
		{whitePlayer, openingMove(Position{X: 0, Y: 4})},
		{blackPlayer, WSMove{From: Position{X: 0, Y: 1}, To: Position{X: 0, Y: 2}, Mine: Position{X: 7, Y: 4}}},
		{whitePlayer, WSMove{From: Position{X: 4, Y: 4}, To: Position{X: 4, Y: 3}, Mine: Position{X: 0, Y: 4}}},
		{blackPlayer, WSMove{From: Position{X: 3, Y: 1}, To: Position{X: 3, Y: 3}, Mine: Position{X: 7, Y: 3}}},
		{whitePlayer, WSMove{From: Position{X: 4, Y: 3}, To: Position{X: 3, Y: 2}, Mine: Position{X: 0, Y: 3}}},
	}
	for i, m := range moves {
		if err := g.MakeMove(m.player, m.move); err != nil {
			t.Fatalf("move %d: %v", i+1, err)
		}
	}

	if piece := g.state.Board.Board[3][3]; piece != nil {
		t.Fatalf("expected the en passant captured pawn to be gone, got %+v", piece)
	}
	if piece := g.state.Board.Board[2][3]; piece == nil || piece.Color != "white" {
		t.Fatalf("expected the white pawn on d6, got %+v", piece)
	}
}

// A king may not castle through an attacked square.
func TestCannotCastleThroughCheck(t *testing.T) {
	g := newEmptyGame(t)
	g.place(Rook, "white", Position{X: 7, Y: 7}) // h1
	g.place(Rook, "black", Position{X: 5, Y: 0}) // f8, covering f1

	castle := SimpleMove{From: Position{X: 4, Y: 7}, To: Position{X: 6, Y: 7}}
	for _, move := range g.getLegalMovesForColor("white") {
		if move == castle {
			t.Fatal("castling through an attacked square must not be legal")
		}
	}

	// With the black rook gone the same castle is legal again.
	g.state.Board.Board[0][5] = nil
	found := false
	for _, move := range g.getLegalMovesForColor("white") {
		if move == castle {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("expected kingside castling to be legal once f1 is not attacked")
	}
}

// Running out of time ends the game; the clocks used to run past zero unnoticed.
func TestFlagFallResolvesTheGame(t *testing.T) {
	g := newStartedGame(t)
	g.whiteClock = NewClock(0)

	g.flagFall("white")

	state := g.GetState()
	if state.Resolve == nil {
		t.Fatal("expected the game to be resolved on time")
	}
	if *state.Resolve != "black wins on time" {
		t.Fatalf("unexpected resolve: %q", *state.Resolve)
	}
	if err := g.MakeMove(whitePlayer, openingMove(Position{X: 0, Y: 4})); err == nil {
		t.Fatal("expected no further moves after the flag fell")
	}
}

// GetState must hand out a copy: the caller marshals it outside the game lock.
func TestGetStateIsDeepCopied(t *testing.T) {
	g := newStartedGame(t)
	state := g.GetState()

	if state.Board == g.state.Board {
		t.Fatal("expected the board to be copied, not shared")
	}
	state.Board.Board[6][4] = nil
	if g.state.Board.Board[6][4] == nil {
		t.Fatal("mutating the copy must not affect the live board")
	}
}
