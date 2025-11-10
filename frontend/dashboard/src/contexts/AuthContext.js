import React, { createContext, useContext, useState, useEffect } from "react";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "../firebase";

const AuthContext = createContext({});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userConfig, setUserConfig] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                // Load user config from Firestore
                try {
                    const userDoc = await getDoc(
                        doc(db, "users", firebaseUser.uid)
                    );
                    if (userDoc.exists()) {
                        setUserConfig(userDoc.data());
                    }
                } catch (error) {
                    console.error("Error loading user config:", error);
                }
            } else {
                setUser(null);
                setUserConfig(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const signUp = async (email, password) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );
            // Create user document in Firestore
            await setDoc(doc(db, "users", userCredential.user.uid), {
                email: email,
                createdAt: new Date().toISOString(),
                twitchChannel: null,
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const signIn = async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const signInWithGoogle = async () => {
        try {
            const userCredential = await signInWithPopup(auth, googleProvider);
            // Create or update user document in Firestore
            const userDoc = doc(db, "users", userCredential.user.uid);
            const userDocSnap = await getDoc(userDoc);

            if (!userDocSnap.exists()) {
                await setDoc(userDoc, {
                    email: userCredential.user.email,
                    createdAt: new Date().toISOString(),
                    twitchChannel: null,
                });
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const updateTwitchChannel = async (channel) => {
        if (!user) return { success: false, error: "Not authenticated" };

        try {
            // Determine API URL (same logic as Dashboard)
            const getApiUrl = () => {
                // Check runtime config (injected by entrypoint.sh if available)
                if (
                    typeof window !== "undefined" &&
                    window.__RUNTIME_CONFIG__?.REACT_APP_API_URL
                ) {
                    const url =
                        window.__RUNTIME_CONFIG__.REACT_APP_API_URL.trim();
                    if (url) return url;
                }
                // Check environment variable (set at build time)
                if (process.env.REACT_APP_API_URL) {
                    return process.env.REACT_APP_API_URL;
                }
                // Auto-detect for Cloud Run
                if (
                    typeof window !== "undefined" &&
                    window.location.hostname.includes(".run.app")
                ) {
                    const protocol = window.location.protocol;
                    const hostname = window.location.hostname.replace(
                        "ishowstream",
                        "dashboard-api"
                    );
                    return `${protocol}//${hostname}`;
                }
                // Fallback to localhost for development
                return "http://localhost:8082";
            };
            const API_URL = getApiUrl();

            // Update backend .env via API first
            const response = await fetch(`${API_URL}/api/update-channel`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ channel }),
                credentials: "omit", // Don't need credentials for this endpoint
            });

            const result = await response.json();

            if (result.success) {
                // Update Firestore user config
                await setDoc(
                    doc(db, "users", user.uid),
                    {
                        ...userConfig,
                        twitchChannel: channel,
                    },
                    { merge: true }
                );

                // Update local state
                setUserConfig((prev) => ({ ...prev, twitchChannel: channel }));
            }

            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const pauseMonitoring = async () => {
        try {
            const apiUrl =
                process.env.REACT_APP_API_URL ||
                "https://dashboard-api-234sus25va-uc.a.run.app";
            const response = await fetch(`${apiUrl}/api/monitoring/pause`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to pause monitoring");
            }

            return { success: true, message: result.message };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const resumeMonitoring = async () => {
        try {
            const apiUrl =
                process.env.REACT_APP_API_URL ||
                "https://dashboard-api-234sus25va-uc.a.run.app";
            const response = await fetch(`${apiUrl}/api/monitoring/resume`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to resume monitoring");
            }

            return { success: true, message: result.message };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const getMonitoringStatus = async () => {
        try {
            const apiUrl =
                process.env.REACT_APP_API_URL ||
                "https://dashboard-api-234sus25va-uc.a.run.app";
            const response = await fetch(`${apiUrl}/api/monitoring/status`);

            const result = await response.json();

            if (!response.ok) {
                throw new Error("Failed to get monitoring status");
            }

            return { success: true, enabled: result.monitoring_enabled };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const value = {
        user,
        userConfig,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        updateTwitchChannel,
        pauseMonitoring,
        resumeMonitoring,
        getMonitoringStatus,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
};
