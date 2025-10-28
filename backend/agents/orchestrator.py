import os
import signal
import time
from google.cloud import firestore
from google import genai
from google.genai import types
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
        self.last_trend_analysis = time.time()  # Track when we last ran trend analysis

        # Rate Limiting for AI API calls
        self.ai_calls_today = 0
        self.ai_quota_daily = int(os.getenv('AI_DAILY_QUOTA', '30'))  # Default: 30 AI calls per day
        self.fallback_mode_count = 0

        print(f"⚙️  AI Rate Limiting: {self.ai_quota_daily} AI calls per day")
        print(f"💡 Smart filtering enabled: Only high-value messages use AI")
        print()

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
        print(f"AI calls used: {self.ai_calls_today}/{self.ai_quota_daily}")
        print(f"Fallback mode: {self.fallback_mode_count} messages ({self._percent(self.fallback_mode_count, self.total_processed)}%)")
        print("=" * 70)

    def _percent(self, part, whole):
        """Calculate percentage"""
        return round((part / whole * 100) if whole > 0 else 0, 1)

    def run_trend_analysis(self):
        """
        Run TrendAgent to analyze recent messages for trending topics
        This runs periodically (every 5 minutes) to detect trends across multiple messages
        """
        try:
            print("\n" + "=" * 70)
            print("📊 Agent 4: TrendAgent - Analyzing recent messages for trends...")
            print("=" * 70)

            # Get last 50 messages from Firestore
            query = (self.db.collection('messages')
                    .order_by('timestamp', direction=firestore.Query.DESCENDING)
                    .limit(50))

            docs = query.stream()
            messages = []
            for doc in docs:
                msg = doc.to_dict()
                messages.append({
                    'username': msg.get('username', 'Unknown'),
                    'message': msg.get('message', ''),
                    'timestamp': msg.get('timestamp')
                })

            if len(messages) < 5:
                print("⚠️  Not enough messages for trend analysis (need at least 5)")
                return

            print(f"   Analyzing {len(messages)} recent messages...")

            # Log: TrendAgent started
            self.log_activity(
                activity_type="agent_start",
                agent_name="TrendAgent",
                message_data={'username': 'System', 'message': f'Analyzing {len(messages)} messages'},
                status="processing"
            )

            # Run trend analysis
            trend_result = self.trend_agent.analyze_trends(messages, time_window_minutes=5)

            # Display results
            print(f"\n   📈 Trend Analysis Results:")
            print(f"      Overall Mood: {trend_result.get('overall_mood', 'unknown')}")
            print(f"      Spam Wave Detected: {trend_result.get('spam_wave_detected', False)}")

            if trend_result.get('trending_topics'):
                print(f"\n      🔥 Trending Topics:")
                for topic in trend_result['trending_topics'][:3]:
                    print(f"         • {topic['topic']} - {topic['mentions']} mentions ({topic['trend_strength']})")

            if trend_result.get('top_words'):
                top_words = ', '.join([f"{w}({c}x)" for w, c in trend_result['top_words'][:5]])
                print(f"\n      💬 Top Words: {top_words}")

            if trend_result.get('top_emotes'):
                top_emotes = ', '.join([f"{e}({c}x)" for e, c in trend_result['top_emotes'][:5]])
                print(f"      😀 Top Emotes: {top_emotes}")

            # Save trend analysis to Firestore
            self.db.collection('trends').add({
                'timestamp': firestore.SERVER_TIMESTAMP,
                'analysis': trend_result,
                'message_count': len(messages),
                'time_window_minutes': 5
            })

            # Log: TrendAgent complete
            self.log_activity(
                activity_type="agent_complete",
                agent_name="TrendAgent",
                message_data={'username': 'System', 'message': f'Analyzed {len(messages)} messages'},
                result_data={
                    'trending_topics': trend_result.get('trending_topics', [])[:3],
                    'overall_mood': trend_result.get('overall_mood', 'unknown'),
                    'spam_wave': trend_result.get('spam_wave_detected', False)
                },
                status="complete"
            )

            print("   ✅ Trend analysis complete!")
            print("=" * 70 + "\n")

        except Exception as e:
            print(f"   ❌ TrendAgent error: {e}")
            self.log_activity(
                activity_type="agent_complete",
                agent_name="TrendAgent",
                message_data={'username': 'System', 'message': 'Trend analysis failed'},
                result_data={'error': str(e)},
                status="error"
            )

    def _should_use_ai(self, message_text, username, is_sub, is_mod):
        """
        Smart filter: Determine if message is worth an AI call

        AI is used for:
        - Moderators (always important)
        - Subscribers asking questions
        - Messages with questions (?)
        - Long messages (>50 chars)
        - First 3 messages of the session (to show variety)

        Everything else uses fallback keyword detection
        """
        # Always process mods with AI
        if is_mod:
            return True, "Moderator message"

        # Check AI quota
        if self.ai_calls_today >= self.ai_quota_daily:
            return False, f"AI quota exhausted ({self.ai_calls_today}/{self.ai_quota_daily})"

        # Allow first 3 messages to use AI (for demo purposes)
        if self.total_processed < 3:
            return True, "Initial demo messages"

        # Subscribers with questions
        if is_sub and '?' in message_text:
            return True, "Subscriber question"

        # Any question from anyone
        if '?' in message_text:
            return True, "Question detected"

        # Long messages (likely thoughtful)
        if len(message_text) > 50:
            return True, "Long message (>50 chars)"

        # Everything else: use fallback
        return False, "Low-value message (using fallback)"

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

        # Run initial trend analysis on startup
        self.run_trend_analysis()

        # Batch settings
        enable_batch = os.getenv('ENABLE_BATCH', '1') in ('1', 'true', 'TRUE')
        batch_size = int(os.getenv('BATCH_SIZE', '20'))
        min_batch = int(os.getenv('MIN_BATCH_SIZE', '10'))
        allow_per_message_fallback = os.getenv('FALLBACK_PER_MESSAGE', '0') in ('1', 'true', 'TRUE')
        api_key = os.getenv('GOOGLE_API_KEY')
        batch_client = genai.Client(api_key=api_key) if enable_batch and api_key else None
        batch_config = types.GenerateContentConfig(
            system_instruction=(
                "You are a single-call analyzer for Twitch chat messages. Given a list of"
                " messages, return JSON with one entry per message, preserving the input id."
                " For each message output: is_spam(bool), spam_type, spam_confidence(0-100),"
                " priority(1-10), category, reason, engagement_score(1-10), will_spark_conversation(bool),"
                " streamer_should_respond(bool). Respond ONLY with valid JSON array."
            ),
            temperature=0.2,
            response_mime_type="application/json",
        ) if batch_client else None

        while self.running:
            try:
                # Run TrendAgent every 5 minutes (300 seconds)
                current_time = time.time()
                if current_time - self.last_trend_analysis >= 300:  # 5 minutes
                    self.run_trend_analysis()
                    self.last_trend_analysis = current_time

                # Try batched processing first
                if enable_batch and batch_client:
                    query = (self.db.collection('messages')
                            .order_by('timestamp', direction=firestore.Query.DESCENDING)
                            .limit(batch_size))

                    docs = list(query.stream())

                    batch_items = []
                    for doc in docs:
                        if doc.id in self.processed_docs:
                            continue
                        data = doc.to_dict()
                        if 'agent_analysis' in data:
                            self.processed_docs.add(doc.id)
                            continue
                        batch_items.append({
                            'id': doc.id,
                            'username': data.get('username', 'Unknown'),
                            'message': data.get('message', ''),
                            'is_sub': data.get('is_sub', False),
                            'is_mod': data.get('is_mod', False),
                        })

                    if batch_items and len(batch_items) >= min_batch:
                        try:
                            # Build concise JSON input for the model
                            import json as _json
                            prompt = _json.dumps({'messages': batch_items}, ensure_ascii=False)
                            response = batch_client.models.generate_content(
                                model='gemini-2.5-flash',
                                contents=prompt,
                                config=batch_config,
                            )
                            results = _json.loads(response.text)

                            # Index results by id
                            id_to_result = {r.get('id'): r for r in results if isinstance(r, dict) and r.get('id')}

                            for doc in docs:
                                if doc.id not in id_to_result:
                                    continue
                                r = id_to_result[doc.id]

                                # Compose outputs similar to existing structure
                                spam_result = {
                                    'is_spam': bool(r.get('is_spam', False)),
                                    'confidence': int(r.get('spam_confidence', 0)),
                                    'reason': r.get('reason', '') or 'Batched analysis',
                                    'agent': 'SpamFilterAgent',
                                    'spam_type': r.get('spam_type', 'none'),
                                    'processed_by': 'SpamFilterAgent',
                                    'agent_version': '2.0-ADK',
                                }
                                priority_result = {
                                    'priority': max(1, min(10, int(r.get('priority', 3)))),
                                    'category': r.get('category', 'reaction'),
                                    'reason': r.get('reason', 'Batched analysis'),
                                    'agent': 'PriorityAgent',
                                    'actionable': bool(r.get('priority', 0) >= 7),
                                    'processed_by': 'PriorityAgent',
                                    'agent_version': '2.0-ADK',
                                }
                                engagement_result = {
                                    'engagement_score': max(1, min(10, int(r.get('engagement_score', 3)))),
                                    'category': r.get('category', 'reaction'),
                                    'reason': r.get('reason', 'Batched analysis'),
                                    'will_spark_conversation': bool(r.get('will_spark_conversation', False)),
                                    'streamer_should_respond': bool(r.get('streamer_should_respond', False)),
                                }

                                metadata = {
                                    'processed_by_host': os.uname().nodename if hasattr(os, 'uname') else os.getenv('HOSTNAME', 'unknown'),
                                    'processed_by_pid': os.getpid(),
                                    'processed_at': firestore.SERVER_TIMESTAMP,
                                    'orchestrator_version': '3.0-ADK',
                                    'agent_pipeline': ['BatchGemini'],
                                }

                                doc.reference.update({
                                    'agent_analysis': {
                                        'spam': spam_result,
                                        'priority': priority_result,
                                        'engagement': engagement_result,
                                        'processed_at': firestore.SERVER_TIMESTAMP,
                                        'pipeline_completed': True,
                                        'agents_executed': ['BatchGemini'],
                                    },
                                    'processing_metadata': metadata,
                                })

                                self.processed_docs.add(doc.id)
                                self.total_processed += 1

                            # Batch pacing: keep RPM under limits
                            print("⏰ Batch processed. Waiting 8s...")
                            time.sleep(8)

                            # Continue loop
                            for _ in range(3):
                                if not self.running:
                                    break
                                time.sleep(1)
                            continue

                        except Exception as _batch_err:
                            print(f"⚠️  Batch analysis failed, falling back to per-message: {_batch_err}")
                            if not allow_per_message_fallback:
                                time.sleep(5)
                                continue
                    else:
                        # Not enough new messages yet to reach the minimum batch size
                        time.sleep(2)
                        continue

                # Fallback: per-message pipeline
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

                    # ═══════════════════════════════════════════════════
                    # SMART FILTERING: Decide if message is worth AI call
                    # ═══════════════════════════════════════════════════
                    use_ai, filter_reason = self._should_use_ai(message_text, username, is_sub, is_mod)

                    if use_ai:
                        print(f"   🤖 AI Mode: {filter_reason}")
                        self.ai_calls_today += 1
                    else:
                        print(f"   ⚡ Fallback Mode: {filter_reason}")
                        self.fallback_mode_count += 1

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

                    # Pass use_ai flag to agent (agents will use fallback if use_ai=False)
                    spam_result = self.spam_agent.analyze_message(username, message_text, use_ai=use_ai)

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
                        username, message_text, is_sub, is_mod, use_ai=use_ai
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

                # Wait before next check (short delay for Firestore polling)
                time.sleep(2)

            except Exception as e:
                print(f"❌ Orchestrator Error: {e}")
                time.sleep(5)


if __name__ == "__main__":
    orchestrator = AgentOrchestrator()
    orchestrator.process_messages()
