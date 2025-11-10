import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Landing.css";

function Landing() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const sectionsRef = useRef([]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("reveal");
                    }
                });
            },
            { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
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
            navigate("/dashboard");
        } else {
            navigate("/login");
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
                        Real-time insights for streamers. Understand your chat,
                        engage with your audience, and grow your community with
                        AI-powered analytics.
                    </p>
                    <div className="landing-cta reveal-on-load">
                        <button
                            className="btn-primary"
                            onClick={handleGetStarted}
                        >
                            Get Started
                        </button>
                        <button
                            className="btn-secondary"
                            onClick={() => navigate("/login")}
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            </section>

            {/* Quick Start Guide */}
            <section className="quick-start-section">
                <div className="landing-container">
                    <h2 className="section-title">Quick Start Guide</h2>
                    <div className="tutorial-cards">
                        <div
                            className="tutorial-card scroll-reveal"
                            ref={(el) => (sectionsRef.current[3] = el)}
                            onClick={() => navigate("/profile")}
                        >
                            <div className="tutorial-icon">⚙️</div>
                            <h3>Configure Your Stream</h3>
                            <p>
                                Set your Twitch channel name in the Profile
                                settings to start monitoring your chat.
                            </p>
                            <span className="tutorial-link">
                                Go to Profile →
                            </span>
                        </div>

                        <div
                            className="tutorial-card scroll-reveal"
                            ref={(el) => (sectionsRef.current[4] = el)}
                            onClick={() => navigate("/profile")}
                        >
                            <div className="tutorial-icon">⏸️</div>
                            <h3>Pause & Resume</h3>
                            <p>
                                Control monitoring to save API credits when
                                you're not streaming. Toggle anytime from
                                Profile.
                            </p>
                            <span className="tutorial-link">
                                Manage Monitoring →
                            </span>
                        </div>

                        <div
                            className="tutorial-card scroll-reveal"
                            ref={(el) => (sectionsRef.current[5] = el)}
                            onClick={() => navigate("/dashboard")}
                        >
                            <div className="tutorial-icon">💡</div>
                            <h3>Review AI Insights</h3>
                            <p>
                                Click on AI insights or missed questions to mark
                                them as resolved and move them to history.
                            </p>
                            <span className="tutorial-link">
                                View Dashboard →
                            </span>
                        </div>

                        <div
                            className="tutorial-card scroll-reveal"
                            ref={(el) => (sectionsRef.current[6] = el)}
                            onClick={() => navigate("/dashboard")}
                        >
                            <div className="tutorial-icon">📊</div>
                            <h3>Monitor in Real-Time</h3>
                            <p>
                                Watch live chat messages, agent activity, and
                                analytics update automatically on your
                                dashboard.
                            </p>
                            <span className="tutorial-link">
                                Open Dashboard →
                            </span>
                        </div>
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
                            <p>
                                Multi-agent system analyzes your chat in
                                real-time with spam detection and priority
                                ranking.
                            </p>
                        </div>
                        <div
                            className="feature-card scroll-reveal"
                            ref={(el) => (sectionsRef.current[1] = el)}
                        >
                            <div className="feature-icon">💡</div>
                            <h3>Actionable Insights</h3>
                            <p>
                                Get AI-generated insights highlighting
                                questions, requests, and actionable items.
                            </p>
                        </div>
                        <div
                            className="feature-card scroll-reveal"
                            ref={(el) => (sectionsRef.current[2] = el)}
                        >
                            <div className="feature-icon">📊</div>
                            <h3>Live Dashboard</h3>
                            <p>
                                Monitor chat activity and AI analysis in one
                                beautiful, real-time dashboard.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Landing;
