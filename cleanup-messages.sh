#!/bin/bash

# Script to clean up old messages from Firestore
# Usage: ./cleanup-messages.sh [days_to_keep] [dry_run]
# Example: ./cleanup-messages.sh 7 true  # Keep last 7 days, dry run (no deletion)
# Example: ./cleanup-messages.sh 7 false # Keep last 7 days, actually delete

set -e

DAYS_TO_KEEP=${1:-7}  # Default: keep last 7 days
DRY_RUN=${2:-true}     # Default: dry run (no actual deletion)

if [ "$DRY_RUN" = "true" ]; then
  echo "🔍 DRY RUN MODE - No messages will be deleted"
else
  echo "⚠️  DELETION MODE - Messages older than $DAYS_TO_KEEP days will be deleted"
  read -p "Are you sure you want to delete messages? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    exit 0
  fi
fi

echo ""
echo "🧹 Cleaning up messages older than $DAYS_TO_KEEP days..."
echo ""

# Create a temporary Go script to clean up messages in the backend/dashboard-api directory
cat > backend/dashboard-api/cleanup_messages_temp.go << 'EOF'
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/joho/godotenv"
	"google.golang.org/api/iterator"
)

func main() {
	// Load environment from project root
	godotenv.Load("../../config/.env")
	
	// Also check environment variable (for Cloud Run)
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
	if projectID == "" {
		log.Fatal("Missing GOOGLE_CLOUD_PROJECT environment variable. Set it in config/.env or as an environment variable.")
	}

	daysToKeep, _ := strconv.Atoi(os.Getenv("DAYS_TO_KEEP"))
	if daysToKeep == 0 {
		daysToKeep = 7
	}

	dryRun := os.Getenv("DRY_RUN") == "true"

	ctx := context.Background()
	client, err := firestore.NewClient(ctx, projectID)
	if err != nil {
		log.Fatalf("Failed to create Firestore client: %v", err)
	}
	defer client.Close()

	fmt.Printf("✅ Connected to Firestore (project: %s)\n", projectID)
	fmt.Printf("📅 Keeping messages from last %d days\n", daysToKeep)
	if dryRun {
		fmt.Println("🔍 DRY RUN MODE - No deletions will be performed")
	} else {
		fmt.Println("⚠️  DELETION MODE - Old messages will be deleted")
	}
	fmt.Println("")

	cutoffTime := time.Now().AddDate(0, 0, -daysToKeep)
	fmt.Printf("🗑️  Messages before %s will be deleted\n", cutoffTime.Format("2006-01-02 15:04:05"))
	fmt.Println("")

	// Query messages older than cutoff time
	query := client.Collection("messages").
		Where("timestamp", "<", cutoffTime).
		OrderBy("timestamp", firestore.Asc).
		Limit(1000) // Process in batches

	iter := query.Documents(ctx)
	defer iter.Stop()

	deletedCount := 0
	totalCount := 0
	batch := client.Batch()
	batchCount := 0
	const batchSize = 500

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			log.Printf("Error iterating documents: %v", err)
			continue
		}

		totalCount++
		data := doc.Data()
		if timestamp, ok := data["timestamp"].(time.Time); ok {
			fmt.Printf("  Found message from %s (ID: %s)\n", 
				timestamp.Format("2006-01-02 15:04:05"), doc.Ref.ID)
		}

		if !dryRun {
			batch.Delete(doc.Ref)
			batchCount++
			deletedCount++

			// Commit batch when it reaches batchSize
			if batchCount >= batchSize {
				_, err := batch.Commit(ctx)
				if err != nil {
					log.Printf("Error committing batch: %v", err)
				} else {
					fmt.Printf("  ✅ Deleted batch of %d messages\n", batchCount)
				}
				batch = client.Batch()
				batchCount = 0
			}
		}
	}

	// Commit remaining batch
	if !dryRun && batchCount > 0 {
		_, err := batch.Commit(ctx)
		if err != nil {
			log.Printf("Error committing final batch: %v", err)
		} else {
			fmt.Printf("  ✅ Deleted final batch of %d messages\n", batchCount)
		}
	}

	fmt.Println("")
	if dryRun {
		fmt.Printf("🔍 DRY RUN COMPLETE\n")
		fmt.Printf("   Found %d messages older than %d days\n", totalCount, daysToKeep)
		fmt.Printf("   Run with DRY_RUN=false to actually delete them\n")
	} else {
		fmt.Printf("✅ CLEANUP COMPLETE\n")
		fmt.Printf("   Deleted %d messages older than %d days\n", deletedCount, daysToKeep)
	}
}
EOF

# Run the cleanup script from the dashboard-api directory (where go.mod exists)
cd backend/dashboard-api
export DAYS_TO_KEEP=$DAYS_TO_KEEP
export DRY_RUN=$DRY_RUN

go run cleanup_messages_temp.go

# Clean up
rm cleanup_messages_temp.go
cd ../..

echo ""
echo "✅ Done!"

