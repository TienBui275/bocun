"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function useAuth() {
    const supabase = createClient();
    const router = useRouter();

    const [session, setSession] = useState(null);
    const [user, setUser] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const clearError = () => setError(null);

    const updateSessionState = async (newSession) => {
        setSession(newSession);
        setIsLoggedIn(!!newSession);
        setUser(newSession?.user || null);
        setIsLoading(false);
    };

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setIsLoggedIn(false);
            router.push("/");
        } catch (err) {
            setError(err.message);
        }
    };

    const handleLogin = async (e, loginEmail, loginPassword) => {
        if (e) e.preventDefault();
        clearError();
        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password: loginPassword,
            });
            if (error) {
                setError(error.message);
                return { error: error.message };
            }
            router.push("/");
            return { success: true };
        } catch (err) {
            setError(err.message);
            return { error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        clearError();
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    queryParams: { 
                        access_type: "offline", 
                        prompt: "consent" 
                    },
                },
            });
            if (error) {
                setError(error.message);
                setIsLoading(false);
            }
            // Note: Do not set isLoading = false here because the browser will redirect
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    const handleSignup = async (e, signupEmail, signupPassword) => {
        if (e) e.preventDefault();
        clearError();
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signUp({
                email: signupEmail,
                password: signupPassword,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) {
                setError(error.message);
                return { error: error.message };
            }
            return { success: "Please check your email to confirm your account" };
        } catch (err) {
            setError(err.message);
            return { error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    const resetPassword = async (resetEmail) => {
        clearError();
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) {
                setError(error.message);
                return { error: error.message };
            }
            return { success: "Password reset email sent. Please check your inbox." };
        } catch (err) {
            setError(err.message);
            return { error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                await updateSessionState(session);
            } catch (err) {
                setError(err.message);
                setIsLoading(false);
            }
        };
        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            updateSessionState(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    return {
        session, user, isLoggedIn, isLoading, error,
        clearError, handleLogin, handleGoogleLogin,
        handleSignup, resetPassword, signOut,
    };
}
