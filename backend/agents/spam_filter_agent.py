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

class SpamFilterAgent:
    def __init__(self):
        # Initialize Gemini client
        self.client = genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))
        
        # Agent configuration
        self.agent_config = types.GenerateContentConfig(
            system_instruction="""You are a spam detection agent for Twitch chat.
            
            Your job: Analyze chat messages and determine if they are spam.
            
            Spam indicators:
            - Excessive caps (>70% uppercase)
            - Repeated characters (!!!!, ????, etc.)
            - URLs or suspicious links
            - Repeated messages (copy-pasta)
            - Bot-like patterns
            - Advertising/scams
            
            Respond with JSON only:
            {
                "is_spam": true/false,
                "confidence": 0-100,
                "reason": "brief explanation"
            }
            
            Examples:
            Message: "CLICK HERE FOR FREE ROBUX!!!"
            Response: {"is_spam": true, "confidence": 95, "reason": "All caps, suspicious offer"}
            
            Message: "great stream!"
            Response: {"is_spam": false, "confidence": 90, "reason": "Normal viewer comment"}
            """,
            temperature=0.1,  # Low temperature for consistent results
        )
    
    def analyze_message(self, username, message):
        """Analyze a single message for spam"""
        
        prompt = f"""Analyze this Twitch chat message:
        Username: {username}
        Message: {message}
        
        Is this spam? Respond with JSON only."""
        
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
            
            result = json.loads(result_text)
            
            return result
            
        except Exception as e:
            print(f"Error analyzing message: {e}")
            return {
                "is_spam": False,
                "confidence": 0,
                "reason": f"Error: {str(e)}"
            }

# Test the agent
if __name__ == "__main__":
    print("🤖 Testing Spam Filter Agent\n")
    
    agent = SpamFilterAgent()
    
    # Test cases
    test_messages = [
        ("User1", "great stream!"),
        ("Spammer", "CLICK HERE FOR FREE ROBUX!!!!"),
        ("Bot123", "Follow me on instagram.com/spam"),
        ("Viewer", "LUL that was funny"),
        ("Advertiser", "🔥🔥🔥 CHECK MY CHANNEL 🔥🔥🔥"),
    ]
    
    for username, message in test_messages:
        print(f"📝 Message: [{username}] {message}")
        result = agent.analyze_message(username, message)
        print(f"🎯 Result: {result}")
        print(f"   Spam: {'✅ YES' if result['is_spam'] else '❌ NO'} (Confidence: {result['confidence']}%)")
        print(f"   Reason: {result['reason']}\n")