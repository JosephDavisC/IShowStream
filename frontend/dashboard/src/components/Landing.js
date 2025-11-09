import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sectionsRef = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    sectionsRef.current.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => {
      sectionsRef.current.forEach((section) => {
        if (section) observer.unobserve(section);
      });
    };
  }, []);

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
          <h1 className="landing-title reveal-on-load">
            IShowStream
          </h1>
          <p className="landing-subtitle reveal-on-load">
            AI-Powered Twitch Chat Analytics
          </p>
          <p className="landing-description reveal-on-load">
            Real-time insights for streamers. Understand your chat, engage with your audience, 
            and grow your community with AI-powered analytics.
          </p>
          <div className="landing-cta reveal-on-load">
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
          <div className="features-grid">
            <div 
              className="feature-card scroll-reveal"
              ref={(el) => (sectionsRef.current[0] = el)}
            >
              <div className="feature-icon">🤖</div>
              <h3>AI-Powered Analysis</h3>
              <p>Multi-agent system analyzes your chat in real-time with spam detection and priority ranking.</p>
            </div>
            <div 
              className="feature-card scroll-reveal"
              ref={(el) => (sectionsRef.current[1] = el)}
            >
              <div className="feature-icon">💡</div>
              <h3>Actionable Insights</h3>
              <p>Get AI-generated insights highlighting questions, requests, and actionable items.</p>
            </div>
            <div 
              className="feature-card scroll-reveal"
              ref={(el) => (sectionsRef.current[2] = el)}
            >
              <div className="feature-icon">📊</div>
              <h3>Live Dashboard</h3>
              <p>Monitor chat activity and AI analysis in one beautiful, real-time dashboard.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Landing;

