package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
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
	firestoreClient *firestore.Client
	messageCount    = 0
	startTime       = time.Now()
)

func printStats() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		duration := time.Since(startTime)
		rate := float64(messageCount) / duration.Seconds()

		fmt.Printf("\n📊 Stats: %d messages in %v (%.2f msg/sec)\n\n",
			messageCount,
			duration.Round(time.Second),
			rate,
		)
	}
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
	})

	// Reconnection handler
	client.OnReconnectMessage(func(message twitch.ReconnectMessage) {
		fmt.Println("⚠️  Reconnecting to Twitch...")
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

	// Start the client in a goroutine
	go func() {
		err := client.Connect()
		if err != nil {
			log.Fatal("Error connecting to Twitch:", err)
		}
	}()

	// Wait for interrupt signal
	fmt.Println("🚀 StreamSense Chat Ingestion Service Started!")
	fmt.Println("Press Ctrl+C to stop...")

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	fmt.Println("\n👋 Shutting down gracefully...")
	client.Disconnect()
}

func handleMessage(message twitch.PrivateMessage) {
	messageCount++ // Increment message counter

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
	ctx := context.Background()

	// Create collection reference
	collection := firestoreClient.Collection("messages")

	// Emergency kill-switch: if DISABLE_FIRESTORE_WRITES is set, skip writes
	if v := os.Getenv("DISABLE_FIRESTORE_WRITES"); v == "1" || v == "true" || v == "TRUE" {
		log.Printf("⚠️  Firestore writes disabled by DISABLE_FIRESTORE_WRITES (skipping message)")
		return
	}

	// Add document
	_, _, err := collection.Add(ctx, msg)
	if err != nil {
		log.Printf("Error saving to Firestore: %v", err)
		return
	}
}
