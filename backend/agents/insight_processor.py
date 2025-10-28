import os
import sys
import time
from datetime import datetime, timedelta
from google.cloud import firestore
from dotenv import load_dotenv
from insight_agent import InsightAgent

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv('../../config/.env')

def generate_insights():
    """
    Periodically analyze recent chat messages and generate insights
    Runs every 5 minutes and analyzes the last 5 minutes of chat
    """

    # Initialize Firestore
    project_id = os.getenv('GOOGLE_CLOUD_PROJECT')
    db = firestore.Client(project=project_id)

    # Initialize insight agent
    agent = InsightAgent()

    print("🧠 StreamSense Insight Generator Started!")
    print("📊 Analyzing chat every 1 minute for actionable insights...\n")

    while True:
        try:
            # Get messages from last 1 minute
            one_minute_ago = datetime.utcnow() - timedelta(seconds=60)

            query = db.collection('messages').where(
                'timestamp', '>=', one_minute_ago
            ).order_by('timestamp').limit(100)

            docs = query.stream()

            messages = []
            for doc in docs:
                msg_data = doc.to_dict()
                messages.append({
                    'username': msg_data.get('username'),
                    'message': msg_data.get('message'),
                    'timestamp': msg_data.get('timestamp')
                })

            if len(messages) < 5:
                print(f"⏳ Not enough messages yet ({len(messages)} messages). Waiting...")
                time.sleep(10)  # Wait 10 seconds before checking again
                continue

            print(f"\n📨 Analyzing {len(messages)} messages from last 1 minute...")

            # Generate insights
            insights = agent.analyze_batch(messages)

            if "error" not in insights:
                # Save insights to Firestore
                insight_doc = {
                    'timestamp': firestore.SERVER_TIMESTAMP,
                    'message_count': len(messages),
                    'insights': insights,
                    'timeframe': '1_minute'
                }

                db.collection('insights').add(insight_doc)

                # Display insights
                print("\n" + "="*60)
                print("💡 NEW INSIGHTS GENERATED")
                print("="*60)

                if insights.get('actionable_insights'):
                    print("\n🎯 Actions for Streamer:")
                    for insight in insights['actionable_insights']:
                        print(f"  • {insight}")

                if insights.get('sentiment'):
                    sentiment = insights['sentiment']
                    print(f"\n😊 Chat Sentiment: {sentiment.get('overall')} ({sentiment.get('trend')})")
                    print(f"   Reason: {sentiment.get('reason')}")

                if insights.get('content_requests'):
                    print(f"\n🎮 Content Requests:")
                    for req in insights['content_requests']:
                        print(f"  • {req.get('request')} (mentioned {req.get('frequency')}x)")

                if insights.get('important_questions'):
                    print(f"\n❓ Unanswered Questions:")
                    for q in insights['important_questions']:
                        print(f"  • [{q.get('username')}]: {q.get('question')}")

                print("\n" + "="*60)
                print(f"✅ Insights saved to Firestore")
                print("="*60 + "\n")

            # Wait 1 minute before next analysis
            print("⏰ Waiting 1 minute for next analysis...\n")
            time.sleep(60)  # 1 minute

        except KeyboardInterrupt:
            print("\n👋 Shutting down insight generator...")
            break
        except Exception as e:
            print(f"❌ Error: {e}")
            time.sleep(60)

if __name__ == "__main__":
    generate_insights()
