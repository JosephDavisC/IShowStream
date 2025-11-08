import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-container">
          <h1 className="landing-title">
            IShowStream
            <span className="landing-subtitle">AI-Powered Twitch Chat Analytics</span>
          </h1>
          <p className="landing-description">
            Real-time insights for streamers. Understand your chat, engage with your audience, 
            and grow your community with AI-powered analytics.
          </p>
          <div className="landing-cta">
            <button className="btn-primary" onClick={handleGetStarted}>
              Get Started
            </button>
            <button className="btn-secondary" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="landing-features">
        <div className="landing-container">
          <h2 className="section-title">Powerful Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>Multi-Agent AI System</h3>
              <p>
                Four specialized AI agents work together to analyze your chat in real-time:
                spam detection, priority ranking, engagement prediction, and trend analysis.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>Real-Time Chat Analysis</h3>
              <p>
                Get instant insights as messages flow in. See what matters most with 
                priority scoring and engagement predictions.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💡</div>
              <h3>Actionable Insights</h3>
              <p>
                Receive AI-generated insights highlighting unanswered questions, 
                content requests, and actionable items for your stream.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Live Dashboard</h3>
              <p>
                Monitor your chat activity, message statistics, and AI analysis 
                all in one beautiful, real-time dashboard.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Priority Messages</h3>
              <p>
                Never miss important messages. Our AI ranks messages by importance, 
                helping you focus on what matters most.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3>Trend Detection</h3>
              <p>
                Discover trending topics, memes, and patterns in your chat. 
                Stay ahead of what your community is talking about.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="landing-how-it-works">
        <div className="landing-container">
          <h2 className="section-title">How It Works</h2>
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Sign Up & Connect</h3>
              <p>Create an account and connect your Twitch channel. Simple setup in minutes.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>AI Agents Analyze</h3>
              <p>Our multi-agent system processes every message, detecting spam, ranking priority, and identifying trends.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Get Insights</h3>
              <p>Receive real-time insights, actionable items, and important questions highlighted in your dashboard.</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>Engage & Grow</h3>
              <p>Use the insights to better engage with your audience and grow your streaming community.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-cta-section">
        <div className="landing-container">
          <h2>Ready to Transform Your Stream?</h2>
          <p>Join streamers who are using AI to better understand and engage with their communities.</p>
          <button className="btn-primary btn-large" onClick={handleGetStarted}>
            Start Free Today
          </button>
        </div>
      </section>
    </div>
  );
}

export default Landing;

