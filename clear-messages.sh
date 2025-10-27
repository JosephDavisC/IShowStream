#!/bin/bash

# Clear all messages from Firestore

echo "🗑️  Clear StreamSense Firestore Data"
echo ""
echo "This will delete:"
echo "  - All chat messages"
echo "  - All insights"
echo "  - All analytics data"
echo ""
echo "⚠️  WARNING: This action cannot be undone!"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " -r
echo

if [[ ! $REPLY == "yes" ]]; then
    echo "❌ Cancelled. No data was deleted."
    exit 0
fi

echo ""
echo "🔥 Clearing Firestore collections..."
echo ""

# Create a temporary Go script to clear Firestore
cat > /tmp/clear_firestore.go << 'EOF'
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

	// Collections to clear
	collections := []string{"messages", "insights", "analytics"}

	for _, collectionName := range collections {
		fmt.Printf("📦 Clearing collection: %s\n", collectionName)

		// Get all documents in the collection
		iter := client.Collection(collectionName).Documents(ctx)
		numDeleted := 0

		for {
			doc, err := iter.Next()
			if err == iterator.Done {
				break
			}
			if err != nil {
				log.Printf("Error iterating documents in %s: %v", collectionName, err)
				break
			}

			// Delete the document
			_, err = doc.Ref.Delete(ctx)
			if err != nil {
				log.Printf("Error deleting document %s: %v", doc.Ref.ID, err)
			} else {
				numDeleted++
			}
		}

		fmt.Printf("   ✅ Deleted %d documents from %s\n", numDeleted, collectionName)
	}

	fmt.Println("")
	fmt.Println("✅ All collections cleared!")
}
EOF

# Run the cleanup script
cd "$(dirname "$0")"
go run /tmp/clear_firestore.go

# Clean up
rm /tmp/clear_firestore.go

echo ""
echo "🎉 Done! Your Firestore database is now empty."
echo "   New messages from the current channel will start appearing shortly."
