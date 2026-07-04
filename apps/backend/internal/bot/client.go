// Package bot is a thin HTTP client for the Python (FastAPI) move service. The
// browser never talks to that service directly; only this backend does.
package bot

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// Suggestion is the bot service's reply: a UCI move plus the algebraic square to
// mine (e.g. move "e2e4", mine "c3").
type Suggestion struct {
	Move string `json:"move"`
	Mine string `json:"mine"`
}

type Client struct {
	baseURL string
	http    *http.Client
}

// NewClient reads the bot service URL from BOT_URL (defaulting to the local uvicorn
// address). Maia inference on CPU can be slow, so the timeout is generous.
func NewClient() *Client {
	baseURL := os.Getenv("BOT_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8000"
	}
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		http:    &http.Client{Timeout: 20 * time.Second},
	}
}

// GetMove asks the bot service for a move and mine given a FEN and difficulty (0-2).
func (c *Client) GetMove(fen string, difficulty int) (Suggestion, error) {
	endpoint := fmt.Sprintf("%s/moves?fen=%s&difficulty=%d", c.baseURL, url.QueryEscape(fen), difficulty)

	req, err := http.NewRequest(http.MethodPost, endpoint, nil)
	if err != nil {
		return Suggestion{}, err
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return Suggestion{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return Suggestion{}, fmt.Errorf("bot service returned %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var suggestion Suggestion
	if err := json.NewDecoder(resp.Body).Decode(&suggestion); err != nil {
		return Suggestion{}, fmt.Errorf("decoding bot suggestion: %w", err)
	}
	return suggestion, nil
}
