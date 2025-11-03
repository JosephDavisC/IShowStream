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

class EngagementAgent:
    """
    AI Agent that predicts how engaging a chat message will be.
    Analyzes message content to determine if it will spark conversation,
    drive interaction, or generate community engagement.
    """

    def __init__(self):
        """Initialize the Engagement Agent with Gemini AI"""
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment variables")

        self.client = genai.Client(api_key=api_key)
        self.agent_config = types.GenerateContentConfig(
            system_instruction="""You are an Engagement Prediction Agent for live streaming chat.

Your goal is to predict how engaging a chat message will be based on:
1. Questions that spark discussion
2. Controversial or debate-worthy topics
3. Messages that tag/mention the streamer directly
4. Calls to action ("should we...", "vote for...", "who thinks...")
5. Community-building messages ("remember when...", "we should all...")
6. High-energy or emotional content
7. Memes and viral references
8. Messages that ask for streamer's opinion/reaction

Respond ONLY with valid JSON in this exact format:
{
    "engagement_score": <1-10 integer>,
    "category": "<question|debate|callout|action|community|hype|meme|opinion>",
    "reason": "<brief explanation>",
    "will_spark_conversation": <true|false>,
    "streamer_should_respond": <true|false>
}

Scoring Guide:
- 9-10: Highly engaging, will definitely spark conversation
- 7-8: Very engaging, likely to get responses
- 5-6: Moderately engaging, might get some responses
- 3-4: Low engagement, unlikely to spark discussion
- 1-2: Minimal engagement, just noise

Be concise. No markdown formatting.""",
            temperature=0.3,
            response_mime_type="application/json"
        )

    def analyze_engagement(self, username, message_text, context=None):
        """
        Analyze a message's engagement potential

        Args:
            username: The user who sent the message
            message_text: The message content
            context: Optional context (recent messages, streamer info, etc.)

        Returns:
            dict with engagement analysis
        """
        try:
            # Build prompt with context
            prompt = f"Username: {username}\nMessage: {message_text}"

            if context:
                prompt += f"\nContext: {context}"

            # Generate engagement analysis
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=self.agent_config
            )

            # Parse JSON response
            result = json.loads(response.text)

            # Validate response structure
            required_fields = ['engagement_score', 'category', 'reason',
                             'will_spark_conversation', 'streamer_should_respond']
            if not all(field in result for field in required_fields):
                return self._fallback_analysis(message_text)

            # Ensure engagement_score is an integer between 1-10
            result['engagement_score'] = max(1, min(10, int(result['engagement_score'])))

            return result

        except json.JSONDecodeError:
            print(f"⚠️  Failed to parse JSON response, using fallback")
            return self._fallback_analysis(message_text)
        except Exception as e:
            print(f"⚠️  Error analyzing engagement: {e}")
            return self._fallback_analysis(message_text)

    def _fallback_analysis(self, message_text):
        """Fallback heuristic-based engagement analysis when AI fails"""
        message_lower = message_text.lower()
        score = 3  # Default medium-low engagement
        category = "reaction"
        will_spark = False
        should_respond = False
        reason = "Unable to analyze with AI"

        # Question indicators
        if '?' in message_text or any(word in message_lower for word in ['what', 'why', 'how', 'when', 'where', 'who']):
            score = 7
            category = "question"
            will_spark = True
            should_respond = True
            reason = "Contains a question"

        # Direct callouts (@ mentions)
        elif '@' in message_text:
            score = 8
            category = "callout"
            will_spark = True
            should_respond = True
            reason = "Mentions someone directly"

        # Call to action
        elif any(word in message_lower for word in ['should we', 'vote', 'poll', 'everyone', 'chat']):
            score = 8
            category = "action"
            will_spark = True
            reason = "Call to action for chat"

        # High energy
        elif message_text.isupper() or '!' in message_text:
            score = 5
            category = "hype"
            will_spark = False
            reason = "High energy message"

        # Very short (likely just reaction)
        elif len(message_text) < 5:
            score = 2
            category = "reaction"
            will_spark = False
            reason = "Short reaction message"

        return {
            "engagement_score": score,
            "category": category,
            "reason": reason,
            "will_spark_conversation": will_spark,
            "streamer_should_respond": should_respond
        }

# Test the agent
if __name__ == "__main__":
    print("🎯 Testing Engagement Agent...")
    print()

    agent = EngagementAgent()

    # Test messages
    test_messages = [
        ("viewer1", "What game are you playing next?"),
        ("viewer2", "LOL"),
        ("viewer3", "@streamer can you explain that strat?"),
        ("viewer4", "Should we all vote for minecraft?"),
        ("viewer5", "LETS GOOOOO!!!"),
        ("viewer6", "Remember when we beat that boss last week? That was epic"),
        ("viewer7", "Chat, who thinks he should try hardcore mode?"),
    ]

    for username, message in test_messages:
        print(f"📨 [{username}]: {message}")
        result = agent.analyze_engagement(username, message)
        print(f"   📊 Engagement Score: {result['engagement_score']}/10")
        print(f"   📁 Category: {result['category']}")
        print(f"   💬 Will Spark Conversation: {result['will_spark_conversation']}")
        print(f"   🎙️  Streamer Should Respond: {result['streamer_should_respond']}")
        print(f"   💡 {result['reason']}")
        print()
