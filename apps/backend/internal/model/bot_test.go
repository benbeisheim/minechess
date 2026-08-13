package model

import "testing"

func TestToFENInitialPosition(t *testing.T) {
	g := newStartedGame(t)
	want := "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
	if got := g.FEN(); got != want {
		t.Fatalf("FEN mismatch:\n got %q\nwant %q", got, want)
	}
}

func TestBotMoveHonoursUCISuggestion(t *testing.T) {
	g := newStartedGame(t)
	g.EnableBot("white", 0)

	// The bot's mine square ("c3") should be honoured verbatim.
	move, ok := g.BotMove("e2e4", "c3")
	if !ok {
		t.Fatal("expected a bot move")
	}
	if move.From != (Position{X: 4, Y: 6}) || move.To != (Position{X: 4, Y: 4}) {
		t.Fatalf("expected e2-e4, got from %+v to %+v", move.From, move.To)
	}
	if move.Mine != (Position{X: 2, Y: 5}) { // c3 -> file c (2), rank 3 (Y = 8-3)
		t.Fatalf("expected mine on c3 {2,5}, got %+v", move.Mine)
	}
}

func TestBotMovePicksMineWhenNoneSupplied(t *testing.T) {
	g := newStartedGame(t)
	g.EnableBot("white", 0)

	move, ok := g.BotMove("e2e4", "")
	if !ok {
		t.Fatal("expected a bot move")
	}
	if !isValidPosition(move.Mine) {
		t.Fatalf("fallback mine out of bounds: %+v", move.Mine)
	}
}

func TestBotMoveFallsBackToRandomLegalMove(t *testing.T) {
	g := newStartedGame(t)
	g.EnableBot("white", 0)

	move, ok := g.BotMove("not-a-move", "")
	if !ok {
		t.Fatal("expected a fallback move")
	}

	legal := false
	for _, m := range g.getLegalMovesForColor("white") {
		if m.From == move.From && m.To == move.To {
			legal = true
			break
		}
	}
	if !legal {
		t.Fatalf("fallback move is not legal: %+v", move)
	}
	if err := g.MakeMove(whitePlayer, move); err != nil {
		t.Fatalf("applying the fallback move failed: %v", err)
	}
}
