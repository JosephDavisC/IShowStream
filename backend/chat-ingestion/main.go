package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync/atomic"
	"syscall"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/gempir/go-twitch-irc/v4"
	"github.com/joho/godotenv"
)

// ChatMessage represents a Twitch chat message
type ChatMessage struct {
	Username  string    `firestore:"username"`
	Message   string    `firestore:"message"`
	Channel   string    `firestore:"channel"`
	Timestamp time.Time `firestore:"timestamp"`
	UserID    string    `firestore:"user_id"`
	IsMod     bool      `firestore:"is_mod"`
	IsSub     bool      `firestore:"is_sub"`
	// writer metadata helps identify the origin of writes
	WriterHost string `firestore:"writer_host,omitempty"`
	WriterPID  int    `firestore:"writer_pid,omitempty"`
}

var (
	firestoreClient  *firestore.Client
	messageCount     int64
	startTime        = time.Now()
	twitchConnected  atomic.Bool
	firestoreHealthy atomic.Bool
)

func printStats() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		duration := time.Since(startTime)
		count := atomic.LoadInt64(&messageCount)
		rate := float64(count) / duration.Seconds()

		fmt.Printf("\n📊 Stats: %d messages in %v (%.2f msg/sec)\n\n",
			count,
			duration.Round(time.Second),
			rate,
		)
	}
}

// HTTP handlers for Cloud Run
func healthCheck(w http.ResponseWriter, r *http.Request) {
	status := map[string]interface{}{
		"status":            "healthy",
		"twitch_connected":  twitchConnected.Load(),
		"firestore_healthy": firestoreHealthy.Load(),
		"messages_ingested": atomic.LoadInt64(&messageCount),
		"uptime_seconds":    int(time.Since(startTime).Seconds()),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

func statsHandler(w http.ResponseWriter, r *http.Request) {
	duration := time.Since(startTime)
	count := atomic.LoadInt64(&messageCount)
	rate := float64(count) / duration.Seconds()

	stats := map[string]interface{}{
		"total_messages":  count,
		"uptime_seconds":  int(duration.Seconds()),
		"messages_per_sec": rate,
		"twitch_connected": twitchConnected.Load(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func main() {
	// Load environment variables
	err := godotenv.Load("../../config/.env")
	if err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	// Get configuration
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")

	if projectID == "" {
		log.Fatal("Missing GOOGLE_CLOUD_PROJECT environment variable")
	}

	// Initialize Firestore
	ctx := context.Background()
	firestoreClient, err = firestore.NewClient(ctx, projectID)
	if err != nil {
		log.Fatal("Failed to create Firestore client:", err)
	}
	defer firestoreClient.Close()

	fmt.Println("✅ Connected to Firestore")
	firestoreHealthy.Store(true)

	// Create Twitch client (anonymous connection for read-only chat)
	// For reading public chat, we don't need authentication
	client := twitch.NewAnonymousClient()

	// Message handler
	client.OnPrivateMessage(func(message twitch.PrivateMessage) {
		handleMessage(message)
	})

	// Connect handler
	client.OnConnect(func() {
		fmt.Println("✅ Connected to Twitch IRC")
		fmt.Println("📡 Listening for messages...")
		twitchConnected.Store(true)
	})

	// Reconnection handler
	client.OnReconnectMessage(func(message twitch.ReconnectMessage) {
		fmt.Println("⚠️  Reconnecting to Twitch...")
		twitchConnected.Store(false)
	})

	// Join a channel (configurable via environment variable)
	channel := os.Getenv("TWITCH_CHANNEL")
	if channel == "" {
		channel = "xqc" // default fallback
	}
	client.Join(channel)
	fmt.Printf("🎮 Joined channel: %s\n", channel)

	// Start stats reporting
	go printStats()

	// Start the Twitch client in a goroutine
	go func() {
		err := client.Connect()
		if err != nil {
			log.Printf("Error connecting to Twitch: %v", err)
			twitchConnected.Store(false)
		}
	}()

	// Start HTTP server for Cloud Run health checks
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthCheck)
	mux.HandleFunc("/", healthCheck) // Cloud Run pings root for health
	mux.HandleFunc("/stats", statsHandler)

	server := &http.Server{
		Addr:    ":" + port,
		Handler: mux,
	}

	// Start HTTP server in goroutine
	go func() {
		fmt.Printf("🌐 HTTP server listening on port %s\n", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("HTTP server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	fmt.Println("🚀 StreamSense Chat Ingestion Service Started!")
	fmt.Println("Press Ctrl+C to stop...")

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	fmt.Println("\n👋 Shutting down gracefully...")

	// Shutdown HTTP server
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	server.Shutdown(shutdownCtx)

	// Disconnect Twitch client
	client.Disconnect()
}

func handleMessage(message twitch.PrivateMessage) {
	atomic.AddInt64(&messageCount, 1) // Increment message counter atomically

	// Create chat message object
	chatMsg := ChatMessage{
		Username:  message.User.DisplayName,
		Message:   message.Message,
		Channel:   message.Channel,
		Timestamp: message.Time,
		UserID:    message.User.ID,
		IsMod:     message.User.Badges["moderator"] == 1,
		IsSub:     message.User.Badges["subscriber"] == 1,
	}

	// add writer origin metadata to each message
	if hn, err := os.Hostname(); err == nil {
		chatMsg.WriterHost = hn
	}
	chatMsg.WriterPID = os.Getpid()

	// Print to console (for debugging)
	fmt.Printf("[%s] %s: %s\n",
		chatMsg.Channel,
		chatMsg.Username,
		chatMsg.Message,
	)

	// Save to Firestore
	go saveToFirestore(chatMsg)
}

func saveToFirestore(msg ChatMessage) {
	// Use a longer timeout to allow for OAuth token exchange and network latency
	// Cloud Run services may need more time for initial authentication
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Create collection reference
	collection := firestoreClient.Collection("messages")

	// Emergency kill-switch: if DISABLE_FIRESTORE_WRITES is set, skip writes
	if v := os.Getenv("DISABLE_FIRESTORE_WRITES"); v == "1" || v == "true" || v == "TRUE" {
		log.Printf("⚠️  Firestore writes disabled by DISABLE_FIRESTORE_WRITES (skipping message)")
		return
	}

	// Add document with timeout to prevent blocking
	_, _, err := collection.Add(ctx, msg)
	if err != nil {
		log.Printf("Error saving to Firestore: %v", err)
		return
	}
}
