"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import "./MyAccount.scss";

export default function MyAccountClient({ user, userProfile }) {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  const displayName = user?.user_metadata?.full_name || userProfile?.full_name || 'Chưa cập nhật';
  const avatarUrl = user?.user_metadata?.avatar_url || userProfile?.avatar_url;
  const email = user?.email || '';
  const role = userProfile?.role || 'student';
  const createdAt = userProfile?.created_at 
    ? new Date(userProfile.created_at).toLocaleDateString('vi-VN')
    : 'N/A';

  return (
    <>
      <Header />
      <div className="cb-my-account-page">
        <div className="cb-account-container">
          {/* Header Section */}
          <div className="cb-account-header">
            <div className="cb-account-avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} />
              ) : (
                <div className="cb-avatar-placeholder">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="cb-account-info">
              <h1>{displayName}</h1>
              <p className="email">{email}</p>
              <span className="role-badge">{role === 'student' ? '🎓 Học viên' : '👨‍🏫 Giáo viên'}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="cb-account-tabs">
            <button
              className={`cb-tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              👤 Thông tin cá nhân
            </button>
            <button
              className={`cb-tab ${activeTab === 'progress' ? 'active' : ''}`}
              onClick={() => setActiveTab('progress')}
            >
              📊 Tiến độ học tập
            </button>
            <button
              className={`cb-tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              ⚙️ Cài đặt
            </button>
          </div>

          {/* Tab Content */}
          <div className="cb-account-content">
            {activeTab === 'profile' && (
              <div className="cb-profile-section">
                <h2>Thông tin cá nhân</h2>
                <div className="cb-info-grid">
                  <div className="cb-info-item">
                    <label>Họ và tên:</label>
                    <span>{displayName}</span>
                  </div>
                  <div className="cb-info-item">
                    <label>Email:</label>
                    <span>{email}</span>
                  </div>
                  <div className="cb-info-item">
                    <label>Vai trò:</label>
                    <span>{role === 'student' ? 'Học viên' : 'Giáo viên'}</span>
                  </div>
                  <div className="cb-info-item">
                    <label>Ngày tham gia:</label>
                    <span>{createdAt}</span>
                  </div>
                </div>

                {user?.app_metadata?.provider === 'google' && (
                  <div className="cb-auth-info">
                    <p>✅ Đã liên kết với Google Account</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'progress' && (
              <div className="cb-progress-section">
                <h2>Tiến độ học tập</h2>
                <p className="coming-soon">
                  🚧 Tính năng đang phát triển...
                  <br />
                  Bạn sẽ sớm có thể xem được:
                </p>
                <ul>
                  <li>📈 Tổng số bài tập đã hoàn thành</li>
                  <li>⭐ Số sao đã đạt được</li>
                  <li>🏆 Thành tích nổi bật</li>
                  <li>📊 Biểu đồ tiến độ theo môn học</li>
                </ul>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="cb-settings-section">
                <h2>Cài đặt tài khoản</h2>
                <div className="cb-settings-group">
                  <h3>Bảo mật</h3>
                  <button className="cb-btn-secondary">Đổi mật khẩu</button>
                </div>
                <div className="cb-settings-group">
                  <h3>Tài khoản</h3>
                  <button className="cb-btn-danger" onClick={signOut}>
                    🚪 Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
