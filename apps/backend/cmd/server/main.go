package main

import (
	"log"
	"os"

	"github.com/benbeisheim/minechess-backend/internal/controller"
	"github.com/benbeisheim/minechess-backend/internal/middleware"
	"github.com/benbeisheim/minechess-backend/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/websocket/v2"
)

func main() {
	// Initialize the application

	app := fiber.New()

	// Get environment variabless
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000" // default port for local development
	}

	// Get CORS origins
	allowedOrigins := os.Getenv("CORS_ORIGIN")
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:5173, https://minechess.vercel.app, https://minechess.vercel.app/, https://minechess-frontend-jmx16a8bg-benbeisheims-projects.vercel.app, https://minechess-frontend-3i7ths496-benbeisheims-projects.vercel.app"
	}

	// Setup CORS
	app.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, X-Player-ID",
		AllowMethods:     "GET, POST, OPTIONS",
		AllowCredentials: true,
		ExposeHeaders:    "Upgrade",
	}))

	// Initialize services
	gameManager := service.NewGameManager()
	gameService := service.NewGameService(gameManager)

	// Initialize controllers
	gameController := controller.NewGameController(gameService)
	wsController := controller.NewWebSocketController(gameService)

	// Set up WebSocket routes
	app.Use("/ws/*", middleware.EnsurePlayerID())
	app.Get("/ws/game/:gameId", websocket.New(func(c *websocket.Conn) {
		wsController.HandleConnection(c)
	}, websocket.Config{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		// Enable all origins
		Origins: []string{"http://localhost:5173", "https://minechess.vercel.app", "https://minechess.vercel.app/", "https://minechess-frontend-3i7ths496-benbeisheims-projects.vercel.app"},
	}))

	// Set up REST routes
	api := app.Group("/api", middleware.EnsurePlayerID())

	// Game routes
	gameRoutes := api.Group("/game")
	gameRoutes.Post("/matchmaking/join", gameController.JoinMatchmaking)
	gameRoutes.Post("/create", gameController.CreateGame)
	gameRoutes.Post("/bot", gameController.CreateBotGame)
	gameRoutes.Post("/join/:gameId", gameController.JoinGame)
	gameRoutes.Get("/:gameId", gameController.GetGameState)
	gameRoutes.Get("/matchmaking/events", gameController.HandleMatchmakingEvents)

	// Listen on the port the platform assigned (Railway et al. inject PORT); the
	// hardcoded :3000 meant the container never answered on the expected port.
	log.Fatal(app.Listen(":" + port))
}
