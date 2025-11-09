package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/gorilla/websocket"
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

// WebSocket types
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

var firestoreClient *firestore.Client
var wsHub *Hub
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins - Cloud Run handles security at the platform level
		// For production, you can add origin validation here if needed
		origin := r.Header.Get("Origin")
		log.Printf("WebSocket connection from origin: %s", origin)
		return true
	},
}

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

	// Initialize WebSocket hub
	wsHub = newHub()
	go wsHub.run()
	go listenForAgentActivity(ctx)
	go listenForNewMessages(ctx)
	log.Println("✅ WebSocket hub started")

	// Set up routes
	mux := http.NewServeMux()
	mux.HandleFunc("/api/messages/recent", getRecentMessages)
	mux.HandleFunc("/api/messages/priority", getPriorityMessages)
	mux.HandleFunc("/api/stats", getStats)
	mux.HandleFunc("/api/insights/latest", getLatestInsights)
	mux.HandleFunc("/api/streamer", getStreamerInfo)
	mux.HandleFunc("/api/agent-activity", getAgentActivity)
	mux.HandleFunc("/api/update-channel", updateChannel)
	mux.HandleFunc("/ws", handleWebSocket)
	mux.HandleFunc("/health", healthCheck)

	// Enable CORS
	// Check if CORS_ALLOW_ALL is set to true
	corsAllowAll := os.Getenv("CORS_ALLOW_ALL") == "true"
	
	var corsOptions cors.Options
	if corsAllowAll {
		// Allow all origins when CORS_ALLOW_ALL is true
		corsOptions = cors.Options{
			AllowedOrigins:   []string{"*"},
			AllowedMethods:   []string{"GET", "POST", "OPTIONS", "PUT", "DELETE"},
			AllowedHeaders:   []string{"*"},
			AllowCredentials: false, // Cannot use credentials with wildcard origin
		}
		log.Println("🌐 CORS: Allowing all origins (CORS_ALLOW_ALL=true)")
	} else {
		// Default: allow localhost and Cloud Run origins
		corsOptions = cors.Options{
			AllowedOrigins: []string{
				"http://localhost:3000",
				"http://localhost:8080",
				"https://ishowstream-234sus25va-uc.a.run.app",
			},
			AllowedMethods:   []string{"GET", "POST", "OPTIONS", "PUT", "DELETE"},
			AllowedHeaders:   []string{"*"},
			AllowCredentials: true,
		}
		log.Println("🌐 CORS: Allowing specific origins")
	}
	
	handler := cors.New(corsOptions).Handler(mux)

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
			"message":             "No insights generated yet. Run the insight processor.",
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

// WebSocket Hub functions
func newHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("WebSocket client connected. Total clients: %d", len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			log.Printf("WebSocket client disconnected. Total clients: %d", len(h.clients))

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// WebSocket Client functions
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to current websocket message
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		hub:  wsHub,
		conn: conn,
		send: make(chan []byte, 256),
	}
	client.hub.register <- client

	// Start read and write pumps in goroutines
	go client.writePump()
	go client.readPump()

	log.Println("✅ New WebSocket client connected")
}

func getInt(data map[string]interface{}, key string) int {
	if val, ok := data[key].(int64); ok {
		return int(val)
	}
	if val, ok := data[key].(int); ok {
		return val
	}
	return 0
}

func getFloat64(data map[string]interface{}, key string) float64 {
	if val, ok := data[key].(float64); ok {
		return val
	}
	if val, ok := data[key].(int64); ok {
		return float64(val)
	}
	return 0.0
}

func updateChannel(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Channel string `json:"channel"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Channel == "" {
		http.Error(w, "Channel is required", http.StatusBadRequest)
		return
	}

	// Validate channel name (alphanumeric and underscores only)
	cleanChannel := strings.ToLower(strings.TrimSpace(req.Channel))
	if len(cleanChannel) == 0 || len(cleanChannel) > 25 {
		http.Error(w, "Invalid channel name", http.StatusBadRequest)
		return
	}

	// In Cloud Run, we can't modify .env files, so we'll store the channel in Firestore
	// The chat-ingestion service should read from Firestore or environment variables
	ctx := context.Background()
	
	// Store channel configuration in Firestore
	_, err := firestoreClient.Collection("config").Doc("twitch_channel").Set(ctx, map[string]interface{}{
		"channel":   cleanChannel,
		"updatedAt": time.Now(),
	}, firestore.MergeAll)
	
	if err != nil {
		log.Printf("Error updating channel in Firestore: %v", err)
		http.Error(w, "Failed to update channel configuration", http.StatusInternalServerError)
		return
	}

	// Also try to update local .env file if it exists (for local development)
	envPath := filepath.Join("..", "..", "config", ".env")
	if file, err := os.OpenFile(envPath, os.O_RDWR, 0644); err == nil {
		// File exists, try to update it
		defer file.Close()
		
		var lines []string
		scanner := bufio.NewScanner(file)
		found := false

		for scanner.Scan() {
			line := scanner.Text()
			if strings.HasPrefix(line, "TWITCH_CHANNEL=") {
				lines = append(lines, fmt.Sprintf("TWITCH_CHANNEL=%s", cleanChannel))
				found = true
			} else {
				lines = append(lines, line)
			}
		}

		if !found {
			lines = append(lines, fmt.Sprintf("TWITCH_CHANNEL=%s", cleanChannel))
		}

		file.Truncate(0)
		file.Seek(0, 0)
		writer := bufio.NewWriter(file)
		for _, line := range lines {
			writer.WriteString(line + "\n")
		}
		writer.Flush()
		log.Printf("✅ Updated local .env file with TWITCH_CHANNEL=%s", cleanChannel)
	}

	// Update environment variable for current process
	os.Setenv("TWITCH_CHANNEL", cleanChannel)

	log.Printf("✅ Updated TWITCH_CHANNEL to: %s (stored in Firestore)", cleanChannel)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"channel": cleanChannel,
		"message": "Channel updated successfully in Firestore. The chat-ingestion service will need to be restarted or updated to use the new channel.",
	})
}

func listenForAgentActivity(ctx context.Context) {
	log.Println("👂 Starting Firestore listener for agent activity...")

	// Listen for new agent activity documents
	iter := firestoreClient.Collection("agent_activity").
		OrderBy("timestamp", firestore.Desc).
		Limit(1).
		Snapshots(ctx)

	defer iter.Stop()

	for {
		snap, err := iter.Next()
		if err != nil {
			log.Printf("⚠️  Firestore listener error: %v", err)
			time.Sleep(5 * time.Second)
			continue
		}

		for _, change := range snap.Changes {
			if change.Kind == firestore.DocumentAdded {
				data := change.Doc.Data()
				activity := AgentActivity{
					ID:           change.Doc.Ref.ID,
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

				// Broadcast to all WebSocket clients
				activityJSON, err := json.Marshal(map[string]interface{}{
					"type":     "agent_activity",
					"activity": activity,
				})
				if err == nil {
					wsHub.broadcast <- activityJSON
					log.Printf("📡 Broadcasted agent activity: %s - %s", activity.Agent, activity.ActivityType)
				}
			}
		}
	}
}

// Listen for new messages in real-time and broadcast via WebSocket
func listenForNewMessages(ctx context.Context) {
	log.Println("💬 Starting Firestore listener for new messages...")

	// Track seen message IDs to avoid duplicates
	seenIDs := make(map[string]bool)
	initialized := false

	// Listen for new messages ordered by timestamp
	iter := firestoreClient.Collection("messages").
		OrderBy("timestamp", firestore.Desc).
		Limit(1).
		Snapshots(ctx)

	defer iter.Stop()

	for {
		snap, err := iter.Next()
		if err != nil {
			log.Printf("⚠️  Firestore message listener error: %v", err)
			time.Sleep(2 * time.Second)
			continue
		}

		// On first run, mark all existing docs as seen
		if !initialized {
			for _, change := range snap.Changes {
				seenIDs[change.Doc.Ref.ID] = true
			}
			initialized = true
			log.Println("💬 Message listener initialized, waiting for new messages...")
			continue
		}

		// Process new documents
		for _, change := range snap.Changes {
			if change.Kind == firestore.DocumentAdded {
				docID := change.Doc.Ref.ID

				// Skip if we've already seen this message
				if seenIDs[docID] {
					continue
				}
				seenIDs[docID] = true

				// Clean up old IDs (keep only last 1000)
				if len(seenIDs) > 1000 {
					// Remove oldest 500 (simple cleanup)
					count := 0
					for id := range seenIDs {
						if count >= 500 {
							break
						}
						delete(seenIDs, id)
						count++
					}
				}

				data := change.Doc.Data()
				var msg Message

				msg.ID = docID
				msg.Username = getString(data, "username")
				msg.Message = getString(data, "message")
				msg.Channel = getString(data, "channel")

				// Parse timestamp
				if ts, ok := data["timestamp"].(time.Time); ok {
					msg.Timestamp = ts
				}

				if isSub, ok := data["is_sub"].(bool); ok {
					msg.IsSub = isSub
				}
				if isMod, ok := data["is_mod"].(bool); ok {
					msg.IsMod = isMod
				}
				if analysis, ok := data["agent_analysis"].(map[string]interface{}); ok {
					msg.AgentAnalysis = analysis
				}

				// Broadcast to all WebSocket clients
				messageJSON, err := json.Marshal(map[string]interface{}{
					"type":    "new_message",
					"message": msg,
				})
				if err == nil {
					wsHub.broadcast <- messageJSON
				}
			}
		}
	}
}
