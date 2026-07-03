package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

func EnsurePlayerID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Check if playerID is already set
		if c.Locals("playerID") != nil {
			return c.Next()
		}

		// Check the header first, then fall back to the query string.
		// strings.Clone is essential: values returned by c.Get/c.Query point into
		// fasthttp's reusable request buffer and would be corrupted by later requests
		// once we retain them in long-lived game state.
		playerID := strings.Clone(c.Get("X-Player-ID"))
		if playerID == "" {
			playerID = strings.Clone(c.Query("playerId"))
		}

		if playerID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Player ID is required. Please ensure client is properly initialized.",
			})
		}

		// Store in context for this request
		c.Locals("playerID", playerID)
		return c.Next()
	}
}
