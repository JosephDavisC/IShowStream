import os
from google import genai
from google.genai import types
from dotenv import load_dotenv
import json

load_dotenv('../../config/.env')

class PriorityAgent:
    def __init__(self):
        self.client = genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))
        
        self.agent_config = types.GenerateContentConfig(
            system_instruction="""You are a priority ranking agent for stream chat.
            
            Rank messages from 1-10 based on importance to the streamer:
            
            HIGH (8-10):
            - Donations/subscriptions
            - Technical issues (lag, audio, video)
            - Important questions from subscribers
            - Collaboration requests
            
            MEDIUM (4-7):
            - Regular questions
            - Game suggestions
            - Setup questions
            - Genuine viewer interaction
            
            LOW (1-3):
            - Simple reactions (LOL, LUL, POG)
            - Emotes only
            - Generic chat between viewers
            - Off-topic discussions
            
            Respond with JSON:
            {
                "priority": 1-10,
                "category": "question/reaction/technical/financial/suggestion",
                "reason": "brief explanation"
            }
            """,
            temperature=0.2,
        )
    
    def rank_message(self, username, message, is_sub=False, is_mod=False):
        """Rank message priority"""
        
        prompt = f"""Rank this message:
        Username: {username}
        Message: {message}
        Subscriber: {is_sub}
        Moderator: {is_mod}
        
        Respond with JSON only."""
        
        try:
            response = self.client.models.generate_content(
                model='gemini-2.0-flash-exp',
                contents=prompt,
                config=self.agent_config
            )
            
            result_text = response.text.strip()
            
            # Clean markdown
            if result_text.startswith('```'):
                result_text = result_text.split('```')[1]
                if result_text.startswith('json'):
                    result_text = result_text[4:]
            
            result = json.loads(result_text)
            return result
            
        except Exception as e:
            return {
                "priority": 5,
                "category": "unknown",
                "reason": f"Error: {str(e)}"
            }

# Test
if __name__ == "__main__":
    print("🎯 Testing Priority Agent\n")
    
    agent = PriorityAgent()
    
    test_cases = [
        ("User1", "What mouse do you use?", False, False),
        ("Subscriber", "Audio is cutting out!", True, False),
        ("Viewer", "LUL", False, False),
        ("DonorUser", "Donated $50! Love the content!", True, False),
        ("NewViewer", "Can you play Valorant next?", False, False),
    ]
    
    for username, message, is_sub, is_mod in test_cases:
        print(f"📝 [{username}] {message}")
        result = agent.rank_message(username, message, is_sub, is_mod)
        print(f"   Priority: {result['priority']}/10")
        print(f"   Category: {result['category']}")
        print(f"   Reason: {result['reason']}\n")