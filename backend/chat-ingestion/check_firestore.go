package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"cloud.google.com/go/firestore"
	"github.com/joho/godotenv"
	"google.golang.org/api/iterator"
)

func main() {
	// Load environment variables
	err := godotenv.Load("../../config/.env")
	if err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
	if projectID == "" {
		log.Fatal("Missing GOOGLE_CLOUD_PROJECT environment variable")
	}

	// Initialize Firestore
	ctx := context.Background()
	client, err := firestore.NewClient(ctx, projectID)
	if err != nil {
		log.Fatal("Failed to create Firestore client:", err)
	}
	defer client.Close()

	fmt.Println("✅ Connected to Firestore")
	fmt.Println("📊 Checking messages collection...\n")

	// Count documents in messages collection
	iter := client.Collection("messages").Limit(10).Documents(ctx)
	count := 0

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			log.Printf("Error reading document: %v\n", err)
			break
		}

		count++
		data := doc.Data()

		// Print first few messages as samples
		if count <= 5 {
			fmt.Printf("Message %d:\n", count)
			fmt.Printf("  ID: %s\n", doc.Ref.ID)
			fmt.Printf("  Username: %v\n", data["username"])
			fmt.Printf("  Message: %v\n", data["message"])
			fmt.Printf("  Channel: %v\n", data["channel"])
			fmt.Printf("  Timestamp: %v\n", data["timestamp"])
			fmt.Println()
		}
	}

	if count == 0 {
		fmt.Println("⚠️  No messages found in Firestore!")
		fmt.Println("💡 Make sure the chat ingestion service ran and saved some messages.")
	} else {
		fmt.Printf("✅ Found at least %d messages in Firestore (showing first 5)\n", count)
		fmt.Println("\n📍 View all data in Firestore Console:")
		fmt.Printf("https://console.firebase.google.com/project/%s/firestore/databases/-default-/data/~2Fmessages\n", projectID)
	}
}
