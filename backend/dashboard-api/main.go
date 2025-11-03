package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
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

type HypeMeter struct {
	Score        float64   `json:"score"`         // 0-100
	ViewerCount  int       `json:"viewer_count"`  // Estimated from message rate
	MessageRate  float64   `json:"message_rate"`  // messages per 10 seconds
	BaselineRate float64   `json:"baseline_rate"` // baseline messages per 10 seconds
	Timestamp    time.Time `json:"timestamp"`
}

type Highlight struct {
	ID           string    `json:"id"`
	StartTime    time.Time `json:"start_time"`
	EndTime      time.Time `json:"end_time"`
	Duration     int       `json:"duration"`      // seconds
	PeakHype     float64   `json:"peak_hype"`     // 0-100
	MessageCount int       `json:"message_count"` // messages during highlight
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
		// Allow connections from localhost:3000 (React dev server)
		return true
	},
}

// Hype meter state
type HypeTracker struct {
	mu             sync.RWMutex
	messageTimes   []time.Time // Sliding window of message timestamps
	baselineEMA    float64     // Exponential moving average of message rate
	lastUpdate     time.Time
	currentHype    float64
	highlightStart *time.Time
}

var hypeTracker = &HypeTracker{
	messageTimes: make([]time.Time, 0, 1000),
	baselineEMA:  10.0, // Initial baseline: 10 messages per 10 seconds
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
	go trackHypeMeter(ctx) // Start hype meter tracker
	log.Println("✅ WebSocket hub started")

	// Set up routes
	mux := http.NewServeMux()
	mux.HandleFunc("/api/messages/recent", getRecentMessages)
	mux.HandleFunc("/api/messages/priority", getPriorityMessages)
	mux.HandleFunc("/api/stats", getStats)
	mux.HandleFunc("/api/insights/latest", getLatestInsights)
	mux.HandleFunc("/api/streamer", getStreamerInfo)
	mux.HandleFunc("/api/agent-activity", getAgentActivity)
	mux.HandleFunc("/api/hype-meter", getHypeMeter)
	mux.HandleFunc("/api/highlights", getHighlights)
	mux.HandleFunc("/ws", handleWebSocket)
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

		// Add to hype tracker
		addMessageToHypeTracker(msg.Timestamp)
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

// Track hype meter by monitoring message rate
func trackHypeMeter(ctx context.Context) {
	log.Println("🔥 Starting Hype Meter tracker...")
	ticker := time.NewTicker(200 * time.Millisecond) // Update every 0.2s
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			updateHypeMeter(ctx)
		case <-ctx.Done():
			return
		}
	}
}

func updateHypeMeter(ctx context.Context) {
	hypeTracker.mu.Lock()
	defer hypeTracker.mu.Unlock()

	now := time.Now()
	cutoff10s := now.Add(-10 * time.Second)
	cutoff30s := now.Add(-30 * time.Second)
	cutoff2min := now.Add(-2 * time.Minute)

	// Clean old messages
	filtered := make([]time.Time, 0, len(hypeTracker.messageTimes))
	for _, t := range hypeTracker.messageTimes {
		if t.After(cutoff2min) {
			filtered = append(filtered, t)
		}
	}
	hypeTracker.messageTimes = filtered

	// Count messages in windows
	count10s := 0
	count30s := 0
	for _, t := range filtered {
		if t.After(cutoff10s) {
			count10s++
		}
		if t.After(cutoff30s) {
			count30s++
		}
	}

	// Calculate current rate (messages per 10 seconds)
	currentRate := float64(count10s)
	mediumRate := float64(count30s) / 3.0 // Normalize to per 10 seconds

	// Update baseline with exponential moving average (alpha = 0.1 for slow adaptation)
	alpha := 0.1
	hypeTracker.baselineEMA = alpha*mediumRate + (1-alpha)*hypeTracker.baselineEMA

	// Ensure minimum baseline
	if hypeTracker.baselineEMA < 1.0 {
		hypeTracker.baselineEMA = 1.0
	}

	// Calculate spike ratio
	spikeRatio := currentRate / hypeTracker.baselineEMA

	// Normalization for high viewership streams
	normalizationFactor := 1.0
	if hypeTracker.baselineEMA > 50.0 {
		normalizationFactor = 50.0 / hypeTracker.baselineEMA
	}

	// Calculate raw hype score (0-100)
	normalizedSpike := spikeRatio * normalizationFactor
	rawScore := (normalizedSpike - 1.0) * 50.0

	// Clamp score
	if rawScore < 0 {
		rawScore = 0
	}
	if rawScore > 100 {
		rawScore = 100
	}

	// Smooth with exponential moving average (faster rise, slower fall)
	alphaRise := 0.3
	alphaFall := 0.1
	if rawScore > hypeTracker.currentHype {
		hypeTracker.currentHype = alphaRise*rawScore + (1-alphaRise)*hypeTracker.currentHype
	} else {
		hypeTracker.currentHype = alphaFall*rawScore + (1-alphaFall)*hypeTracker.currentHype
	}

	hypeTracker.lastUpdate = now

	// Check for highlight moments (hype > 70% for >30 seconds)
	if hypeTracker.currentHype > 70.0 {
		if hypeTracker.highlightStart == nil {
			start := now
			hypeTracker.highlightStart = &start
		} else if now.Sub(*hypeTracker.highlightStart) > 30*time.Second {
			// Save highlight
			saveHighlight(ctx, *hypeTracker.highlightStart, now, hypeTracker.currentHype, count10s)
			hypeTracker.highlightStart = nil
		}
	} else {
		hypeTracker.highlightStart = nil
	}

	// Broadcast via WebSocket
	hypeData := HypeMeter{
		Score:        hypeTracker.currentHype,
		ViewerCount:  estimateViewerCount(hypeTracker.baselineEMA),
		MessageRate:  currentRate,
		BaselineRate: hypeTracker.baselineEMA,
		Timestamp:    now,
	}

	hypeJSON, err := json.Marshal(map[string]interface{}{
		"type": "hype_meter",
		"data": hypeData,
	})
	if err == nil {
		wsHub.broadcast <- hypeJSON
	}
}

func estimateViewerCount(baselineRate float64) int {
	// Rough estimation: ~1 message per 100 viewers per 10 seconds
	// Adjust based on your chat activity patterns
	estimated := int(baselineRate * 100)
	if estimated < 100 {
		return 100
	}
	return estimated
}

func saveHighlight(ctx context.Context, startTime, endTime time.Time, peakHype float64, messageCount int) {
	highlight := map[string]interface{}{
		"start_time":    startTime,
		"end_time":      endTime,
		"duration":      int(endTime.Sub(startTime).Seconds()),
		"peak_hype":     peakHype,
		"message_count": messageCount,
		"created_at":    time.Now(),
	}

	_, _, err := firestoreClient.Collection("highlights").Add(ctx, highlight)
	if err != nil {
		log.Printf("⚠️  Error saving highlight: %v", err)
	} else {
		log.Printf("✨ Highlight saved: %.0f%% hype, %d messages, %ds duration", peakHype, messageCount, int(endTime.Sub(startTime).Seconds()))
	}
}

// Add message timestamp to hype tracker
func addMessageToHypeTracker(timestamp time.Time) {
	hypeTracker.mu.Lock()
	defer hypeTracker.mu.Unlock()
	hypeTracker.messageTimes = append(hypeTracker.messageTimes, timestamp)
	// Keep only last 2 minutes
	if len(hypeTracker.messageTimes) > 1200 { // ~10 msg/sec max
		hypeTracker.messageTimes = hypeTracker.messageTimes[len(hypeTracker.messageTimes)-1200:]
	}
}

func getHypeMeter(w http.ResponseWriter, r *http.Request) {
	hypeTracker.mu.RLock()
	currentHype := hypeTracker.currentHype
	baseline := hypeTracker.baselineEMA
	lastUpdate := hypeTracker.lastUpdate
	hypeTracker.mu.RUnlock()

	// Count recent messages
	count10s := 0
	cutoff10s := time.Now().Add(-10 * time.Second)
	hypeTracker.mu.RLock()
	for _, t := range hypeTracker.messageTimes {
		if t.After(cutoff10s) {
			count10s++
		}
	}
	hypeTracker.mu.RUnlock()

	hype := HypeMeter{
		Score:        currentHype,
		ViewerCount:  estimateViewerCount(baseline),
		MessageRate:  float64(count10s),
		BaselineRate: baseline,
		Timestamp:    lastUpdate,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	json.NewEncoder(w).Encode(hype)
}

func getHighlights(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	// Get last 20 highlights
	query := firestoreClient.Collection("highlights").
		OrderBy("start_time", firestore.Desc).
		Limit(20)

	docs := query.Documents(ctx)
	defer docs.Stop()

	var highlights []Highlight
	for {
		doc, err := docs.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		data := doc.Data()
		highlight := Highlight{
			ID: doc.Ref.ID,
		}

		if st, ok := data["start_time"].(time.Time); ok {
			highlight.StartTime = st
		}
		if et, ok := data["end_time"].(time.Time); ok {
			highlight.EndTime = et
		}
		if d, ok := data["duration"].(int64); ok {
			highlight.Duration = int(d)
		}
		if ph, ok := data["peak_hype"].(float64); ok {
			highlight.PeakHype = ph
		}
		if mc, ok := data["message_count"].(int64); ok {
			highlight.MessageCount = int(mc)
		}

		highlights = append(highlights, highlight)
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	json.NewEncoder(w).Encode(highlights)
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
