package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
	"google.golang.org/api/iterator"
)

type Message struct {
	ID            string                 `json:"id"`
	Username      string                 `json:"username"`
	Message       string                 `json:"message"`
	Channel       string                 `json:"channel"`
	Timestamp     time.Time              `json:"timestamp"`
	IsSub         bool                   `json:"is_sub"`
	IsMod         bool                   `json:"is_mod"`
	AgentAnalysis map[string]interface{} `json:"agent_analysis,omitempty"`
}

type Stats struct {
	TotalMessages  int     `json:"total_messages"`
	SpamFiltered   int     `json:"spam_filtered"`
	HighPriority   int     `json:"high_priority"`
	MessagesPerMin float64 `json:"messages_per_min"`
}

var firestoreClient *firestore.Client

func main() {
	// Load environment variables
	godotenv.Load("../../config/.env")

	// Initialize Firestore
	ctx := context.Background()
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")

	var err error
	firestoreClient, err = firestore.NewClient(ctx, projectID)
	if err != nil {
		log.Fatal("Failed to create Firestore client:", err)
	}
	defer firestoreClient.Close()

	log.Println("✅ Connected to Firestore")

	// Set up routes
	mux := http.NewServeMux()
	mux.HandleFunc("/api/messages/recent", getRecentMessages)
	mux.HandleFunc("/api/messages/priority", getPriorityMessages)
	mux.HandleFunc("/api/stats", getStats)
	mux.HandleFunc("/health", healthCheck)

	// Enable CORS
	handler := cors.New(cors.Options{
		AllowedOrigins: []string{"http://localhost:3000"},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	}).Handler(mux)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	log.Printf("🚀 Dashboard API starting on port %s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}

func getRecentMessages(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	// Get last 50 messages
	query := firestoreClient.Collection("messages").
		OrderBy("timestamp", firestore.Desc).
		Limit(50)

	docs := query.Documents(ctx)
	defer docs.Stop()

	var messages []Message

	for {
		doc, err := docs.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		var msg Message
		doc.DataTo(&msg)
		msg.ID = doc.Ref.ID
		messages = append(messages, msg)
	}

	// Prevent caching
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")
	json.NewEncoder(w).Encode(messages)
}

func getPriorityMessages(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	// Get messages with priority >= 7
	query := firestoreClient.Collection("messages").
		OrderBy("timestamp", firestore.Desc).
		Limit(100)

	docs := query.Documents(ctx)
	defer docs.Stop()

	var priorityMessages []Message

	for {
		doc, err := docs.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		var msg Message
		doc.DataTo(&msg)

		// Check if has priority analysis
		if analysis, ok := msg.AgentAnalysis["priority"].(map[string]interface{}); ok {
			if priority, ok := analysis["priority"].(int64); ok {
				if priority >= 7 {
					msg.ID = doc.Ref.ID
					priorityMessages = append(priorityMessages, msg)
				}
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(priorityMessages)
}

func getStats(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	// Get messages from last hour
	oneHourAgo := time.Now().Add(-1 * time.Hour)

	query := firestoreClient.Collection("messages").
		Where("timestamp", ">=", oneHourAgo)

	docs := query.Documents(ctx)
	defer docs.Stop()

	stats := Stats{}

	for {
		doc, err := docs.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			continue
		}

		var msg Message
		doc.DataTo(&msg)

		stats.TotalMessages++

		// Check if spam
		if analysis, ok := msg.AgentAnalysis["spam"].(map[string]interface{}); ok {
			if isSpam, ok := analysis["is_spam"].(bool); ok && isSpam {
				stats.SpamFiltered++
			}
		}

		// Check if high priority
		if analysis, ok := msg.AgentAnalysis["priority"].(map[string]interface{}); ok {
			if priority, ok := analysis["priority"].(int64); ok && priority >= 7 {
				stats.HighPriority++
			}
		}
	}

	// Calculate messages per minute
	if stats.TotalMessages > 0 {
		stats.MessagesPerMin = float64(stats.TotalMessages) / 60.0
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}
