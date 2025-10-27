//go:build ignore
// +build ignore

package main

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	err := godotenv.Load("../../config/.env")
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	clientID := os.Getenv("TWITCH_CLIENT_ID")
	clientSecret := os.Getenv("TWITCH_CLIENT_SECRET")

	if clientID == "" || clientSecret == "" {
		log.Fatal("Twitch credentials not found in .env")
	}

	fmt.Println("✅ Environment variables loaded successfully!")
	fmt.Printf("Client ID: %s...\n", clientID[:10])
	fmt.Println("Ready to connect to Twitch!")
}
