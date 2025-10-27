#!/bin/bash

# Initialize Firestore Collections for StreamSense

echo "🔥 Initializing Firestore Collections for StreamSense"
echo ""

# Create a temporary Go script to initialize Firestore
cat > /tmp/init_firestore.go << 'EOF'
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment
	godotenv.Load("config/.env")

	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
	if projectID == "" {
		log.Fatal("Missing GOOGLE_CLOUD_PROJECT environment variable")
	}

	ctx := context.Background()
	client, err := firestore.NewClient(ctx, projectID)
	if err != nil {
		log.Fatalf("Failed to create Firestore client: %v", err)
	}
	defer client.Close()

	fmt.Println("✅ Connected to Firestore")
	fmt.Println("")

	// Initialize messages collection with a test document
	fmt.Println("📦 Creating 'messages' collection...")
	_, err = client.Collection("messages").Doc("_init").Set(ctx, map[string]interface{}{
		"_initialized": true,
		"timestamp":    time.Now(),
		"note":         "This collection stores Twitch chat messages",
	})
	if err != nil {
		log.Printf("Error creating messages collection: %v", err)
	} else {
		fmt.Println("   ✅ 'messages' collection created")
	}

	// Initialize insights collection
	fmt.Println("📦 Creating 'insights' collection...")
	_, err = client.Collection("insights").Doc("_init").Set(ctx, map[string]interface{}{
		"_initialized": true,
		"timestamp":    time.Now(),
		"note":         "This collection stores AI-generated insights",
	})
	if err != nil {
		log.Printf("Error creating insights collection: %v", err)
	} else {
		fmt.Println("   ✅ 'insights' collection created")
	}

	// Initialize analytics collection
	fmt.Println("📦 Creating 'analytics' collection...")
	_, err = client.Collection("analytics").Doc("_init").Set(ctx, map[string]interface{}{
		"_initialized": true,
		"timestamp":    time.Now(),
		"note":         "This collection stores analytics data",
	})
	if err != nil {
		log.Printf("Error creating analytics collection: %v", err)
	} else {
		fmt.Println("   ✅ 'analytics' collection created")
	}

	fmt.Println("")
	fmt.Println("✅ All collections initialized!")
	fmt.Println("")
	fmt.Println("📝 Note: The '_init' documents will be automatically replaced")
	fmt.Println("   with real data as the services run.")
}
EOF

# Run the initialization script
cd "$(dirname "$0")"
go run /tmp/init_firestore.go

# Clean up
rm /tmp/init_firestore.go

echo ""
echo "🎉 Done! Your Firestore database is ready."
echo "   New messages will start appearing shortly."
