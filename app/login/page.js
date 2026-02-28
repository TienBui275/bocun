"use client";

import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import Login from "@/components/Auth/Login";

export default function LoginPage() {
    return (
        <div className="cb-login-page">
            <Header />
            <div className="cb-login-container">
                <div className="cb-login-card">
                    <Login />
                </div>
            </div>
            <Footer />
        </div>
    );
}
