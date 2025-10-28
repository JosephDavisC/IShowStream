import os
import sys
import json
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv('../../config/.env')

class SpamFilterAgent:
    """
    ADK-Enhanced Spam Detection Agent for Twitch Chat

    This agent uses Google's Gemini model to detect spam in chat messages.
    Enhanced with ADK patterns for better agent orchestration.
    """

    def __init__(self):
        # Initialize Gemini client
        self.client = genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))

        # ADK-style agent metadata
        self.agent_name = "SpamFilterAgent"
        self.agent_role = "spam_detection"
        self.agent_version = "2.0-ADK"

        # Agent configuration with system instruction
        self.agent_config = types.GenerateContentConfig(
            system_instruction="""You are an AI agent specialized in spam detection for Twitch chat.

            **Agent Identity:**
            - Name: SpamFilterAgent
            - Role: Spam Detection & Content Filtering
            - Part of: StreamSense Multi-Agent System

            **Your Responsibilities:**
            1. Analyze incoming Twitch chat messages
            2. Detect spam, scams, and malicious content
            3. Provide confidence scores for detections
            4. Communicate results to other agents in the system

            **Spam Indicators:**
            - Excessive caps (>70% uppercase)
            - Repeated characters (!!!!, ????, etc.)
            - URLs or suspicious links
            - Repeated messages (copy-pasta)
            - Bot-like patterns
            - Advertising/scams
            - Phishing attempts

            **Output Format (JSON only):**
            {
                "is_spam": true/false,
                "confidence": 0-100,
                "reason": "brief explanation",
                "agent": "SpamFilterAgent",
                "spam_type": "caps/links/repetition/advertising/bot/phishing/none"
            }

            **Examples:**

            Message: "CLICK HERE FOR FREE ROBUX!!!"
            Response: {
                "is_spam": true,
                "confidence": 95,
                "reason": "All caps, suspicious offer, excessive punctuation",
                "agent": "SpamFilterAgent",
                "spam_type": "advertising"
            }

            Message: "great stream!"
            Response: {
                "is_spam": false,
                "confidence": 90,
                "reason": "Normal viewer comment",
                "agent": "SpamFilterAgent",
                "spam_type": "none"
            }

            **Agent Communication:**
            Your analysis will be passed to the PriorityAgent for further processing.
            Be accurate and consistent in your classifications.
            """,
            temperature=0.1,  # Low temperature for consistent, reliable results
        )

    def analyze_message(self, username, message):
        """
        ADK Agent Method: Analyze a single message for spam

        This method acts as the agent's primary tool/function that can be
        called by the orchestrator or other agents in the multi-agent system.

        Args:
            username (str): Username of the message sender
            message (str): The chat message content

        Returns:
            dict: Analysis result with spam detection info
        """

        prompt = f"""**Agent Task:** Analyze this Twitch chat message

        **Input Data:**
        - Username: {username}
        - Message: {message}

        **Required Action:**
        Determine if this is spam and respond with JSON only.
        Include your agent identifier in the response.
        """

        try:
            response = self.client.models.generate_content(
                model='gemini-2.0-flash-exp',
                contents=prompt,
                config=self.agent_config
            )

            # Extract JSON from response
            result_text = response.text.strip()

            # Remove markdown code blocks if present
            if result_text.startswith('```'):
                result_text = result_text.split('```')[1]
                if result_text.startswith('json'):
                    result_text = result_text[4:]

            result = json.loads(result_text)

            # ADK Enhancement: Add agent metadata for multi-agent tracking
            result['processed_by'] = self.agent_name
            result['agent_version'] = self.agent_version

            return result

        except Exception as e:
            print(f"❌ {self.agent_name} Error: {e}")
            return {
                "is_spam": False,
                "confidence": 0,
                "reason": f"Analysis error: {str(e)}",
                "agent": self.agent_name,
                "spam_type": "error",
                "processed_by": self.agent_name,
                "agent_version": self.agent_version
            }

    def get_agent_info(self):
        """ADK Method: Return agent metadata for orchestration"""
        return {
            "name": self.agent_name,
            "role": self.agent_role,
            "version": self.agent_version,
            "capabilities": [
                "spam_detection",
                "content_filtering",
                "link_scanning",
                "bot_detection"
            ],
            "model": "gemini-2.0-flash-exp"
        }

# Test the agent
if __name__ == "__main__":
    print("🤖 Testing ADK-Enhanced Spam Filter Agent\n")
    print("=" * 60)

    agent = SpamFilterAgent()

    # Show agent info
    info = agent.get_agent_info()
    print(f"Agent: {info['name']} v{info['version']}")
    print(f"Role: {info['role']}")
    print(f"Capabilities: {', '.join(info['capabilities'])}")
    print("=" * 60)
    print()

    # Test cases
    test_messages = [
        ("User1", "great stream!"),
        ("Spammer", "CLICK HERE FOR FREE ROBUX!!!!"),
        ("Bot123", "Follow me on instagram.com/spam"),
        ("Viewer", "LUL that was funny"),
        ("Advertiser", "🔥🔥🔥 CHECK MY CHANNEL 🔥🔥🔥"),
        ("ScamBot", "bit.ly/free-subs HURRY LIMITED TIME"),
    ]

    for username, message in test_messages:
        print(f"📝 Message: [{username}] {message}")
        result = agent.analyze_message(username, message)

        spam_emoji = '🚫' if result['is_spam'] else '✅'
        print(f"{spam_emoji} Spam: {'YES' if result['is_spam'] else 'NO'} (Confidence: {result['confidence']}%)")
        print(f"   Type: {result.get('spam_type', 'unknown')}")
        print(f"   Reason: {result['reason']}")
        print(f"   Processed by: {result['processed_by']} v{result['agent_version']}")
        print()
