import os
import sys
import json
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv('../../config/.env')

class TrendAgent:
    """
    AI Agent that detects trending topics, phrases, and memes in real-time chat.
    Tracks patterns across messages to identify what's going viral.
    """

    def __init__(self):
        """Initialize the Trend Agent with Gemini AI"""
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment variables")

        self.client = genai.Client(api_key=api_key)
        self.agent_config = types.GenerateContentConfig(
            system_instruction="""You are a Trend Detection Agent for live streaming chat.

Your goal is to identify trending topics, memes, and patterns from a batch of recent messages.

Analyze the messages to detect:
1. Repeated words/phrases (mentioned 3+ times)
2. Viral memes or emotes
3. Common topics of discussion
4. Coordinated spam patterns
5. Emerging jokes or inside references

Respond ONLY with valid JSON in this exact format:
{
    "trending_topics": [
        {
            "topic": "<topic name>",
            "mentions": <count>,
            "trend_strength": "<viral|strong|moderate|weak>",
            "category": "<meme|question|topic|emote|reaction>"
        }
    ],
    "emerging_trends": ["<trend1>", "<trend2>"],
    "is_spam_wave": <true|false>,
    "overall_mood": "<hype|chill|confused|toxic|excited>"
}

Only include topics mentioned 3+ times. Be concise. No markdown.""",
            temperature=0.2,
            response_mime_type="application/json"
        )

        # In-memory trend tracking
        self.word_frequency = defaultdict(int)
        self.phrase_frequency = defaultdict(int)
        self.emote_frequency = defaultdict(int)
        self.last_reset = datetime.now()

    def analyze_trends(self, messages, time_window_minutes=5):
        """
        Analyze trends from a batch of recent messages

        Args:
            messages: List of message dicts with 'username', 'message', 'timestamp'
            time_window_minutes: How far back to analyze

        Returns:
            dict with trend analysis
        """
        try:
            if not messages or len(messages) < 5:
                return {
                    "trending_topics": [],
                    "emerging_trends": [],
                    "is_spam_wave": False,
                    "overall_mood": "chill"
                }

            # Update frequency tracking
            self._update_frequencies(messages)

            # Build context for AI
            chat_summary = self._build_chat_summary(messages)

            # Use AI to detect trends
            prompt = f"""Analyze these recent chat messages for trends:

{chat_summary}

Detect:
- What topics are being discussed repeatedly?
- Any memes or emotes trending?
- Is there coordinated spam?
- What's the overall chat mood?"""

            response = self.client.models.generate_content(
                model='gemini-2.0-flash-exp',
                contents=prompt,
                config=self.agent_config
            )

            # Parse JSON response
            result = json.loads(response.text)

            # Enhance with local frequency data
            result['top_words'] = self._get_top_words(5)
            result['top_emotes'] = self._get_top_emotes(5)

            return result

        except json.JSONDecodeError:
            print(f"⚠️  Failed to parse JSON response, using fallback")
            return self._fallback_trend_analysis(messages)
        except Exception as e:
            print(f"⚠️  Error analyzing trends: {e}")
            return self._fallback_trend_analysis(messages)

    def _update_frequencies(self, messages):
        """Update word and emote frequency tracking"""
        # Reset if it's been too long (rolling window)
        if datetime.now() - self.last_reset > timedelta(minutes=5):
            self.word_frequency.clear()
            self.phrase_frequency.clear()
            self.emote_frequency.clear()
            self.last_reset = datetime.now()

        for msg in messages:
            text = msg.get('message', '')
            words = text.lower().split()

            # Track individual words
            for word in words:
                if len(word) > 3:  # Skip very short words
                    self.word_frequency[word] += 1

            # Track emotes (words with capitals or special chars)
            emotes = [w for w in text.split() if w.isupper() or not w.isalnum()]
            for emote in emotes:
                self.emote_frequency[emote] += 1

            # Track 2-word phrases
            for i in range(len(words) - 1):
                phrase = f"{words[i]} {words[i+1]}"
                if len(phrase) > 6:
                    self.phrase_frequency[phrase] += 1

    def _build_chat_summary(self, messages):
        """Build a summary of messages for AI analysis"""
        # Take last 30 messages to avoid token limits
        recent = messages[-30:] if len(messages) > 30 else messages

        summary_lines = []
        for msg in recent:
            username = msg.get('username', 'unknown')
            text = msg.get('message', '')
            summary_lines.append(f"[{username}]: {text}")

        return "\n".join(summary_lines)

    def _get_top_words(self, limit=5):
        """Get most frequent words"""
        if not self.word_frequency:
            return []

        top = Counter(self.word_frequency).most_common(limit)
        return [{"word": word, "count": count} for word, count in top]

    def _get_top_emotes(self, limit=5):
        """Get most frequent emotes"""
        if not self.emote_frequency:
            return []

        top = Counter(self.emote_frequency).most_common(limit)
        return [{"emote": emote, "count": count} for emote, count in top]

    def _fallback_trend_analysis(self, messages):
        """Fallback heuristic-based trend analysis when AI fails"""
        if not messages or len(messages) < 5:
            return {
                "trending_topics": [],
                "emerging_trends": [],
                "is_spam_wave": False,
                "overall_mood": "chill",
                "top_words": [],
                "top_emotes": []
            }

        # Simple frequency analysis
        all_text = " ".join([msg.get('message', '') for msg in messages])
        words = all_text.lower().split()
        word_counts = Counter(words)

        # Detect trends (mentioned 3+ times)
        trending = []
        for word, count in word_counts.most_common(10):
            if count >= 3 and len(word) > 2:
                strength = "viral" if count >= 10 else "strong" if count >= 5 else "moderate"
                trending.append({
                    "topic": word,
                    "mentions": count,
                    "trend_strength": strength,
                    "category": "topic"
                })

        # Detect spam (same message repeated)
        message_texts = [msg.get('message', '') for msg in messages]
        message_counts = Counter(message_texts)
        is_spam = any(count >= 5 for count in message_counts.values())

        # Detect mood (based on punctuation and caps)
        caps_count = sum(1 for msg in messages if msg.get('message', '').isupper())
        exclaim_count = sum(msg.get('message', '').count('!') for msg in messages)
        question_count = sum(msg.get('message', '').count('?') for msg in messages)

        if caps_count > len(messages) * 0.3 or exclaim_count > len(messages):
            mood = "hype"
        elif question_count > len(messages) * 0.3:
            mood = "confused"
        else:
            mood = "chill"

        return {
            "trending_topics": trending[:5],
            "emerging_trends": [t["topic"] for t in trending[:3]],
            "is_spam_wave": is_spam,
            "overall_mood": mood,
            "top_words": self._get_top_words(5),
            "top_emotes": self._get_top_emotes(5)
        }

    def get_trend_summary(self):
        """Get a summary of current trends"""
        return {
            "top_words": self._get_top_words(10),
            "top_emotes": self._get_top_emotes(10),
            "tracking_since": self.last_reset.isoformat()
        }

# Test the agent
if __name__ == "__main__":
    print("📈 Testing Trend Agent...")
    print()

    agent = TrendAgent()

    # Simulate messages with a trend
    test_messages = [
        {"username": "user1", "message": "WW 10", "timestamp": datetime.now()},
        {"username": "user2", "message": "WW 10", "timestamp": datetime.now()},
        {"username": "user3", "message": "WW 10", "timestamp": datetime.now()},
        {"username": "user4", "message": "WW 10", "timestamp": datetime.now()},
        {"username": "user5", "message": "what is WW?", "timestamp": datetime.now()},
        {"username": "user6", "message": "WW 10 LUL", "timestamp": datetime.now()},
        {"username": "user7", "message": "Pog moment", "timestamp": datetime.now()},
        {"username": "user8", "message": "WW 10!!!", "timestamp": datetime.now()},
        {"username": "user9", "message": "Pog", "timestamp": datetime.now()},
        {"username": "user10", "message": "WW 10 spam", "timestamp": datetime.now()},
    ]

    print("📨 Analyzing messages for trends...")
    result = agent.analyze_trends(test_messages)

    print(f"\n🔥 Trending Topics:")
    for topic in result.get('trending_topics', []):
        print(f"   • {topic['topic']} - {topic['mentions']} mentions ({topic['trend_strength']})")

    print(f"\n🌊 Emerging Trends:")
    for trend in result.get('emerging_trends', []):
        print(f"   • {trend}")

    print(f"\n📊 Top Words:")
    for item in result.get('top_words', []):
        print(f"   • {item['word']}: {item['count']}x")

    print(f"\n😀 Top Emotes:")
    for item in result.get('top_emotes', []):
        print(f"   • {item['emote']}: {item['count']}x")

    print(f"\n🎭 Overall Mood: {result.get('overall_mood', 'unknown')}")
    print(f"⚠️  Spam Wave: {result.get('is_spam_wave', False)}")
    print()
