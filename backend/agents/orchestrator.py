import os
import signal
import time
from google.cloud import firestore
from dotenv import load_dotenv

from spam_filter_agent import SpamFilterAgent
from priority_agent import PriorityAgent

load_dotenv('../../config/.env')


class AgentOrchestrator:
    def __init__(self):
        # Initialize Firestore
        project_id = os.getenv('GOOGLE_CLOUD_PROJECT')
        self.db = firestore.Client(project=project_id)

        # Initialize agents
        print("🤖 Initializing agents...")
        self.spam_agent = SpamFilterAgent()
        self.priority_agent = PriorityAgent()
        print("✅ Agents ready!\n")

        self.processed_docs = set()
        self.running = True

        # graceful shutdown
        signal.signal(signal.SIGINT, self._shutdown)
        signal.signal(signal.SIGTERM, self._shutdown)

    def _shutdown(self, signum, frame):
        print(f"\n🛑 Received signal {signum}, shutting down orchestrator...")
        self.running = False

    def process_messages(self):
        """Main processing loop"""
        print("🚀 Agent Orchestrator Started!")
        print("👀 Monitoring Firestore for new messages...\n")

        while self.running:
            try:
                # Get recent unprocessed messages
                query = (self.db.collection('messages')
                        .order_by('timestamp', direction=firestore.Query.DESCENDING)
                        .limit(5))

                docs = query.stream()

                for doc in docs:
                    if not self.running:
                        break
                    if doc.id in self.processed_docs:
                        continue

                    msg = doc.to_dict()

                    # Skip if already analyzed
                    if 'agent_analysis' in msg:
                        self.processed_docs.add(doc.id)
                        continue

                    # Extract message data
                    username = msg.get('username', 'Unknown')
                    message_text = msg.get('message', '')
                    is_sub = msg.get('is_sub', False)
                    is_mod = msg.get('is_mod', False)

                    print(f"📨 New message: [{username}] {message_text[:50]}...")

                    # Agent 1: Check for spam
                    print("   🔍 Spam Agent analyzing...")
                    spam_result = self.spam_agent.analyze_message(username, message_text)

                    metadata = {
                        'processed_by_host': os.uname().nodename if hasattr(os, 'uname') else os.getenv('HOSTNAME', 'unknown'),
                        'processed_by_pid': os.getpid(),
                        'processed_at': firestore.SERVER_TIMESTAMP,
                    }

                    if spam_result['is_spam']:
                        print(f"   🚫 SPAM DETECTED (Confidence: {spam_result['confidence']}%)")

                        # Update Firestore with metadata (unless disabled)
                        if os.getenv('DISABLE_FIRESTORE_WRITES', '0') in ('0', 'false', 'False', ''):
                            doc.reference.update({
                                'agent_analysis': {
                                    'spam': spam_result,
                                    'priority': {'priority': 0, 'category': 'spam', 'reason': 'Filtered as spam'},
                                    'processed_at': firestore.SERVER_TIMESTAMP
                                },
                                'processing_metadata': metadata,
                            })
                        else:
                            print('⚠️  Firestore writes disabled; skipping agent update')

                        self.processed_docs.add(doc.id)
                        print()
                        continue

                    # Agent 2: Rank priority
                    print("   🎯 Priority Agent analyzing...")
                    priority_result = self.priority_agent.rank_message(
                        username, message_text, is_sub, is_mod
                    )

                    print(f"   ✅ Priority: {priority_result['priority']}/10 ({priority_result['category']})")
                    print(f"   💡 {priority_result['reason']}")

                    # Update Firestore with complete analysis and metadata
                    if os.getenv('DISABLE_FIRESTORE_WRITES', '0') in ('0', 'false', 'False', ''):
                        doc.reference.update({
                            'agent_analysis': {
                                'spam': spam_result,
                                'priority': priority_result,
                                'processed_at': firestore.SERVER_TIMESTAMP
                            },
                            'processing_metadata': metadata,
                        })
                    else:
                        print('⚠️  Firestore writes disabled; skipping agent update')

                    self.processed_docs.add(doc.id)
                    print()

                    # Rate limiting: wait 12 seconds between messages
                    print("⏰ Waiting 12s to respect API rate limits...\n")
                    for _ in range(12):
                        if not self.running:
                            break
                        time.sleep(1)

                # Wait before next check
                for _ in range(3):
                    if not self.running:
                        break
                    time.sleep(1)

            except Exception as e:
                print(f"❌ Error: {e}")
                time.sleep(5)


if __name__ == "__main__":
    orchestrator = AgentOrchestrator()
    orchestrator.process_messages()