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
		// Drain the queue: a single pair per tick left everyone behind them waiting
		// an extra second each.
		for gm.matchPair() {
		}
		gm.mu.Unlock()
	}
}

// matchPair pairs the two longest-waiting players, if there are two. It reports
// whether a pair was taken off the queue. Callers must hold gm.mu.
func (gm *GameManager) matchPair() bool {
	player1, player2, ok := gm.queue.GetNextPair()
	if !ok {
		return false
	}

	gameID := uuid.New().String()
	game := model.NewGame(gameID)

	// Add players to game
	p1Color, err := game.AddPlayer(player1.ID) // Assuming this returns the assigned color
	if err != nil {
		log.Printf("matchmaking: failed to add player to game: %v", err)
		return true
	}
	p2Color, err := game.AddPlayer(player2.ID)
	if err != nil {
		log.Printf("matchmaking: failed to add player to game: %v", err)
		return true
	}

	// Helper function to send event and clean up channel
	sendEventAndCleanup := func(playerID string, event model.MatchFoundEvent) bool {
		ch, ok := gm.matchingChannels[playerID]
		if !ok {
			return false
		}
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

	sent1 := sendEventAndCleanup(player1.ID, model.MatchFoundEvent{GameID: gameID, Color: p1Color})
	sent2 := sendEventAndCleanup(player2.ID, model.MatchFoundEvent{GameID: gameID, Color: p2Color})

	// A player who could not be notified has dropped off the queue stream, so there
	// is nobody to requeue. Only register the game if at least one player was told
	// its ID; otherwise it would sit in the map forever, unreachable by anyone.
	if !sent1 && !sent2 {
		log.Println("matchmaking: neither player could be notified, discarding game")
		game.Close()
		return true
	}
	if !sent1 || !sent2 {
		log.Println("matchmaking: failed to notify all players of match")
	}

	gm.games[gameID] = game
	return true
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

const (
	// A game with nobody connected is reaped once it has been idle this long.
	gameIdleTimeout = 30 * time.Minute
	gameSweepPeriod = 5 * time.Minute
)

func NewGameManager() *GameManager {
	gm := &GameManager{
		games:            make(map[string]*model.Game),
		queue:            model.NewQueue(),
		matchingChannels: make(map[string]chan string),
		botClient:        bot.NewClient(),
	}

	// Start matchmaking processor
	go gm.processMatchmaking()
	go gm.reapAbandonedGames()

	return gm
}

// reapAbandonedGames drops games nobody is connected to and nobody has touched in
// a while. Games were only ever added to the map, so a long-running server grew
// its memory with every abandoned or finished game.
func (gm *GameManager) reapAbandonedGames() {
	ticker := time.NewTicker(gameSweepPeriod)
	defer ticker.Stop()

	for range ticker.C {
		cutoff := time.Now().Add(-gameIdleTimeout)

		gm.mu.Lock()
		var stale []*model.Game
		for gameID, game := range gm.games {
			if game.ConnectionCount() == 0 && game.IdleSince().Before(cutoff) {
				stale = append(stale, game)
				delete(gm.games, gameID)
			}
		}
		gm.mu.Unlock()

		for _, game := range stale {
			game.Close()
		}
		if len(stale) > 0 {
			log.Printf("reaped %d abandoned game(s)", len(stale))
		}
	}
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

	if err := game.MakeMove(playerID, move); err != nil {
		return err
	}

	// In a bot game, respond asynchronously once the human's move lands.
	if difficulty, ok := game.BotShouldMove(); ok {
		go gm.playBotMove(game, difficulty)
	}
	return nil
}

// PlaceInitialMine applies black's opening mine, the placement the game now opens
// with. White's first move follows it.
func (gm *GameManager) PlaceInitialMine(gameID string, playerID string, mine model.Position) error {
	gm.mu.RLock()
	game, exists := gm.games[gameID]
	gm.mu.RUnlock()

	if !exists {
		return errors.New("game not found")
	}

	if err := game.PlaceInitialMine(playerID, mine); err != nil {
		return err
	}

	// A bot seated as white opens the game once the mine is down.
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
	botColor, err := game.AddPlayer(model.BotPlayerID)
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
	if err := game.MakeMove(model.BotPlayerID, move); err != nil {
		log.Printf("bot: failed to apply move %+v: %v", move, err)
	}
}

// playBotInitialMine places the opening mine for a bot seated as black, which is
// what starts a single-player game.
func (gm *GameManager) playBotInitialMine(game *model.Game) {
	// The same short pause the bot's moves get, so the game does not open with an
	// instantaneous placement.
	time.Sleep(600 * time.Millisecond)

	// A reconnect can start a second placement while this one is still waiting; the
	// re-check keeps the loser of that race quiet.
	if !game.BotShouldPlaceInitialMine() {
		return
	}
	if err := game.PlaceInitialMine(model.BotPlayerID, game.BotInitialMine()); err != nil {
		log.Printf("bot: failed to place the opening mine: %v", err)
	}
}

// RegisterConnection attaches a client to a game. The manager lock is released
// before touching the game: registering writes to WebSockets, and a slow or dead
// client must not be able to stall every other game on the server.
func (gm *GameManager) RegisterConnection(gameID string, playerID string, conn *websocket.Conn) error {
	gm.mu.RLock()
	game, exists := gm.games[gameID]
	gm.mu.RUnlock()

	if !exists {
		return errors.New("game not found")
	}

	if err := game.RegisterConnection(playerID, conn); err != nil {
		return err
	}

	// A bot game opens with the bot's mine, so it is the connection - not a human
	// move - that gets the bot going.
	if game.BotShouldPlaceInitialMine() {
		go gm.playBotInitialMine(game)
	}
	return nil
}

func (gm *GameManager) SendError(gameID string, playerID string, message string) bool {
	gm.mu.RLock()
	game, exists := gm.games[gameID]
	gm.mu.RUnlock()

	if !exists {
		return false
	}

	return game.SendError(playerID, message)
}

func (gm *GameManager) UnregisterConnection(gameID string, playerID string) {
	gm.mu.RLock()
	game, exists := gm.games[gameID]
	gm.mu.RUnlock()

	if !exists {
		return
	}

	game.UnregisterConnection(playerID)
}
