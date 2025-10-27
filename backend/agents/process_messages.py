import os
import sys
import time
from google.cloud import firestore
from dotenv import load_dotenv
from spam_filter_agent import SpamFilterAgent

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv('../../config/.env')

def process_new_messages():
    """Process new messages from Firestore"""
    
    # Initialize Firestore
    project_id = os.getenv('GOOGLE_CLOUD_PROJECT')
    db = firestore.Client(project=project_id)
    
    # Initialize spam filter agent
    agent = SpamFilterAgent()
    
    print("🚀 Starting message processor...")
    print("👀 Watching for new messages in Firestore...\n")
    
    # Track last processed message
    last_processed = None
    
    while True:
        try:
            # Query recent messages
            query = db.collection('messages').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(10)
            
            messages = query.stream()
            
            for doc in messages:
                msg = doc.to_dict()
                doc_id = doc.id

                # Skip if already processed
                if doc_id == last_processed:
                    continue

                # Skip if already has spam analysis
                if 'spam_analysis' in msg:
                    continue

                username = msg.get('username', 'Unknown')
                message = msg.get('message', '')

                print(f"📨 Processing: [{username}] {message}")

                # Analyze with agent
                result = agent.analyze_message(username, message)

                print(f"   {'🚫 SPAM' if result['is_spam'] else '✅ CLEAN'} (Confidence: {result['confidence']}%)")

                # Update Firestore with analysis
                doc.reference.update({
                    'spam_analysis': result,
                    'processed_at': firestore.SERVER_TIMESTAMP
                })

                last_processed = doc_id

                # Rate limiting: Wait 6 seconds between API calls to respect free tier (10/min)
                print("   ⏳ Waiting 6s to respect API rate limits...")
                time.sleep(6)

            # Wait before checking again
            time.sleep(5)
            
        except KeyboardInterrupt:
            print("\n👋 Shutting down processor...")
            break
        except Exception as e:
            print(f"❌ Error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    process_new_messages()