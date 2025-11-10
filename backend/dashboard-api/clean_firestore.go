package main

import (
	"context"
	"fmt"
	"log"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
)

func deleteCollection(ctx context.Context, client *firestore.Client, collectionName string, batchSize int) error {
	fmt.Printf("\n🗑️  Deleting collection: %s\n", collectionName)
	
	deleted := 0
	for {
		// Get a batch of documents
		iter := client.Collection(collectionName).Limit(batchSize).Documents(ctx)
		numDeleted := 0

		// Create a batch
		batch := client.Batch()
		for {
			doc, err := iter.Next()
			if err == iterator.Done {
				break
			}
			if err != nil {
				return fmt.Errorf("error iterating documents: %v", err)
			}

			batch.Delete(doc.Ref)
			numDeleted++
		}

		// If there are no documents to delete, we're done
		if numDeleted == 0 {
			break
		}

		// Commit the batch
		_, err := batch.Commit(ctx)
		if err != nil {
			return fmt.Errorf("error committing batch: %v", err)
		}

		deleted += numDeleted
		fmt.Printf("   Deleted %d documents...\r", deleted)
	}

	fmt.Printf("   ✅ Deleted %d documents from %s\n", deleted, collectionName)
	return nil
}

func main() {
	ctx := context.Background()

	// Initialize Firestore client
	projectID := "streamsense-476705"
	client, err := firestore.NewClient(ctx, projectID)
	if err != nil {
		log.Fatalf("Failed to create Firestore client: %v", err)
	}
	defer client.Close()

	fmt.Println("======================================================================")
	fmt.Println("🧹 CLEANING FIRESTORE DATABASE")
	fmt.Println("======================================================================")

	// Collections to clean
	collections := []string{
		"messages",        // Chat messages
		"trends",          // Trend analysis
		"insights",        // AI insights
		"agent_activity",  // Agent activity logs
		"users",           // User profiles
	}

	totalDeleted := 0
	for _, collection := range collections {
		err := deleteCollection(ctx, client, collection, 100)
		if err != nil {
			fmt.Printf("   ❌ Error deleting %s: %v\n", collection, err)
		}
	}

	fmt.Println("\n======================================================================")
	fmt.Printf("✅ CLEANUP COMPLETE - Deleted %d total documents\n", totalDeleted)
	fmt.Println("======================================================================")

	// Reset monitoring config
	fmt.Println("\n🔧 Resetting monitoring config...")
	configRef := client.Collection("config").Doc("twitch_channel")
	_, err = configRef.Update(ctx, []firestore.Update{
		{Path: "monitoring_enabled", Value: true},
		{Path: "updatedAt", Value: firestore.ServerTimestamp},
	})
	if err != nil {
		fmt.Printf("   ⚠️  Could not reset config: %v\n", err)
	} else {
		fmt.Println("   ✅ Reset monitoring_enabled to True")
	}

	fmt.Println("\n🎉 Database is now clean! You can sign in with a new account.")
}

