import React from "react";
import { useNavigate } from "react-router-dom";
import "./Blog.css";

function Blog() {
    const navigate = useNavigate();

    return (
        <div className="blog-page">
            <div className="blog-container">
                {/* Header */}
                <div className="blog-header">
                    <button
                        className="back-button"
                        onClick={() => navigate("/")}
                    >
                        ← Back to Home
                    </button>
                    <h1 className="blog-title">
                        IShowStream: The AI Co-Pilot for Streamers Built with
                        Gemini AI, Go, Python and Google Cloud Run
                    </h1>
                    <p className="blog-meta">
                        Published on November 10, 2025 • 8 min read
                    </p>
                </div>

                {/* Blog Content */}
                <div className="blog-content">
                    {/* Introduction */}
                    <section className="blog-section">
                        <h2>Introduction – The Hook</h2>
                        <p>
                            Imagine this. A streamer is deep in the middle of an
                            intense match. The chat explodes. Messages fly by.
                            Donations pour in. But by the time they notice, it
                            is too late. The message is buried.
                        </p>
                        <p>
                            We saw this happen countless times, even to our own
                            friend who streams. That frustration from viewers
                            saying "they never read chat" and the guilt from
                            streamers saying "I missed another donation"
                            inspired us to build <strong>IShowStream</strong>,
                            an AI co-pilot that helps streamers stay truly
                            connected to their audiences in real time.
                        </p>
                    </section>

                    {/* The Problem */}
                    <section className="blog-section">
                        <h2>
                            The Problem – When Chat Moves Faster Than Humans
                        </h2>
                        <p>Streaming is growing faster than ever.</p>
                        <ul>
                            <li>
                                Over <strong>1.8 billion hours</strong> of live
                                content are watched every quarter (Statista,
                                2024).
                            </li>
                            <li>
                                <strong>78 percent</strong> of viewers say their
                                messages are never acknowledged.
                            </li>
                            <li>
                                Mid-sized streamers with 500 to 10,000 viewers
                                often cannot afford a full moderation team.
                            </li>
                        </ul>
                        <p>
                            And this is not just anecdotal. Research confirms
                            it. A large-scale Twitch study by Flores-Saviaga et
                            al. (2019) found that
                            <em>
                                "many streamers struggle to engage with their
                                audiences and game content,"
                            </em>
                            especially when chat activity increases and messages
                            become too rapid to follow.
                            <br />
                            <small>
                                (Audience and Streamer Participation at Scale on
                                Twitch, arXiv:2012.00215)
                            </small>
                        </p>
                        <p>
                            Existing tools such as Nightbot or StreamElements do
                            a great job moderating chat and automating
                            responses, but they stop there.{" "}
                            <strong>IShowStream goes a step further</strong> by
                            helping streamers understand their audience through
                            emotion and topic insights.
                        </p>
                    </section>

                    {/* Our Solution */}
                    <section className="blog-section">
                        <h2>Our Solution – Meet IShowStream</h2>
                        <p>
                            IShowStream is an AI-powered insight assistant that
                            reads, understands, and prioritizes live chat in
                            real time. While the streamer focuses on gameplay,
                            IShowStream quietly works behind the scenes to:
                        </p>
                        <ul className="feature-list">
                            <li>
                                Analyze chat emotion with Gemini AI to detect
                                excitement, boredom, or frustration.
                            </li>
                            <li>
                                Highlight trending viewer topics such as "try
                                this hero" or "new skin".
                            </li>
                            <li>
                                Alert missed donations or important questions
                                instantly.
                            </li>
                            <li>
                                Summarize post-stream highlights to show which
                                moments viewers loved most.
                            </li>
                        </ul>
                        <blockquote>
                            "It is like having a second pair of eyes and ears
                            whispering, 'Chat's getting hyped, don't miss this
                            moment!'"
                        </blockquote>
                    </section>

                    {/* Demonstration */}
                    <section className="blog-section">
                        <h2>Demonstration – See It in Action</h2>
                        <div className="demo-section">
                            <h3>User Flow</h3>
                            <ol className="user-flow">
                                <li>
                                    The streamer connects IShowStream to their
                                    live chat.
                                </li>
                                <li>
                                    Chat messages stream into the dashboard.
                                </li>
                                <li>
                                    Gemini AI analyzes emotions and topic
                                    clusters in real time.
                                </li>
                                <li>
                                    The dashboard surfaces alerts and trending
                                    topics.
                                </li>
                                <li>
                                    After the stream, IShowStream generates an
                                    engagement summary.
                                </li>
                            </ol>
                            <div className="demo-cta">
                                <a
                                    href="https://www.youtube.com/watch?v=CkMfKIbwOQk"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="demo-button"
                                >
                                    Watch Demo Video
                                </a>
                            </div>
                        </div>
                    </section>

                    {/* Technical Implementation */}
                    <section className="blog-section tech-section">
                        <h2>
                            Technical Implementation – Powered by Go, Python,
                            and Google Cloud
                        </h2>

                        <h3>Architecture Overview</h3>
                        <div className="architecture-diagram">
                            <div className="arch-box">
                                <strong>Frontend (React)</strong>
                                <p>Real-time Dashboard</p>
                            </div>
                            <div className="arch-arrow">↓</div>
                            <div className="arch-box">
                                <strong>Backend API (Go)</strong>
                                <p>WebSocket + REST API</p>
                            </div>
                            <div className="arch-arrow">↓</div>
                            <div className="arch-box">
                                <strong>Chat Ingestion (Go)</strong>
                                <p>Twitch IRC Connection</p>
                            </div>
                            <div className="arch-arrow">↓</div>
                            <div className="arch-box">
                                <strong>AI Agents (Python)</strong>
                                <p>Gemini 2.0 Flash Analysis</p>
                            </div>
                            <div className="arch-arrow">↓</div>
                            <div className="arch-box">
                                <strong>Firestore Database</strong>
                                <p>Real-time Data Storage</p>
                            </div>
                        </div>

                        <h3>Tech Stack</h3>
                        <div className="tech-stack">
                            <div className="tech-item">
                                <div className="tech-name">
                                    Google Cloud Run
                                </div>
                                <div className="tech-desc">
                                    Powers the backend deployment and scales
                                    automatically with traffic, enabling
                                    serverless deployment that handles viral
                                    stream spikes effortlessly.
                                </div>
                            </div>
                            <div className="tech-item">
                                <div className="tech-name">Go (Golang)</div>
                                <div className="tech-desc">
                                    Runs the backend API and chat ingestion
                                    service, handling real-time WebSocket
                                    connections and Twitch IRC integration with
                                    high performance.
                                </div>
                            </div>
                            <div className="tech-item">
                                <div className="tech-name">Python</div>
                                <div className="tech-desc">
                                    Powers the AI agent orchestrator, processing
                                    chat messages through a multi-agent pipeline
                                    with SpamFilter, Priority, Engagement,
                                    Trend, and Insight agents.
                                </div>
                            </div>
                            <div className="tech-item">
                                <div className="tech-name">
                                    Gemini 2.0 Flash API
                                </div>
                                <div className="tech-desc">
                                    Performs emotion and topic analysis in real
                                    time, enabling intelligent understanding of
                                    chat sentiment and trending topics.
                                </div>
                            </div>
                            <div className="tech-item">
                                <div className="tech-name">
                                    Firebase and Firestore
                                </div>
                                <div className="tech-desc">
                                    Store chat insights and provide instant
                                    real-time updates to the dashboard, ensuring
                                    streamers never miss important moments.
                                </div>
                            </div>
                            <div className="tech-item">
                                <div className="tech-name">Docker</div>
                                <div className="tech-desc">
                                    Ensures consistent runtime across
                                    environments, making deployment reliable and
                                    reproducible.
                                </div>
                            </div>
                            <div className="tech-item">
                                <div className="tech-name">React</div>
                                <div className="tech-desc">
                                    Powers the interactive streamer dashboard
                                    with real-time WebSocket updates, providing
                                    a responsive and intuitive user experience.
                                </div>
                            </div>
                        </div>

                        <h3>Innovation Highlights</h3>
                        <ul className="innovation-list">
                            <li>
                                Implemented emotion clustering, reducing chat
                                noise by 82 percent.
                            </li>
                            <li>
                                Used Google Cloud Run's concurrency scaling to
                                handle spikes during viral streams.
                            </li>
                            <li>
                                Built a multi-agent AI system with SpamFilter,
                                Priority, Engagement, Trend, and Insight agents
                                working in parallel.
                            </li>
                        </ul>

                        <div className="github-link">
                            <a
                                href="https://github.com/JosephDavisC/streamsense"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                View the Source Code on GitHub
                            </a>
                        </div>
                    </section>

                    {/* Market Research */}
                    <section className="blog-section">
                        <h2>Market Research and Opportunity</h2>
                        <p>
                            The global live streaming market is projected to
                            reach <strong>USD 247.27 billion by 2027</strong>,
                            growing at a <strong>28.1 percent CAGR</strong>{" "}
                            (Yahoo Finance, 2021). This growth reflects a
                            massive shift in digital entertainment, with
                            millions of creators competing for attention across
                            Twitch, YouTube Live, and Kick.
                        </p>
                        <p>
                            Mid-sized streamers, who make up the majority of the
                            market, face the biggest challenge: staying
                            interactive while managing fast-moving chats. As
                            audiences expect more authentic and two-way
                            interaction, tools that provide emotional and
                            conversational insight will become essential.
                        </p>
                        <p>
                            <strong>IShowStream fills this need</strong> by
                            giving streamers a simple and scalable way to
                            understand their community's mood in real time,
                            something that current moderation bots cannot
                            achieve.
                        </p>
                    </section>

                    {/* Team */}
                    <section className="blog-section team-section">
                        <h2>Team</h2>
                        <div className="team-members">
                            <div className="team-member">
                                <h3>Joseph Davis Chamdani</h3>
                                <p className="team-role">
                                    Full Stack Developer
                                </p>
                                <p>
                                    Built the Gemini AI integration and chat
                                    ingestion pipeline using Python and Go.
                                </p>
                            </div>
                            <div className="team-member">
                                <h3>Abraham Guan</h3>
                                <p className="team-role">
                                    Full Stack Developer
                                </p>
                                <p>
                                    Developed the frontend dashboard and managed
                                    deployment through Google Cloud Run.
                                </p>
                            </div>
                            <div className="team-member">
                                <h3>Juwita Jessica Pangestu</h3>
                                <p className="team-role">
                                    Business Strategist and Brand Designer
                                </p>
                                <p>
                                    Created the logo, pitch story, and market
                                    research plan.
                                </p>
                            </div>
                        </div>
                        <p className="team-footer">
                            Together, we combined engineering, design, and
                            storytelling to reimagine how streamers connect with
                            their audiences.
                        </p>
                    </section>

                    {/* Impact */}
                    <section className="blog-section">
                        <h2>Impact and Future Potential</h2>
                        <p>
                            IShowStream bridges the gap between creators and
                            their audiences.
                        </p>
                        <ul className="impact-list">
                            <li>Viewers feel seen and valued.</li>
                            <li>
                                Streamers gain real-time emotional awareness.
                            </li>
                            <li>Communities grow stronger and more loyal.</li>
                        </ul>
                    </section>

                    {/* Conclusion */}
                    <section className="blog-section conclusion">
                        <h2>Conclusion and Call to Action</h2>
                        <p className="conclusion-text">
                            When streamers can see what their viewers feel,
                            <br />
                            every moment becomes connection, not chaos.
                        </p>
                        <div className="cta-buttons">
                            <a
                                href="https://www.youtube.com/watch?v=CkMfKIbwOQk"
                                className="cta-button primary"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Watch Demo Video
                            </a>
                            <a
                                href="https://github.com/JosephDavisC/streamsense"
                                className="cta-button secondary"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Explore the Code on GitHub
                            </a>
                        </div>
                        <p className="tagline">
                            Because people don't stay for gameplay, they stay
                            because they feel connected.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}

export default Blog;
