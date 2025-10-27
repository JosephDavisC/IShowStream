import os
from google.cloud import firestore
from dotenv import load_dotenv
import time
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
    
    def process_messages(self):
        """Main processing loop"""
        print("🚀 Agent Orchestrator Started!")
        print("👀 Monitoring Firestore for new messages...\n")
        
        while True:
            try:
                # Get recent unprocessed messages
                query = (self.db.collection('messages')
                        .order_by('timestamp', direction=firestore.Query.DESCENDING)
                        .limit(5))
                
                docs = query.stream()
                
                for doc in docs:
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
                    
                    if spam_result['is_spam']:
                        print(f"   🚫 SPAM DETECTED (Confidence: {spam_result['confidence']}%)")
                        
                        # Update Firestore
                        doc.reference.update({
                            'agent_analysis': {
                                'spam': spam_result,
                                'priority': {'priority': 0, 'category': 'spam', 'reason': 'Filtered as spam'},
                                'processed_at': firestore.SERVER_TIMESTAMP
                            }
                        })
                        
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
                    
                    # Update Firestore with complete analysis
                    doc.reference.update({
                        'agent_analysis': {
                            'spam': spam_result,
                            'priority': priority_result,
                            'processed_at': firestore.SERVER_TIMESTAMP
                        }
                    })
                    
                    self.processed_docs.add(doc.id)
                    print()

                    # Rate limiting: wait 12 seconds between messages
                    # (2 API calls per message * 6 seconds = 12 seconds total)
                    print("⏰ Waiting 12s to respect API rate limits...\n")
                    time.sleep(12)

                # Wait before next check
                time.sleep(3)
                
            except KeyboardInterrupt:
                print("\n👋 Shutting down orchestrator...")
                break
            except Exception as e:
                print(f"❌ Error: {e}")
                time.sleep(5)

if __name__ == "__main__":
    orchestrator = AgentOrchestrator()
    orchestrator.process_messages()