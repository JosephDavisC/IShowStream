import os
import sys
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv('../../config/.env')

class InsightAgent:
    """
    Advanced AI agent that analyzes chat patterns and provides actionable insights
    for streamers, such as:
    - What viewers want (game requests, content suggestions)
    - Important questions that were missed
    - Sentiment trends (viewers getting bored, excited, etc.)
    - Key moments to react to
    """

    def __init__(self):
        # Initialize Gemini client
        self.client = genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))

        # Agent configuration
        self.agent_config = types.GenerateContentConfig(
            system_instruction="""You are a streaming insights AI agent.

Your job: Analyze batches of Twitch chat messages and extract actionable insights for the streamer.

Focus on detecting:
1. **Content Requests**: What games/content viewers want ("play X", "do Y challenge")
2. **Important Questions**: Questions directed at streamer that need answers
3. **Sentiment Shifts**: When chat mood changes (excitement, boredom, confusion)
4. **Key Topics**: What viewers are discussing most
5. **Missed Opportunities**: Important chat moments the streamer might have missed

Respond with JSON only in this format:
{
    "content_requests": [
        {"type": "game", "request": "play Minecraft", "frequency": 3, "urgency": "high"}
    ],
    "important_questions": [
        {"username": "User123", "question": "What's your setup?", "timestamp": "recent"}
    ],
    "sentiment": {
        "overall": "excited|neutral|bored|confused",
        "trend": "improving|declining|stable",
        "reason": "brief explanation"
    },
    "top_topics": [
        {"topic": "game mechanics", "mentions": 5}
    ],
    "actionable_insights": [
        "5+ viewers requesting Minecraft gameplay",
        "Chat asking about your setup - consider showing it"
    ]
}

Be concise. Only include significant insights, not every little thing.
""",
            temperature=0.3,  # Lower temperature for consistent analysis
        )

    def analyze_batch(self, messages):
        """
        Analyze a batch of messages (5-10 minutes worth) for insights

        Args:
            messages: List of dicts with {username, message, timestamp}

        Returns:
            Dict with insights
        """

        if not messages or len(messages) < 10:
            return {
                "error": "Not enough messages to analyze (need at least 10)",
                "actionable_insights": []
            }

        # Format messages for analysis
        chat_log = "\n".join([
            f"[{msg.get('username')}]: {msg.get('message')}"
            for msg in messages[-50:]  # Last 50 messages
        ])

        prompt = f"""Analyze this recent Twitch chat (last 5 minutes):

{chat_log}

Provide insights in JSON format."""

        try:
            response = self.client.models.generate_content(
                model='gemini-2.0-flash-exp',
                contents=prompt,
                config=self.agent_config
            )

            # Extract JSON from response
            import json
            result_text = response.text.strip()

            # Remove markdown code blocks if present
            if result_text.startswith('```'):
                result_text = result_text.split('```')[1]
                if result_text.startswith('json'):
                    result_text = result_text[4:]

            result = json.loads(result_text.strip())

            return result

        except Exception as e:
            print(f"Error analyzing messages: {e}")
            return {
                "error": str(e),
                "actionable_insights": []
            }

# Test the agent
if __name__ == "__main__":
    print("🧠 Testing Insight Agent\n")

    agent = InsightAgent()

    # Test with sample messages
    test_messages = [
        {"username": "User1", "message": "play Minecraft plssss"},
        {"username": "User2", "message": "yeah Minecraft would be cool"},
        {"username": "User3", "message": "what's your mouse?"},
        {"username": "User4", "message": "Minecraft +1"},
        {"username": "User5", "message": "this game is boring ngl"},
        {"username": "User6", "message": "can you show your setup?"},
        {"username": "User7", "message": "MINECRAFT MINECRAFT"},
        {"username": "User8", "message": "what monitor do you use?"},
        {"username": "User9", "message": "not feeling this game"},
        {"username": "User10", "message": "switch to Minecraft?"},
        {"username": "User11", "message": "your gear is sick"},
        {"username": "User12", "message": "setup tour please!"},
    ]

    print("📊 Analyzing sample chat...\n")
    insights = agent.analyze_batch(test_messages)

    print("🎯 Insights:")
    import json
    print(json.dumps(insights, indent=2))

    if "actionable_insights" in insights:
        print("\n💡 Actionable Insights:")
        for insight in insights["actionable_insights"]:
            print(f"  • {insight}")
