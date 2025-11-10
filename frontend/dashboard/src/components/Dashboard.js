import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useWebSocket } from "../contexts/WebSocketContext";
import "./Dashboard.css";
import Stats from "./Stats";
import RecentMessages from "./RecentMessages";
import AIInsights from "./AIInsights";
import AgentActivityLog from "./AgentActivityLog";

function Dashboard() {
    const [stats, setStats] = useState({});
    const [insights, setInsights] = useState(null);
    const [streamerInfo, setStreamerInfo] = useState(null);
    const { user } = useAuth();
    const {
        isConnected,
        agentActivities,
        recentMessages,
        setAgentActivities,
        setRecentMessages,
    } = useWebSocket();

    // Determine API URL - auto-detect for Cloud Run or use environment variable
    const getApiUrl = () => {
        // Check runtime config (injected by entrypoint.sh if available)
        if (
            typeof window !== "undefined" &&
            window.__RUNTIME_CONFIG__?.REACT_APP_API_URL
        ) {
            const url = window.__RUNTIME_CONFIG__.REACT_APP_API_URL.trim();
            if (url) {
                console.log("✅ Using API URL from runtime config:", url);
                return url;
            }
        }
        // Check environment variable (set at build time)
        if (process.env.REACT_APP_API_URL) {
            console.log(
                "✅ Using API URL from build-time env:",
                process.env.REACT_APP_API_URL
            );
            return process.env.REACT_APP_API_URL;
        }
        // Auto-detect for Cloud Run - try to find dashboard-api service
        if (
            typeof window !== "undefined" &&
            window.location.hostname.includes(".run.app")
        ) {
            const protocol = window.location.protocol;
            const hostname = window.location.hostname;
            // Extract service ID from hostname (format: service-xxxxx-uc.a.run.app)
            const match = hostname.match(/^([^-]+)-([^-]+)-([^.]+)\.(.+)$/);
            if (match) {
                const [, serviceName, serviceId, region, domain] = match;
                // Construct dashboard-api URL with same service ID and region
                const apiHostname = `dashboard-api-${serviceId}-${region}.${domain}`;
                const apiUrl = `${protocol}//${apiHostname}`;
                console.log(
                    "🔍 Auto-detected API URL from Cloud Run pattern:",
                    apiUrl
                );
                console.warn(
                    "⚠️ API URL not configured. Using auto-detection which may not work correctly."
                );
                console.warn(
                    "   Please set REACT_APP_API_URL environment variable in Cloud Run service."
                );
                return apiUrl;
            }
            // Fallback: try simple replacement
            const apiHostname = hostname.replace(
                "ishowstream",
                "dashboard-api"
            );
            console.log(
                "🔍 Auto-detected API URL (fallback):",
                `${protocol}//${apiHostname}`
            );
            return `${protocol}//${apiHostname}`;
        }
        // Fallback to localhost for development
        console.log("🌐 Using localhost API URL (development mode)");
        return "http://localhost:8082";
    };

    // Memoize API URL to prevent re-renders from recreating it
    const API_URL = useMemo(() => getApiUrl(), []);

    // Log configuration for debugging
    useEffect(() => {
        console.log("🔧 Dashboard API Configuration:", {
            API_URL,
            hostname: window.location.hostname,
            wsConnected: isConnected,
        });
    }, [API_URL, isConnected]);

    // Fetch initial data from API
    const fetchData = async () => {
        try {
            // Fetch stats
            const statsRes = await fetch(`${API_URL}/api/stats`);
            const statsData = await statsRes.json();
            setStats(statsData);

            // Fetch recent messages (only if WebSocket hasn't populated them yet)
            if (recentMessages.length === 0) {
                const recentRes = await fetch(`${API_URL}/api/messages/recent`);
                const recentData = await recentRes.json();
                setRecentMessages(recentData ? recentData.slice(0, 20) : []); // Last 20
            }

            // Fetch AI insights
            const insightsRes = await fetch(`${API_URL}/api/insights/latest`);
            const insightsData = await insightsRes.json();
            setInsights(insightsData);

            // Fetch streamer info
            const streamerRes = await fetch(`${API_URL}/api/streamer`);
            const streamerData = await streamerRes.json();
            setStreamerInfo(streamerData);

            // Fetch agent activity (only if WebSocket hasn't populated them yet)
            if (agentActivities.length === 0) {
                const activityRes = await fetch(
                    `${API_URL}/api/agent-activity`
                );
                const activityData = await activityRes.json();
                setAgentActivities(activityData || []);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    // Fetch initial data on mount
    useEffect(() => {
        fetchData();
        // Poll less frequently for stats, insights, etc (every 10 seconds)
        // Messages are now real-time via WebSocket
        const interval = setInterval(() => {
            // Only fetch non-realtime data (stats, insights, streamer info)
            const fetchNonRealtime = async () => {
                try {
                    const statsRes = await fetch(`${API_URL}/api/stats`);
                    const statsData = await statsRes.json();
                    setStats(statsData);

                    const insightsRes = await fetch(
                        `${API_URL}/api/insights/latest`
                    );
                    const insightsData = await insightsRes.json();
                    setInsights(insightsData);

                    const streamerRes = await fetch(`${API_URL}/api/streamer`);
                    const streamerData = await streamerRes.json();
                    setStreamerInfo(streamerData);
                } catch (error) {
                    console.error("Error fetching non-realtime data:", error);
                }
            };
            fetchNonRealtime();
        }, 10000); // Poll every 10 seconds for non-realtime data
        return () => clearInterval(interval);
    }, [API_URL]);

    // WebSocket is now managed globally by WebSocketContext
    // No need for local WebSocket connection

    return (
        <div className="dashboard">
            <div className="dashboard-header app-content">
                <div className="dashboard-header-content">
                    {streamerInfo && (
                        <div className="streamer-info-centered">
                            {streamerInfo.avatar_url && (
                                <img
                                    src={streamerInfo.avatar_url}
                                    alt={
                                        streamerInfo.display_name ||
                                        streamerInfo.channel
                                    }
                                    className="streamer-avatar"
                                />
                            )}
                            <h1 className="dashboard-title">
                                {streamerInfo.display_name ||
                                    streamerInfo.channel}
                            </h1>
                        </div>
                    )}
                    {isConnected && (
                        <div className="live-indicator">
                            <span className="live-dot"></span>
                            <span>Live</span>
                        </div>
                    )}
                </div>
            </div>

            <main className="dashboard-content">
                {/* Main Content Area */}
                <div className="main-content-wrapper app-content">
                    {/* Stats Row */}
                    <section className="section-stats">
                        <Stats stats={stats} />
                    </section>

                    {/* AI Insights - Main Feature (Large) */}
                    <section className="section-insights-main">
                        <AIInsights insights={insights} />
                    </section>

                    {/* Recent Messages Section */}
                    <section className="section-messages">
                        <RecentMessages messages={recentMessages} />
                    </section>

                    {/* Agent Activity Log Section */}
                    <section className="section-agent-activity">
                        <AgentActivityLog activities={agentActivities} />
                    </section>
                </div>
            </main>
        </div>
    );
}

export default Dashboard;
