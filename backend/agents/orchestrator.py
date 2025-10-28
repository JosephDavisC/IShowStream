import os
import signal
import time
from google.cloud import firestore
from dotenv import load_dotenv

from spam_filter_agent import SpamFilterAgent
from priority_agent import PriorityAgent
from engagement_agent import EngagementAgent
from trend_agent import TrendAgent

load_dotenv('../../config/.env')


class AgentOrchestrator:
    """
    ADK-Enhanced Multi-Agent Orchestrator for StreamSense

    This orchestrator implements Google's ADK patterns for coordinating
    multiple AI agents in a sequential workflow:

    Message Flow:
    1. Raw message from Firestore
    2. SpamFilterAgent → Detects spam
    3. If not spam → PriorityAgent → Ranks importance
    4. Results saved back to Firestore

    This is a classic multi-agent system with:
    - Agent specialization (spam detection vs prioritization)
    - Sequential processing pipeline
    - Shared state (Firestore database)
    - Agent communication (output of one feeds into next)
    """

    def __init__(self):
        print("=" * 70)
        print("🚀 StreamSense ADK Multi-Agent System")
        print("=" * 70)
        print()

        # Initialize Firestore
        project_id = os.getenv('GOOGLE_CLOUD_PROJECT')
        self.db = firestore.Client(project=project_id)
        print("✅ Connected to Firestore")

        # Initialize agents
        print("\n🤖 Initializing ADK Agent System...")
        print("-" * 70)

        self.spam_agent = SpamFilterAgent()
        spam_info = self.spam_agent.get_agent_info()
        print(f"  ✓ {spam_info['name']} v{spam_info['version']}")
        print(f"    Role: {spam_info['role']}")
        print(f"    Capabilities: {', '.join(spam_info['capabilities'])}")

        self.priority_agent = PriorityAgent()
        priority_info = self.priority_agent.get_agent_info()
        print(f"  ✓ {priority_info['name']} v{priority_info['version']}")
        print(f"    Role: {priority_info['role']}")
        print(f"    Capabilities: {', '.join(priority_info['capabilities'])}")
        print(f"    Depends on: {', '.join(priority_info['depends_on'])}")

        self.engagement_agent = EngagementAgent()
        print(f"  ✓ EngagementAgent v1.0")
        print(f"    Role: Predict message engagement potential")
        print(f"    Capabilities: conversation_prediction, streamer_response_recommendation")

        self.trend_agent = TrendAgent()
        print(f"  ✓ TrendAgent v1.0")
        print(f"    Role: Detect trending topics and patterns")
        print(f"    Capabilities: trend_detection, meme_tracking, spam_wave_detection")

        print("-" * 70)
        print("✅ All 4 agents initialized!")
        print()

        # ADK State Management
        self.processed_docs = set()  # Track processed message IDs
        self.running = True
        self.total_processed = 0
        self.spam_detected = 0
        self.high_priority_count = 0

        # Agent Activity Logging
        self.activity_collection = self.db.collection('agent_activity')

        # Graceful shutdown
        signal.signal(signal.SIGINT, self._shutdown)
        signal.signal(signal.SIGTERM, self._shutdown)

    def _shutdown(self, signum, frame):
        """Handle graceful shutdown"""
        print(f"\n🛑 Received signal {signum}, shutting down orchestrator...")
        self.running = False
        self._print_stats()

    def _print_stats(self):
        """Print agent system statistics"""
        print("\n" + "=" * 70)
        print("📊 ADK Multi-Agent System Statistics")
        print("=" * 70)
        print(f"Total messages processed: {self.total_processed}")
        print(f"Spam detected: {self.spam_detected} ({self._percent(self.spam_detected, self.total_processed)}%)")
        print(f"High priority messages: {self.high_priority_count} ({self._percent(self.high_priority_count, self.total_processed)}%)")
        print("=" * 70)

    def _percent(self, part, whole):
        """Calculate percentage"""
        return round((part / whole * 100) if whole > 0 else 0, 1)

    def log_activity(self, activity_type, agent_name, message_data, result_data=None, status="processing"):
        """
        Log agent activity to Firestore for real-time dashboard display

        Args:
            activity_type: "message_received", "agent_start", "agent_complete", "pipeline_complete", "spam_detected"
            agent_name: Name of the agent (SpamFilterAgent, PriorityAgent, etc.)
            message_data: Dict with username, message text
            result_data: Agent's analysis result
            status: "processing", "complete", "blocked"
        """
        try:
            activity_log = {
                'timestamp': firestore.SERVER_TIMESTAMP,
                'activity_type': activity_type,
                'agent': agent_name,
                'status': status,
                'message': {
                    'username': message_data.get('username', 'Unknown'),
                    'text': message_data.get('message', '')[:100]  # Limit message length
                }
            }

            if result_data:
                activity_log['result'] = result_data

            # Save to Firestore
            self.activity_collection.add(activity_log)

        except Exception as e:
            # Don't let logging errors break the main flow
            print(f"⚠️  Activity logging error: {e}")

    def process_messages(self):
        """
        ADK Multi-Agent Processing Pipeline

        This implements a sequential agent workflow:
        1. Message retrieval from Firestore
        2. Agent 1 (SpamFilterAgent) processes message
        3. If not spam → Agent 2 (PriorityAgent) processes message
        4. Results aggregated and saved to Firestore

        This pattern demonstrates:
        - Multi-agent collaboration
        - Sequential processing
        - Conditional agent invocation
        - State management across agents
        """
        print("🚀 ADK Multi-Agent Orchestrator Started!")
        print("👀 Monitoring Firestore for new messages...")
        print("📋 Agent Pipeline: Message → SpamFilter → Priority → Engagement → Trend → Dashboard")
        print()

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

                    # Log: Message received
                    self.log_activity(
                        activity_type="message_received",
                        agent_name="System",
                        message_data={'username': username, 'message': message_text},
                        status="processing"
                    )

                    # ═══════════════════════════════════════════════════
                    # AGENT 1: SpamFilterAgent
                    # ═══════════════════════════════════════════════════
                    print("   🔍 Agent 1: SpamFilterAgent analyzing...")

                    # Log: SpamFilter started
                    self.log_activity(
                        activity_type="agent_start",
                        agent_name="SpamFilterAgent",
                        message_data={'username': username, 'message': message_text},
                        status="processing"
                    )

                    spam_result = self.spam_agent.analyze_message(username, message_text)

                    # ADK Metadata: Track which process/host ran this
                    metadata = {
                        'processed_by_host': os.uname().nodename if hasattr(os, 'uname') else os.getenv('HOSTNAME', 'unknown'),
                        'processed_by_pid': os.getpid(),
                        'processed_at': firestore.SERVER_TIMESTAMP,
                        'orchestrator_version': '3.0-ADK',
                        'agent_pipeline': ['SpamFilterAgent', 'PriorityAgent', 'EngagementAgent', 'TrendAgent']
                    }

                    if spam_result['is_spam']:
                        print(f"   🚫 SPAM DETECTED by {spam_result['processed_by']}")
                        print(f"      Confidence: {spam_result['confidence']}%")
                        print(f"      Type: {spam_result.get('spam_type', 'unknown')}")
                        print(f"      Reason: {spam_result['reason']}")

                        # Log: Spam detected
                        self.log_activity(
                            activity_type="spam_detected",
                            agent_name="SpamFilterAgent",
                            message_data={'username': username, 'message': message_text},
                            result_data={
                                'confidence': spam_result['confidence'],
                                'spam_type': spam_result.get('spam_type', 'unknown'),
                                'reason': spam_result['reason']
                            },
                            status="blocked"
                        )

                        self.spam_detected += 1

                        # Update Firestore with spam result (skip PriorityAgent)
                        if os.getenv('DISABLE_FIRESTORE_WRITES', '0') in ('0', 'false', 'False', ''):
                            doc.reference.update({
                                'agent_analysis': {
                                    'spam': spam_result,
                                    'priority': {
                                        'priority': 0,
                                        'category': 'spam',
                                        'reason': 'Filtered as spam by SpamFilterAgent',
                                        'agent': 'PriorityAgent',
                                        'actionable': False
                                    },
                                    'processed_at': firestore.SERVER_TIMESTAMP,
                                    'pipeline_stopped_at': 'SpamFilterAgent'
                                },
                                'processing_metadata': metadata,
                            })
                        else:
                            print('⚠️  Firestore writes disabled; skipping agent update')

                        self.processed_docs.add(doc.id)
                        self.total_processed += 1
                        print()
                        continue

                    print(f"   ✅ CLEAN message (Confidence: {spam_result['confidence']}%)")

                    # Log: SpamFilter complete (clean)
                    self.log_activity(
                        activity_type="agent_complete",
                        agent_name="SpamFilterAgent",
                        message_data={'username': username, 'message': message_text},
                        result_data={
                            'is_spam': False,
                            'confidence': spam_result['confidence']
                        },
                        status="complete"
                    )

                    # ═══════════════════════════════════════════════════
                    # AGENT 2: PriorityAgent
                    # ═══════════════════════════════════════════════════
                    print("   🎯 Agent 2: PriorityAgent analyzing...")

                    # Log: PriorityAgent started
                    self.log_activity(
                        activity_type="agent_start",
                        agent_name="PriorityAgent",
                        message_data={'username': username, 'message': message_text},
                        status="processing"
                    )

                    priority_result = self.priority_agent.rank_message(
                        username, message_text, is_sub, is_mod
                    )

                    priority_bar = "█" * priority_result['priority'] + "░" * (10 - priority_result['priority'])
                    print(f"   ✅ Priority: {priority_result['priority']}/10 {priority_bar}")
                    print(f"      Category: {priority_result['category']}")
                    print(f"      {priority_result['reason']}")
                    print(f"      Processed by: {priority_result['processed_by']}")

                    # Log: PriorityAgent complete
                    self.log_activity(
                        activity_type="agent_complete",
                        agent_name="PriorityAgent",
                        message_data={'username': username, 'message': message_text},
                        result_data={
                            'priority': priority_result['priority'],
                            'category': priority_result['category'],
                            'reason': priority_result['reason']
                        },
                        status="complete"
                    )

                    # Track high priority messages
                    if priority_result['priority'] >= 7:
                        self.high_priority_count += 1

                    # ═══════════════════════════════════════════════════
                    # AGENT 3: EngagementAgent
                    # ═══════════════════════════════════════════════════
                    print("   🎯 Agent 3: EngagementAgent analyzing...")

                    # Log: EngagementAgent started
                    self.log_activity(
                        activity_type="agent_start",
                        agent_name="EngagementAgent",
                        message_data={'username': username, 'message': message_text},
                        status="processing"
                    )

                    engagement_result = self.engagement_agent.analyze_engagement(
                        username, message_text
                    )

                    print(f"   ✅ Engagement Score: {engagement_result['engagement_score']}/10")
                    print(f"      Category: {engagement_result['category']}")
                    print(f"      Will Spark Conversation: {engagement_result['will_spark_conversation']}")
                    print(f"      Streamer Should Respond: {engagement_result['streamer_should_respond']}")
                    print(f"      {engagement_result['reason']}")

                    # Log: EngagementAgent complete
                    self.log_activity(
                        activity_type="agent_complete",
                        agent_name="EngagementAgent",
                        message_data={'username': username, 'message': message_text},
                        result_data=engagement_result,
                        status="complete"
                    )

                    # Update Firestore with complete multi-agent analysis
                    if os.getenv('DISABLE_FIRESTORE_WRITES', '0') in ('0', 'false', 'False', ''):
                        doc.reference.update({
                            'agent_analysis': {
                                'spam': spam_result,
                                'priority': priority_result,
                                'engagement': engagement_result,
                                'processed_at': firestore.SERVER_TIMESTAMP,
                                'pipeline_completed': True,
                                'agents_executed': [spam_result['processed_by'], priority_result['processed_by'], 'EngagementAgent']
                            },
                            'processing_metadata': metadata,
                        })
                    else:
                        print('⚠️  Firestore writes disabled; skipping agent update')

                    # Log: Pipeline complete
                    self.log_activity(
                        activity_type="pipeline_complete",
                        agent_name="System",
                        message_data={'username': username, 'message': message_text},
                        result_data={
                            'agents_executed': ['SpamFilterAgent', 'PriorityAgent', 'EngagementAgent'],
                            'final_priority': priority_result['priority'],
                            'engagement_score': engagement_result['engagement_score'],
                            'spam_filtered': False
                        },
                        status="complete"
                    )

                    self.processed_docs.add(doc.id)
                    self.total_processed += 1
                    print()

                    # Rate limiting: wait 18 seconds between messages
                    # (3 AI agents * 6 seconds = 18 seconds to stay under 10 req/min)
                    print("⏰ Rate limit: Waiting 18s...")
                    for _ in range(18):
                        if not self.running:
                            break
                        time.sleep(1)
                    print()

                # Wait before next check
                for _ in range(3):
                    if not self.running:
                        break
                    time.sleep(1)

            except Exception as e:
                print(f"❌ Orchestrator Error: {e}")
                time.sleep(5)


if __name__ == "__main__":
    orchestrator = AgentOrchestrator()
    orchestrator.process_messages()
