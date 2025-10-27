//go:build ignore
// +build ignore

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
	fmt.Println("📊 Checking for analyzed messages...\n")

	// Query messages that have spam_analysis
	iter := client.Collection("messages").
		Where("spam_analysis", "!=", nil).
		Limit(20).
		Documents(ctx)

	count := 0
	spamCount := 0

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

		username := data["username"]
		message := data["message"]

		// Get spam analysis
		if analysis, ok := data["spam_analysis"].(map[string]interface{}); ok {
			isSpam := analysis["is_spam"].(bool)
			confidence := int(analysis["confidence"].(int64))
			reason := analysis["reason"].(string)

			if isSpam {
				spamCount++
				fmt.Printf("🚫 SPAM [%d%%]: [%v] %v\n", confidence, username, message)
				fmt.Printf("   Reason: %s\n\n", reason)
			} else {
				fmt.Printf("✅ CLEAN [%d%%]: [%v] %v\n", confidence, username, message)
				fmt.Printf("   Reason: %s\n\n", reason)
			}
		}
	}

	fmt.Println("═══════════════════════════════════════════")
	fmt.Printf("📈 Summary: %d messages analyzed\n", count)
	fmt.Printf("🚫 Spam detected: %d messages\n", spamCount)
	fmt.Printf("✅ Clean messages: %d messages\n", count-spamCount)

	if count == 0 {
		fmt.Println("\n⚠️  No analyzed messages found!")
		fmt.Println("💡 Run the message processor to analyze messages.")
	}
}
