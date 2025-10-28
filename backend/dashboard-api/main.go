package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
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

type StreamerInfo struct {
	Channel     string `json:"channel"`
	DisplayName string `json:"display_name"`
	AvatarURL   string `json:"avatar_url"`
	Platform    string `json:"platform"`
}

type TwitchUser struct {
	ID              string `json:"id"`
	Login           string `json:"login"`
	DisplayName     string `json:"display_name"`
	ProfileImageURL string `json:"profile_image_url"`
}

type TwitchUsersResponse struct {
	Data []TwitchUser `json:"data"`
}

type AgentActivity struct {
	ID           string                 `json:"id"`
	Timestamp    time.Time              `json:"timestamp"`
	ActivityType string                 `json:"activity_type"`
	Agent        string                 `json:"agent"`
	Status       string                 `json:"status"`
	Message      map[string]interface{} `json:"message"`
	Result       map[string]interface{} `json:"result,omitempty"`
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
	mux.HandleFunc("/api/insights/latest", getLatestInsights)
	mux.HandleFunc("/api/streamer", getStreamerInfo)
	mux.HandleFunc("/api/agent-activity", getAgentActivity)
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

func getLatestInsights(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	// Get the most recent insight
	query := firestoreClient.Collection("insights").
		OrderBy("timestamp", firestore.Desc).
		Limit(1)

	docs := query.Documents(ctx)
	defer docs.Stop()

	doc, err := docs.Next()
	if err == iterator.Done {
		// No insights yet
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"actionable_insights": []string{},
			"message": "No insights generated yet. Run the insight processor.",
		})
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	data := doc.Data()

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	json.NewEncoder(w).Encode(data)
}

func getStreamerInfo(w http.ResponseWriter, r *http.Request) {
	// Get channel from environment variable
	channel := os.Getenv("TWITCH_CHANNEL")
	if channel == "" {
		channel = "unknown"
	}

	// Get Twitch API credentials
	clientID := os.Getenv("TWITCH_CLIENT_ID")
	clientSecret := os.Getenv("TWITCH_CLIENT_SECRET")

	// Default streamer info
	streamerInfo := StreamerInfo{
		Channel:     channel,
		DisplayName: channel,
		AvatarURL:   "https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-70x70.png",
		Platform:    "Twitch",
	}

	// Fetch real profile picture from Twitch API
	if clientID != "" && clientSecret != "" {
		// Get OAuth token
		tokenURL := "https://id.twitch.tv/oauth2/token"
		tokenReq, _ := http.NewRequest("POST", tokenURL, nil)
		q := tokenReq.URL.Query()
		q.Add("client_id", clientID)
		q.Add("client_secret", clientSecret)
		q.Add("grant_type", "client_credentials")
		tokenReq.URL.RawQuery = q.Encode()

		client := &http.Client{}
		tokenResp, err := client.Do(tokenReq)
		if err == nil {
			defer tokenResp.Body.Close()
			tokenBody, _ := io.ReadAll(tokenResp.Body)

			var tokenData struct {
				AccessToken string `json:"access_token"`
			}
			json.Unmarshal(tokenBody, &tokenData)

			if tokenData.AccessToken != "" {
				// Get user info from Twitch API
				userURL := fmt.Sprintf("https://api.twitch.tv/helix/users?login=%s", channel)
				userReq, _ := http.NewRequest("GET", userURL, nil)
				userReq.Header.Set("Client-ID", clientID)
				userReq.Header.Set("Authorization", "Bearer "+tokenData.AccessToken)

				userResp, err := client.Do(userReq)
				if err == nil {
					defer userResp.Body.Close()
					userBody, _ := io.ReadAll(userResp.Body)

					var userData TwitchUsersResponse
					json.Unmarshal(userBody, &userData)

					if len(userData.Data) > 0 {
						streamerInfo.DisplayName = userData.Data[0].DisplayName
						streamerInfo.AvatarURL = userData.Data[0].ProfileImageURL
					}
				}
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	json.NewEncoder(w).Encode(streamerInfo)
}

func getAgentActivity(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	// Get recent agent activity (last 50 activities)
	query := firestoreClient.Collection("agent_activity").
		OrderBy("timestamp", firestore.Desc).
		Limit(50)

	docs := query.Documents(ctx)
	defer docs.Stop()

	var activities []AgentActivity

	for {
		doc, err := docs.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			continue
		}

		data := doc.Data()
		activity := AgentActivity{
			ID:           doc.Ref.ID,
			ActivityType: getString(data, "activity_type"),
			Agent:        getString(data, "agent"),
			Status:       getString(data, "status"),
		}

		// Parse timestamp
		if ts, ok := data["timestamp"].(time.Time); ok {
			activity.Timestamp = ts
		}

		// Parse message
		if msg, ok := data["message"].(map[string]interface{}); ok {
			activity.Message = msg
		}

		// Parse result if present
		if result, ok := data["result"].(map[string]interface{}); ok {
			activity.Result = result
		}

		activities = append(activities, activity)
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	json.NewEncoder(w).Encode(activities)
}

func getString(data map[string]interface{}, key string) string {
	if val, ok := data[key].(string); ok {
		return val
	}
	return ""
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}
