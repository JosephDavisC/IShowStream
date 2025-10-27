import os
import sys
import time
import signal
from google.cloud import firestore
from dotenv import load_dotenv
from spam_filter_agent import SpamFilterAgent

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv('../../config/.env')


running = True


def _shutdown(signum, frame):
    global running
    print(f"\n🛑 Received signal {signum}, shutting down processor...")
    running = False


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

    # Hook signals
    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    while running:
        try:
            # Query recent messages
            query = db.collection('messages').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(10)

            messages = query.stream()

            for doc in messages:
                if not running:
                    break
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

                # Update Firestore with analysis and processing metadata
                processing_metadata = {
                    'processed_by_host': os.uname().nodename if hasattr(os, 'uname') else os.getenv('HOSTNAME', 'unknown'),
                    'processed_by_pid': os.getpid(),
                }

                if os.getenv('DISABLE_FIRESTORE_WRITES', '0') in ('0', 'false', 'False', ''):
                    doc.reference.update({
                        'spam_analysis': result,
                        'processed_at': firestore.SERVER_TIMESTAMP,
                        'processing_metadata': processing_metadata,
                    })
                else:
                    print('⚠️  Firestore writes disabled; skipping processor update')

                last_processed = doc_id

                # Rate limiting: Wait 6 seconds between API calls to respect free tier (10/min)
                print("   ⏳ Waiting 6s to respect API rate limits...")
                for _ in range(6):
                    if not running:
                        break
                    time.sleep(1)

            # Wait before checking again
            for _ in range(5):
                if not running:
                    break
                time.sleep(1)

        except Exception as e:
            print(f"❌ Error: {e}")
            time.sleep(5)


if __name__ == "__main__":
    process_new_messages()