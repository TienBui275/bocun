"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import "./UserProfile.scss";

export default function UserProfile() {
  const { user, isLoggedIn, isLoading, signOut } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="cb-user-profile-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <button 
        className="cb-login-btn"
        onClick={() => router.push('/login')}
      >
        Đăng Nhập
      </button>
    );
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <div className="cb-user-profile">
      <div className="cb-user-avatar">
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} />
        ) : (
          <div className="cb-avatar-placeholder">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      
      <div className="cb-user-info">
        <span className="cb-user-name">{displayName}</span>
        <div className="cb-user-menu">
          <button 
            className="cb-menu-item"
            onClick={() => router.push('/my-account')}
          >
            👤 Tài khoản
          </button>
          <button 
            className="cb-menu-item"
            onClick={() => router.push('/my-account/progress')}
          >
            📊 Tiến độ học tập
          </button>
          <button 
            className="cb-menu-item cb-logout"
            onClick={signOut}
          >
            🚪 Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}
