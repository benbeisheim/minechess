package model

import "testing"

func newStartedGame(t *testing.T) *Game {
	t.Helper()
	g := NewGame("test")
	if _, err := g.AddPlayer("white-player"); err != nil {
		t.Fatalf("AddPlayer white: %v", err)
	}
	if _, err := g.AddPlayer("black-player"); err != nil {
		t.Fatalf("AddPlayer black: %v", err)
	}
	return g
}

// MakeMove must reject out-of-bounds coordinates without panicking (previously it
// indexed the board before validating bounds).
func TestMakeMoveOutOfBoundsReturnsError(t *testing.T) {
	g := newStartedGame(t)
	err := g.MakeMove(WSMove{From: Position{X: 0, Y: 9}, To: Position{X: 0, Y: 4}, Mine: Position{X: 0, Y: 4}})
	if err == nil {
		t.Fatal("expected an error for an out-of-bounds move, got nil")
	}
}

// MakeMove must reject a move from an empty square without panicking (previously it
// dereferenced a nil piece to read its colour).
func TestMakeMoveFromEmptySquareReturnsError(t *testing.T) {
	g := newStartedGame(t)
	err := g.MakeMove(WSMove{From: Position{X: 4, Y: 4}, To: Position{X: 4, Y: 3}, Mine: Position{X: 0, Y: 4}})
	if err == nil {
		t.Fatal("expected an error for a move from an empty square, got nil")
	}
}

// A legal opening move should succeed and advance the turn to black.
func TestMakeLegalOpeningMove(t *testing.T) {
	g := newStartedGame(t)
	// White pawn e2-e4 (files a-h => X 0-7, ranks from the top => white pawns on Y=6).
	err := g.MakeMove(WSMove{From: Position{X: 4, Y: 6}, To: Position{X: 4, Y: 4}, Mine: Position{X: 0, Y: 4}})
	if err != nil {
		t.Fatalf("expected legal move to succeed, got %v", err)
	}
	if got := g.GetState().ToMove; got != "black" {
		t.Fatalf("expected it to be black's turn after white's move, got %q", got)
	}
}
