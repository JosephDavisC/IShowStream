import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const WebSocketContext = createContext();

export function useWebSocket() {
    return useContext(WebSocketContext);
}

export function WebSocketProvider({ children }) {
    const [isConnected, setIsConnected] = useState(false);
    const [agentActivities, setAgentActivities] = useState([]);
    const [recentMessages, setRecentMessages] = useState([]);

    // Determine WebSocket URL
    const getWsUrl = () => {
        // Check runtime config
        if (
            typeof window !== "undefined" &&
            window.__RUNTIME_CONFIG__?.REACT_APP_WS_URL
        ) {
            const url = window.__RUNTIME_CONFIG__.REACT_APP_WS_URL.trim();
            if (url) return url;
        }
        // Check environment variable
        if (process.env.REACT_APP_WS_URL) {
            return process.env.REACT_APP_WS_URL;
        }
        // Construct from API URL
        const getApiUrl = () => {
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
            if (process.env.REACT_APP_API_URL) {
                console.log(
                    "✅ Using API URL from env:",
                    process.env.REACT_APP_API_URL
                );
                return process.env.REACT_APP_API_URL;
            }
            if (
                typeof window !== "undefined" &&
                window.location.hostname !== "localhost"
            ) {
                const apiUrl = `https://dashboard-api-234sus25va-uc.a.run.app`;
                console.log("🌐 Using production API URL:", apiUrl);
                return apiUrl;
            }
            console.log("🌐 Using localhost API URL (development mode)");
            return "http://localhost:8082";
        };

        const apiUrl = getApiUrl();
        if (apiUrl.startsWith("https")) {
            return apiUrl.replace("https", "wss") + "/ws";
        }
        return apiUrl.replace("http", "ws") + "/ws";
    };

    const WS_URL = useMemo(() => getWsUrl(), []);

    useEffect(() => {
        let ws = null;
        let reconnectTimeout = null;
        let isUnmounting = false;

        const connectWebSocket = () => {
            if (isUnmounting) return;

            try {
                console.log("🔌 Connecting to WebSocket:", WS_URL);
                ws = new WebSocket(WS_URL);

                ws.onopen = () => {
                    console.log("✅ WebSocket connected globally");
                    setIsConnected(true);
                };

                ws.onmessage = (event) => {
                    try {
                        let data;
                        try {
                            data = JSON.parse(event.data);
                        } catch (singleParseError) {
                            const messages = event.data
                                .split("\n")
                                .filter((msg) => msg.trim());
                            if (messages.length > 0) {
                                data = JSON.parse(messages[0].trim());
                            } else {
                                throw singleParseError;
                            }
                        }

                        if (data.type === "agent_activity") {
                            setAgentActivities((prev) =>
                                [data.activity, ...prev].slice(0, 50)
                            );
                            console.log(
                                "📡 Received agent activity:",
                                data.activity
                            );
                        } else if (data.type === "new_message") {
                            setRecentMessages((prev) => {
                                const exists = prev.some(
                                    (msg) => msg.id === data.message.id
                                );
                                if (exists) return prev;
                                return [data.message, ...prev].slice(0, 50);
                            });
                            console.log("💬 Received new message:", data.message);
                        }
                    } catch (error) {
                        if (!error.message.includes("JSON")) {
                            console.error(
                                "Error processing WebSocket message:",
                                error
                            );
                        }
                    }
                };

                ws.onerror = (error) => {
                    console.error("❌ WebSocket error:", error);
                    setIsConnected(false);
                };

                ws.onclose = () => {
                    console.log("⚠️  WebSocket disconnected");
                    setIsConnected(false);

                    if (!isUnmounting) {
                        console.log(
                            "🔄 Reconnecting WebSocket in 3 seconds..."
                        );
                        reconnectTimeout = setTimeout(() => {
                            connectWebSocket();
                        }, 3000);
                    }
                };
            } catch (error) {
                console.error("Failed to create WebSocket:", error);
                if (!isUnmounting) {
                    reconnectTimeout = setTimeout(() => {
                        connectWebSocket();
                    }, 3000);
                }
            }
        };

        connectWebSocket();

        return () => {
            isUnmounting = true;
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }
            if (ws) {
                ws.close();
            }
        };
    }, [WS_URL]);

    const value = {
        isConnected,
        agentActivities,
        recentMessages,
        setAgentActivities,
        setRecentMessages,
    };

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
}

