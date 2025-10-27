package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"

	"github.com/joho/godotenv"
)

type TokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
	TokenType   string `json:"token_type"`
}

type ErrorResponse struct {
	Status  int    `json:"status"`
	Message string `json:"message"`
}

func main() {
	// Load environment variables
	err := godotenv.Load("../../config/.env")
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	clientID := os.Getenv("TWITCH_CLIENT_ID")
	clientSecret := os.Getenv("TWITCH_CLIENT_SECRET")

	// Debug: Show what we have
	fmt.Println("🔍 Debug Info:")
	fmt.Printf("Client ID length: %d\n", len(clientID))
	fmt.Printf("Client Secret length: %d\n", len(clientSecret))

	if clientID == "" || clientSecret == "" {
		log.Fatal("❌ Twitch credentials are empty!")
	}

	// Get OAuth token
	tokenURL := "https://id.twitch.tv/oauth2/token"

	data := url.Values{}
	data.Set("client_id", clientID)
	data.Set("client_secret", clientSecret)
	data.Set("grant_type", "client_credentials")

	fmt.Println("\n📡 Sending request to Twitch...")
	resp, err := http.PostForm(tokenURL, data)
	if err != nil {
		log.Fatal("Error getting token:", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatal("Error reading response:", err)
	}

	// Debug: Show raw response
	fmt.Println("\n📄 Raw Response:")
	fmt.Println(string(body))
	fmt.Printf("\nStatus Code: %d\n", resp.StatusCode)

	// Check for error response
	if resp.StatusCode != 200 {
		var errResp ErrorResponse
		json.Unmarshal(body, &errResp)
		fmt.Printf("❌ Error: %s\n", errResp.Message)
		return
	}

	var tokenResp TokenResponse
	err = json.Unmarshal(body, &tokenResp)
	if err != nil {
		log.Fatal("Error parsing JSON:", err)
	}

	fmt.Println("\n✅ OAuth Token Generated Successfully!")
	fmt.Println("Token:", tokenResp.AccessToken)
	fmt.Println("\nAdd this to your .env file:")
	fmt.Printf("TWITCH_OAUTH_TOKEN=%s\n", tokenResp.AccessToken)
}
