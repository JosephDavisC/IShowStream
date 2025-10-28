import os
from google import genai
from google.genai import types
from dotenv import load_dotenv
import json

load_dotenv('../../config/.env')

class PriorityAgent:
    """
    ADK-Enhanced Priority Ranking Agent for Twitch Chat

    This agent analyzes chat messages and ranks them by importance to the streamer.
    Works in collaboration with SpamFilterAgent in a multi-agent workflow.
    """

    def __init__(self):
        # Initialize Gemini client
        self.client = genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))

        # ADK-style agent metadata
        self.agent_name = "PriorityAgent"
        self.agent_role = "message_prioritization"
        self.agent_version = "2.0-ADK"

        # Agent configuration
        self.agent_config = types.GenerateContentConfig(
            system_instruction="""You are an AI agent specialized in message prioritization for streamers.

            **Agent Identity:**
            - Name: PriorityAgent
            - Role: Message Priority Ranking & Categorization
            - Part of: StreamSense Multi-Agent System

            **Your Responsibilities:**
            1. Receive non-spam messages from SpamFilterAgent
            2. Rank messages from 1-10 based on importance to the streamer
            3. Categorize message types
            4. Provide reasoning for prioritization decisions
            5. Help streamers focus on important viewer interactions

            **Priority Levels:**

            **HIGH PRIORITY (8-10):**
            - Donations/subscriptions/bits
            - Technical issues (lag, audio problems, video quality)
            - Important questions from subscribers
            - Collaboration/business requests
            - Moderator alerts

            **MEDIUM PRIORITY (4-7):**
            - Regular questions about stream/game
            - Game suggestions
            - Setup/equipment questions
            - Genuine viewer interaction
            - Constructive feedback

            **LOW PRIORITY (1-3):**
            - Simple reactions (LOL, LUL, POG)
            - Emotes only
            - Generic chat between viewers
            - Off-topic discussions
            - Small talk

            **Output Format (JSON only):**
            {
                "priority": 1-10,
                "category": "question/reaction/technical/financial/suggestion/feedback/alert",
                "reason": "brief explanation",
                "agent": "PriorityAgent",
                "actionable": true/false
            }

            **Examples:**

            Input: "What mouse do you use?"
            Response: {
                "priority": 5,
                "category": "question",
                "reason": "Common setup question, medium engagement value",
                "agent": "PriorityAgent",
                "actionable": true
            }

            Input: "Audio is cutting out!"
            Response: {
                "priority": 9,
                "category": "technical",
                "reason": "Critical technical issue affecting stream quality",
                "agent": "PriorityAgent",
                "actionable": true
            }

            Input: "LUL"
            Response: {
                "priority": 2,
                "category": "reaction",
                "reason": "Simple emote reaction, minimal engagement value",
                "agent": "PriorityAgent",
                "actionable": false
            }

            **Agent Communication:**
            You receive messages that have already been filtered by SpamFilterAgent.
            Your priority scores help the dashboard highlight important messages.
            Be consistent and fair in your rankings.
            """,
            temperature=0.2,  # Slightly higher for nuanced prioritization
        )

    def rank_message(self, username, message, is_sub=False, is_mod=False):
        """
        ADK Agent Method: Rank message priority

        This method acts as the agent's primary tool/function in the
        multi-agent workflow. It receives filtered messages and assigns priority.

        Args:
            username (str): Username of the message sender
            message (str): The chat message content
            is_sub (bool): Whether user is a subscriber
            is_mod (bool): Whether user is a moderator

        Returns:
            dict: Priority analysis with ranking and categorization
        """

        prompt = f"""**Agent Task:** Prioritize this Twitch chat message

        **Input Data:**
        - Username: {username}
        - Message: {message}
        - Subscriber: {is_sub}
        - Moderator: {is_mod}

        **Context:**
        This message has already been verified as non-spam by SpamFilterAgent.
        Your job is to rank its importance to the streamer.

        **Required Action:**
        Analyze and rank this message. Respond with JSON only.
        Include your agent identifier in the response.
        """

        try:
            response = self.client.models.generate_content(
                model='gemini-2.0-flash-exp',
                contents=prompt,
                config=self.agent_config
            )

            result_text = response.text.strip()

            # Clean markdown code blocks
            if result_text.startswith('```'):
                result_text = result_text.split('```')[1]
                if result_text.startswith('json'):
                    result_text = result_text[4:]

            result = json.loads(result_text)

            # ADK Enhancement: Add agent metadata and boost priority for subs/mods
            result['processed_by'] = self.agent_name
            result['agent_version'] = self.agent_version

            # Priority boost for subscriber/moderator status
            if is_mod:
                result['priority'] = min(10, result['priority'] + 1)
                result['reason'] += " [Moderator +1]"
            elif is_sub:
                result['priority'] = min(10, result['priority'] + 1)
                result['reason'] += " [Subscriber +1]"

            return result

        except Exception as e:
            print(f"❌ {self.agent_name} Error: {e}")
            return {
                "priority": 5,
                "category": "unknown",
                "reason": f"Analysis error: {str(e)}",
                "agent": self.agent_name,
                "actionable": False,
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
                "message_prioritization",
                "importance_ranking",
                "category_classification",
                "actionability_detection"
            ],
            "model": "gemini-2.0-flash-exp",
            "depends_on": ["SpamFilterAgent"]
        }

# Test the agent
if __name__ == "__main__":
    print("🎯 Testing ADK-Enhanced Priority Agent\n")
    print("=" * 60)

    agent = PriorityAgent()

    # Show agent info
    info = agent.get_agent_info()
    print(f"Agent: {info['name']} v{info['version']}")
    print(f"Role: {info['role']}")
    print(f"Capabilities: {', '.join(info['capabilities'])}")
    print(f"Depends on: {', '.join(info['depends_on'])}")
    print("=" * 60)
    print()

    # Test cases
    test_cases = [
        ("User1", "What mouse do you use?", False, False),
        ("Subscriber", "Audio is cutting out!", True, False),
        ("Viewer", "LUL", False, False),
        ("DonorUser", "Donated $50! Love the content!", True, False),
        ("NewViewer", "Can you play Valorant next?", False, False),
        ("Moderator", "Stream went offline, checking now", False, True),
        ("RegularFan", "This game looks really fun, might buy it", True, False),
    ]

    for username, message, is_sub, is_mod in test_cases:
        badges = []
        if is_mod:
            badges.append("MOD")
        if is_sub:
            badges.append("SUB")
        badge_str = f" [{', '.join(badges)}]" if badges else ""

        print(f"📝 [{username}{badge_str}] {message}")
        result = agent.rank_message(username, message, is_sub, is_mod)

        # Priority visualization
        priority_bar = "█" * result['priority'] + "░" * (10 - result['priority'])
        action_emoji = "🎯" if result.get('actionable', False) else "💬"

        print(f"   {action_emoji} Priority: {result['priority']}/10 {priority_bar}")
        print(f"   Category: {result['category']}")
        print(f"   Reason: {result['reason']}")
        print(f"   Processed by: {result['processed_by']} v{result['agent_version']}")
        print()
