package service

import (
	"fmt"

	"github.com/benbeisheim/minechess-backend/internal/model"
	"github.com/gofiber/websocket/v2"
	"github.com/google/uuid"
)

type GameService struct {
	gameManager *GameManager
}

func NewGameService(gameManager *GameManager) *GameService {
	return &GameService{
		gameManager: gameManager,
	}
}

func (gs *GameService) JoinGame(gameID string, playerID string) (model.PlayerColor, error) {
	return gs.gameManager.AddPlayerToGame(gameID, playerID)
}

func (gs *GameService) CreateGame() (string, error) {
	gameID := uuid.New().String()

	if err := gs.gameManager.CreateGame(gameID); err != nil {
		return "", fmt.Errorf("failed to create game: %w", err)
	}

	return gameID, nil
}

func (gs *GameService) CreateBotGame(playerID string, difficulty int) (string, model.PlayerColor, error) {
	return gs.gameManager.CreateBotGame(playerID, difficulty)
}

func (gs *GameService) JoinMatchmaking(playerID string) error {
	return gs.gameManager.JoinMatchmaking(playerID)
}

func (gs *GameService) GetGameState(gameID string) (model.GameState, error) {
	return gs.gameManager.GetGameState(gameID)
}

func (gs *GameService) HandleMove(gameID string, playerID string, move model.WSMove) error {
	if err := gs.gameManager.MakeMove(gameID, playerID, move); err != nil {
		return err
	}

	return nil
}

// HandleMinePlacement applies black's opening mine.
func (gs *GameService) HandleMinePlacement(gameID string, playerID string, mine model.Position) error {
	return gs.gameManager.PlaceInitialMine(gameID, playerID, mine)
}

func (gs *GameService) RegisterConnection(gameID string, playerID string, conn *websocket.Conn) error {
	return gs.gameManager.RegisterConnection(gameID, playerID, conn)
}

func (gs *GameService) UnregisterConnection(gameID string, playerID string) {
	gs.gameManager.UnregisterConnection(gameID, playerID)
}

// SendError reports a rejected message to one player, returning false if there is
// no game or no live connection to send it on.
func (gs *GameService) SendError(gameID string, playerID string, message string) bool {
	return gs.gameManager.SendError(gameID, playerID, message)
}

func (gs *GameService) RegisterMatchmakingChannel(playerID string, ch chan string) error {
	return gs.gameManager.RegisterMatchmakingChannel(playerID, ch)
}

func (gs *GameService) UnregisterMatchmakingChannel(playerID string) {
	gs.gameManager.UnregisterMatchmakingChannel(playerID)
}
