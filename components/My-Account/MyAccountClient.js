"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import "./MyAccount.scss";

export default function MyAccountClient({ user, userProfile }) {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  const displayName = user?.user_metadata?.full_name || userProfile?.full_name || 'Not updated';
  const avatarUrl = user?.user_metadata?.avatar_url || userProfile?.avatar_url;
  const email = user?.email || '';
  const role = userProfile?.role || 'student';
  const createdAt = userProfile?.created_at 
    ? new Date(userProfile.created_at).toLocaleDateString('en-US')
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
              <span className="role-badge">{role === 'student' ? '🎓 Student' : '👨‍🏫 Teacher'}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="cb-account-tabs">
            <button
              className={`cb-tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              👤 Personal Info
            </button>
            <button
              className={`cb-tab ${activeTab === 'progress' ? 'active' : ''}`}
              onClick={() => setActiveTab('progress')}
            >
              📊 Learning Progress
            </button>
            <button
              className={`cb-tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              ⚙️ Settings
            </button>
          </div>

          {/* Tab Content */}
          <div className="cb-account-content">
            {activeTab === 'profile' && (
              <div className="cb-profile-section">
                <h2>Personal Info</h2>
                <div className="cb-info-grid">
                  <div className="cb-info-item">
                    <label>Full Name:</label>
                    <span>{displayName}</span>
                  </div>
                  <div className="cb-info-item">
                    <label>Email:</label>
                    <span>{email}</span>
                  </div>
                  <div className="cb-info-item">
                    <label>Role:</label>
                    <span>{role === 'student' ? 'Student' : 'Teacher'}</span>
                  </div>
                  <div className="cb-info-item">
                    <label>Joined:</label>
                    <span>{createdAt}</span>
                  </div>
                </div>

                {user?.app_metadata?.provider === 'google' && (
                  <div className="cb-auth-info">
                    <p>✅ Linked with Google Account</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'progress' && (
              <div className="cb-progress-section">
                <h2>Learning Progress</h2>
                <p className="coming-soon">
                  🚧 Feature under development...
                  <br />
                  You will soon be able to see:
                </p>
                <ul>
                  <li>📈 Total exercises completed</li>
                  <li>⭐ Stars earned</li>
                  <li>🏆 Top achievements</li>
                  <li>📊 Progress chart by subject</li>
                </ul>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="cb-settings-section">
                <h2>Account Settings</h2>
                <div className="cb-settings-group">
                  <h3>Security</h3>
                  <button className="cb-btn-secondary">Change Password</button>
                </div>
                <div className="cb-settings-group">
                  <h3>Account</h3>
                  <button className="cb-btn-danger" onClick={signOut}>
                    🚪 Sign Out
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
