"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

const Header = () => {
    const { isLoggedIn, user, isLoading, signOut } = useAuth();

    const getInitial = (email) => {
        if (!email) return "U";
        return email[0].toUpperCase();
    };

    return (
        <header className="cb-header">
            <div className="container">
                <div className="cb-header-inner">
                    {/* Logo */}
                    <Link href="/" className="cb-logo">
                        <div className="cb-logo-icon">🐻</div>
                        <span>Cun Bo</span>
                    </Link>

                    {/* Nav */}
                    <nav className="cb-nav">
                        <Link href="/">Trang Chủ</Link>
                        <Link href="/#grades">Lớp Học</Link>
                        <Link href="/#subjects">Môn Học</Link>
                    </nav>

                    {/* Auth Actions */}
                    <div className="cb-header-actions">
                        {isLoading ? (
                            <div style={{ width: 80, height: 36, background: "#f1f5f9", borderRadius: 10 }} />
                        ) : isLoggedIn ? (
                            <>
                                <div className="cb-user-avatar">
                                    <div className="avatar-circle">{getInitial(user?.email)}</div>
                                    <span className="user-email">{user?.email}</span>
                                </div>
                                <button className="cb-btn-logout" onClick={signOut}>
                                    Đăng Xuất
                                </button>
                            </>
                        ) : (
                            <Link href="/login" className="cb-btn-login">
                                🔑 Đăng Nhập
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
