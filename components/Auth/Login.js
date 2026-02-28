"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const Login = () => {
    const { isLoading, handleLogin, handleGoogleLogin, handleSignup, resetPassword } = useAuth();

    const [activeTab, setActiveTab] = useState("login");

    // Login form
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginError, setLoginError] = useState("");

    // Register form
    const [registerEmail, setRegisterEmail] = useState("");
    const [registerPassword, setRegisterPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [registerError, setRegisterError] = useState("");
    const [registerSuccess, setRegisterSuccess] = useState("");

    // Forgot password modal
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotError, setForgotError] = useState("");
    const [forgotSuccess, setForgotSuccess] = useState("");

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoginError("");
        const result = await handleLogin(e, loginEmail, loginPassword);
        if (result?.error) setLoginError(result.error);
    };

    const handleSignupSubmit = async (e) => {
        e.preventDefault();
        setRegisterError("");
        setRegisterSuccess("");
        if (registerPassword !== confirmPassword) {
            setRegisterError("Mật khẩu không khớp");
            return;
        }
        const result = await handleSignup(e, registerEmail, registerPassword);
        if (result?.error) setRegisterError(result.error);
        else if (result?.success) {
            setRegisterSuccess(result.success);
            setRegisterEmail("");
            setRegisterPassword("");
            setConfirmPassword("");
        }
    };

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        setForgotError("");
        setForgotSuccess("");
        if (!forgotEmail) { setForgotError("Vui lòng nhập email"); return; }
        const result = await resetPassword(forgotEmail);
        if (result?.error) setForgotError(result.error);
        else if (result?.success) { setForgotSuccess(result.success); setForgotEmail(""); }
    };

    const openForgotModal = (e) => {
        e.preventDefault();
        setShowForgotModal(true);
        setForgotEmail(loginEmail);
        setForgotError("");
        setForgotSuccess("");
    };

    return (
        <>
            <div className="cb-login-logo">
                <div className="logo-icon">🐻</div>
                <h1>Cun Bo</h1>
                <p>Học vui - Học thật mỗi ngày!</p>
            </div>

            {/* Tab Buttons */}
            <div className="cb-tab-buttons">
                <button
                    className={`cb-tab-btn ${activeTab === "login" ? "active" : ""}`}
                    onClick={() => setActiveTab("login")}
                >
                    Đăng Nhập
                </button>
                <button
                    className={`cb-tab-btn ${activeTab === "register" ? "active" : ""}`}
                    onClick={() => setActiveTab("register")}
                >
                    Đăng Ký
                </button>
            </div>

            {/* Login Tab */}
            {activeTab === "login" && (
                <div>
                    <h2 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "20px", color: "#1e293b" }}>
                        Chào mừng trở lại! 👋
                    </h2>
                    <form onSubmit={handleLoginSubmit}>
                        <div className="cb-form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                placeholder="Nhập email của bạn"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="cb-form-group">
                            <label>Mật khẩu</label>
                            <input
                                type="password"
                                placeholder="Nhập mật khẩu"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="cb-form-extras">
                            <label>
                                <input type="checkbox" /> Ghi nhớ đăng nhập
                            </label>
                            <a href="#" onClick={openForgotModal}>Quên mật khẩu?</a>
                        </div>
                        {loginError && <div className="cb-alert error">{loginError}</div>}
                        <button type="submit" className="cb-btn-submit" disabled={isLoading}>
                            {isLoading ? "Đang đăng nhập..." : "Đăng Nhập"}
                        </button>
                    </form>

                    <div className="cb-divider-text">hoặc</div>

                    <button className="cb-btn-google" onClick={handleGoogleLogin} disabled={isLoading}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M19.8055 10.2292C19.8055 9.55156 19.7501 8.86927 19.6302 8.2026H10.2002V12.0448H15.6014C15.3773 13.2969 14.6571 14.3802 13.6107 15.0875V17.5865H16.8251C18.7175 15.8448 19.8055 13.2729 19.8055 10.2292Z" fill="#4285F4" />
                            <path d="M10.2002 20.0006C12.9524 20.0006 15.2722 19.1048 16.8298 17.5865L13.6154 15.0875C12.7329 15.6979 11.5862 16.0433 10.2049 16.0433C7.5461 16.0433 5.29053 14.2819 4.51635 11.9163H1.20898V14.4923C2.80977 17.6798 6.3444 20.0006 10.2002 20.0006Z" fill="#34A853" />
                            <path d="M4.51173 11.9163C4.06951 10.6642 4.06951 9.3402 4.51173 8.08813V5.51215H1.20898C-0.177948 8.28269 -0.177948 11.7217 1.20898 14.4923L4.51173 11.9163Z" fill="#FBBC04" />
                            <path d="M10.2002 3.95794C11.6629 3.93617 13.0719 4.47192 14.1275 5.4548L16.9773 2.60504C15.1827 0.904091 12.7422 -0.0294371 10.2002 0.000400543C6.3444 0.000400543 2.80977 2.32119 1.20898 5.51215L4.51173 8.08813C5.28129 5.71794 7.54148 3.95794 10.2002 3.95794Z" fill="#EA4335" />
                        </svg>
                        Đăng nhập với Google
                    </button>
                </div>
            )}

            {/* Register Tab */}
            {activeTab === "register" && (
                <div>
                    <h2 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "20px", color: "#1e293b" }}>
                        Tạo tài khoản mới 🎉
                    </h2>
                    <form onSubmit={handleSignupSubmit}>
                        <div className="cb-form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                placeholder="Nhập email của bạn"
                                value={registerEmail}
                                onChange={(e) => setRegisterEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="cb-form-group">
                            <label>Mật khẩu</label>
                            <input
                                type="password"
                                placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
                                value={registerPassword}
                                onChange={(e) => setRegisterPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="cb-form-group">
                            <label>Xác nhận mật khẩu</label>
                            <input
                                type="password"
                                placeholder="Nhập lại mật khẩu"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        {registerError && <div className="cb-alert error">{registerError}</div>}
                        {registerSuccess && <div className="cb-alert success">{registerSuccess}</div>}
                        <button type="submit" className="cb-btn-submit" disabled={isLoading}>
                            {isLoading ? "Đang đăng ký..." : "Tạo Tài Khoản"}
                        </button>
                    </form>
                </div>
            )}

            {/* Forgot Password Modal */}
            {showForgotModal && (
                <div className="cb-modal-backdrop" onClick={() => setShowForgotModal(false)}>
                    <div className="cb-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="cb-modal-header">
                            <h3>🔑 Quên mật khẩu?</h3>
                            <button onClick={() => setShowForgotModal(false)}>×</button>
                        </div>
                        {!forgotSuccess ? (
                            <form onSubmit={handleForgotSubmit}>
                                <p style={{ fontSize: "0.88rem", color: "#64748b", marginBottom: "16px" }}>
                                    Nhập email của bạn. Chúng tôi sẽ gửi link đặt lại mật khẩu.
                                </p>
                                <div className="cb-form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        placeholder="Nhập email"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                {forgotError && <div className="cb-alert error">{forgotError}</div>}
                                <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotModal(false)}
                                        style={{ flex: 1, padding: "12px", border: "2px solid #e2e8f0", borderRadius: "12px", background: "white", cursor: "pointer", fontWeight: 700 }}
                                    >
                                        Hủy
                                    </button>
                                    <button type="submit" className="cb-btn-submit" disabled={isLoading} style={{ flex: 2, marginBottom: 0 }}>
                                        {isLoading ? "Đang gửi..." : "Gửi Link Reset"}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div>
                                <div className="cb-alert success">{forgotSuccess}</div>
                                <button
                                    className="cb-btn-submit"
                                    onClick={() => setShowForgotModal(false)}
                                    style={{ marginBottom: 0 }}
                                >
                                    Đóng
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default Login;
