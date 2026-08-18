package controller

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/benbeisheim/minechess-backend/internal/model"
	"github.com/benbeisheim/minechess-backend/internal/service"
	"github.com/benbeisheim/minechess-backend/internal/ws"
	"github.com/gofiber/websocket/v2"
)

type WebSocketController struct {
	gameService *service.GameService
}

func NewWebSocketController(gameService *service.GameService) *WebSocketController {
	return &WebSocketController{
		gameService: gameService,
	}
}

// HandleConnection is called when a new WebSocket connection is established
func (wsc *WebSocketController) HandleConnection(c *websocket.Conn) {
	// Extract game ID and player ID from context
	gameID := c.Params("gameId")
	// Guard the type assertion: an unchecked one panics the connection goroutine
	// (and with it the process) if the middleware ever stops running on this route.
	playerID, _ := c.Locals("playerID").(string)

	if playerID == "" {
		wsc.sendError(c, "playerId is required")
		c.Close()
		return
	}

	// Register this connection with the game
	if err := wsc.gameService.RegisterConnection(gameID, playerID, c); err != nil {
		log.Printf("Failed to register connection: %v", err)
		c.Close()
		return
	}

	// Start message handling loop
	for {
		messageType, message, err := c.ReadMessage()
		if err != nil {
			log.Printf("read error: %v", err)
			break
		}

		if messageType == websocket.TextMessage {
			var msg ws.Message
			if err := json.Unmarshal(message, &msg); err != nil {
				log.Printf("parse error: %v", err)
				continue
			}

			if err := wsc.handleMessage(gameID, playerID, msg); err != nil {
				log.Printf("handle error: %v", err)
				// Send through the game so the write is serialised against the
				// state broadcasts going out on this same socket.
				if !wsc.gameService.SendError(gameID, playerID, err.Error()) {
					wsc.sendError(c, err.Error())
				}
			}
		}
	}

	wsc.gameService.UnregisterConnection(gameID, playerID)
}

func (wsc *WebSocketController) handleMessage(gameID, playerID string, msg ws.Message) error {
	switch msg.Type {
	case ws.MessageTypeMove:
		var move model.WSMove
		if err := json.Unmarshal(msg.Payload, &move); err != nil {
			return err
		}
		return wsc.gameService.HandleMove(gameID, playerID, move)

	case ws.MessageTypePlaceMine:
		var placement struct {
			Mine model.Position `json:"mine"`
		}
		if err := json.Unmarshal(msg.Payload, &placement); err != nil {
			return err
		}
		return wsc.gameService.HandleMinePlacement(gameID, playerID, placement.Mine)

	default:
		return fmt.Errorf("unknown message type: %s", msg.Type)
	}
}

// sendError reports a rejected message back to the client. The message has to be
// marshalled into the payload: a raw string is not valid JSON, so WriteJSON used to
// fail and the client never heard about the error at all.
func (wsc *WebSocketController) sendError(c *websocket.Conn, errorMsg string) {
	payload, err := json.Marshal(struct {
		Message string `json:"message"`
	}{Message: errorMsg})
	if err != nil {
		log.Printf("failed to marshal error payload: %v", err)
		return
	}

	if err := c.WriteJSON(ws.Message{
		Type:    ws.MessageTypeError,
		Payload: payload,
	}); err != nil {
		log.Printf("failed to send error to client: %v", err)
	}
}
