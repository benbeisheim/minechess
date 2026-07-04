// service/game_manager.go
package service

import (
	"encoding/json"
	"errors"
	"log"
	"sync"
	"time"

	"github.com/benbeisheim/minechess-backend/internal/bot"
	"github.com/benbeisheim/minechess-backend/internal/model"
	"github.com/gofiber/websocket/v2"
	"github.com/google/uuid"
)

type GameManager struct {
	games            map[string]*model.Game
	queue            *model.Queue
	matchingChannels map[string]chan string
	botClient        *bot.Client
	mu               sync.RWMutex
}

func (gm *GameManager) RegisterMatchmakingChannel(playerID string, ch chan string) error {
	gm.mu.Lock()
	defer gm.mu.Unlock()

	// If there's an existing channel, we need to handle it properly
	if existingCh, exists := gm.matchingChannels[playerID]; exists {
		// Remove from map first to prevent any new writes
		delete(gm.matchingChannels, playerID)
		// Then close the channel
		close(existingCh)
	}

	// Register the new channel
	gm.matchingChannels[playerID] = ch
	return nil
}

// Now let's modify processMatchmaking to handle channel cleanup after sending events
func (gm *GameManager) processMatchmaking() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		gm.mu.Lock()
		if gm.queue.Size() >= 2 {
			player1, player2 := gm.queue.GetNextPair()

			// Create and set up the game as before...
			// Create new game
			gameID := uuid.New().String()
			game := model.NewGame(gameID)

			// Add players to game
			p1Color, err := game.AddPlayer(player1.ID) // Assuming this returns the assigned color
			if err != nil {
				log.Printf("matchmaking: failed to add player to game: %v", err)
				continue
			}
			p2Color, err := game.AddPlayer(player2.ID)
			if err != nil {
				log.Printf("matchmaking: failed to add player to game: %v", err)
				continue
			}
			gm.games[gameID] = game

			// Create match events for each player
			player1Event := model.MatchFoundEvent{
				GameID: gameID,
				Color:  p1Color, // Use actual color assigned by AddPlayer
			}
			player2Event := model.MatchFoundEvent{
				GameID: gameID,
				Color:  p2Color, // Use actual color assigned by AddPlayer
			}

			// Send events and clean up channels
			successfullySentBoth := true

			// Helper function to send event and clean up channel
			sendEventAndCleanup := func(playerID string, event model.MatchFoundEvent) bool {
				if ch, ok := gm.matchingChannels[playerID]; ok {
					select {
					case ch <- mustJSON(event):
						// Remove the channel from the map
						delete(gm.matchingChannels, playerID)
						// Close the channel
						close(ch)
						return true
					default:
						log.Printf("matchmaking: failed to send match event to player %s", playerID)
						return false
					}
				}
				return false
			}

			// Send to both players
			if !sendEventAndCleanup(player1.ID, player1Event) {
				successfullySentBoth = false
			}
			if !sendEventAndCleanup(player2.ID, player2Event) {
				successfullySentBoth = false
			}

			// If we failed to notify both players, we might want to handle that
			if !successfullySentBoth {
				// Maybe add them back to queue or implement retry logic
				log.Println("matchmaking: failed to notify all players of match")
			}
		}
		gm.mu.Unlock()
	}
}

func (gm *GameManager) UnregisterMatchmakingChannel(playerID string) {
	gm.mu.Lock()
	defer gm.mu.Unlock()

	// We don't close the channel here because it might be used by other goroutines
	// The creator of the channel (HandleMatchmakingEvents) is responsible for closing it
	delete(gm.matchingChannels, playerID)
}

// Helper function for JSON marshaling
func mustJSON(v any) string {
	bytes, err := json.Marshal(v)
	if err != nil {
		// In production, you'd want to handle this error more gracefully
		panic(err)
	}
	return string(bytes)
}

func NewGameManager() *GameManager {
	gm := &GameManager{
		games:            make(map[string]*model.Game),
		queue:            model.NewQueue(),
		matchingChannels: make(map[string]chan string),
		botClient:        bot.NewClient(),
	}

	// Start matchmaking processor
	go gm.processMatchmaking()

	return gm
}

func (gm *GameManager) CreateGame(gameID string) error {
	gm.mu.Lock()
	defer gm.mu.Unlock()

	if _, exists := gm.games[gameID]; exists {
		return errors.New("game already exists")
	}

	gm.games[gameID] = model.NewGame(gameID)
	return nil
}

func (gm *GameManager) GetGame(gameID string) (*model.Game, error) {
	gm.mu.RLock()
	defer gm.mu.RUnlock()

	game, exists := gm.games[gameID]
	if !exists {
		return nil, errors.New("game not found")
	}

	return game, nil
}

func (gm *GameManager) AddPlayerToGame(gameID string, playerID string) (model.PlayerColor, error) {
	gm.mu.Lock()
	defer gm.mu.Unlock()

	game, exists := gm.games[gameID]
	if !exists {
		return model.PlayerColor(""), errors.New("game not found")
	}

	return game.AddPlayer(playerID)
}

func (gm *GameManager) JoinMatchmaking(playerID string) error {
	gm.mu.Lock()
	defer gm.mu.Unlock()

	if err := gm.queue.AddPlayer(model.Player{ID: playerID}); err != nil {
		return err
	}

	return nil
}

func (gm *GameManager) GetGameState(gameID string) (model.GameState, error) {
	gm.mu.RLock()
	defer gm.mu.RUnlock()
	game, exists := gm.games[gameID]
	if !exists {
		return model.GameState{}, errors.New("game not found")
	}

	return game.GetState(), nil
}

func (gm *GameManager) MakeMove(gameID string, playerID string, move model.WSMove) error {
	gm.mu.RLock()
	game, exists := gm.games[gameID]
	gm.mu.RUnlock()

	if !exists {
		return errors.New("game not found")
	}

	if err := game.MakeMove(move); err != nil {
		return err
	}

	// In a bot game, respond asynchronously once the human's move lands.
	if difficulty, ok := game.BotShouldMove(); ok {
		go gm.playBotMove(game, difficulty)
	}
	return nil
}

func (gm *GameManager) CreateBotGame(playerID string, difficulty int) (string, model.PlayerColor, error) {
	gm.mu.Lock()
	defer gm.mu.Unlock()

	gameID := uuid.New().String()
	game := model.NewGame(gameID)

	humanColor, err := game.AddPlayer(playerID)
	if err != nil {
		return "", "", err
	}
	botColor, err := game.AddPlayer("bot")
	if err != nil {
		return "", "", err
	}
	game.EnableBot(string(botColor), difficulty)

	gm.games[gameID] = game
	return gameID, humanColor, nil
}

// playBotMove fetches the bot's reply and applies it. It runs in its own goroutine
// so slow inference never blocks the human's request or the WebSocket loop.
func (gm *GameManager) playBotMove(game *model.Game, difficulty int) {
	// A small pause keeps the bot from replying instantly on the fallback path.
	time.Sleep(600 * time.Millisecond)

	suggestion, err := gm.botClient.GetMove(game.FEN(), difficulty)
	if err != nil {
		// BotMove falls back to a random legal move and a locally chosen mine.
		log.Printf("bot: move service unavailable, using a random legal move: %v", err)
		suggestion = bot.Suggestion{}
	}

	move, ok := game.BotMove(suggestion.Move, suggestion.Mine)
	if !ok {
		return // No legal moves: the game is already over.
	}
	if err := game.MakeMove(move); err != nil {
		log.Printf("bot: failed to apply move %+v: %v", move, err)
	}
}

func (gm *GameManager) RegisterConnection(gameID string, playerID string, conn *websocket.Conn) error {
	gm.mu.Lock()
	defer gm.mu.Unlock()

	game, exists := gm.games[gameID]
	if !exists {
		return errors.New("game not found")
	}

	return game.RegisterConnection(playerID, conn)
}

func (gm *GameManager) UnregisterConnection(gameID string, playerID string) {
	gm.mu.Lock()
	defer gm.mu.Unlock()
	game, exists := gm.games[gameID]
	if !exists {
		return
	}

	game.UnregisterConnection(playerID)
}
