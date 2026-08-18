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
	if move.Mine == nil || *move.Mine != (Position{X: 2, Y: 5}) { // c3 -> file c (2), rank 3 (Y = 8-3)
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
	if move.Mine == nil || !isValidPosition(*move.Mine) {
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

// A bot playing black opens the game with its mine, before white's first move.
func TestBotPlacesTheOpeningMine(t *testing.T) {
	// A single-player game: the human is white, the bot is seated as black.
	g := NewGame("test")
	if _, err := g.AddPlayer(whitePlayer); err != nil {
		t.Fatalf("AddPlayer white: %v", err)
	}
	if _, err := g.AddPlayer(BotPlayerID); err != nil {
		t.Fatalf("AddPlayer bot: %v", err)
	}
	g.EnableBot("black", 0)

	if _, ok := g.BotShouldMove(); ok {
		t.Fatal("the bot has no move to make until the opening mine is down")
	}
	if !g.BotShouldPlaceInitialMine() {
		t.Fatal("expected the bot to owe the opening mine")
	}

	mine := g.BotInitialMine()
	if err := g.PlaceInitialMine(BotPlayerID, mine); err != nil {
		t.Fatalf("expected the bot's opening mine on %+v to be legal, got %v", mine, err)
	}
	if g.BotShouldPlaceInitialMine() {
		t.Fatal("expected the bot to be done with the opening mine")
	}
}

// With the opponent down to a lone king the bot stops placing mines as well.
func TestBotMoveCarriesNoMineOnceMinesAreDropped(t *testing.T) {
	g := newEmptyGame(t)
	g.state.Board.Board[1][7] = nil              // black's rook below is its last piece
	g.place(Rook, "white", Position{X: 0, Y: 7}) // a1
	g.place(Rook, "black", Position{X: 0, Y: 3}) // a5
	g.EnableBot("white", 0)

	move, ok := g.BotMove("a1a5", "")
	if !ok {
		t.Fatal("expected a bot move")
	}
	if move.Mine != nil {
		t.Fatalf("expected the capture of black's last piece to carry no mine, got %+v", move.Mine)
	}
	if err := g.MakeMove(whitePlayer, move); err != nil {
		t.Fatalf("applying the bot's move failed: %v", err)
	}
}
