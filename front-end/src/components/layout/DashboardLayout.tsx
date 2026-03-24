import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationCenter from '../notifications/NotificationCenter';
import api from '../../lib/api';

interface DashboardLayoutProps {
  role: 'patient' | 'dentist' | 'admin';
  userName?: string;
  userId?: string;
  children: ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
}

const DashboardLayout = ({ role, userName = 'User', userId = '', children, activeView, onViewChange }: DashboardLayoutProps) => {
  const navigate = useNavigate();

  const clearLocalAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('full_name');
    localStorage.removeItem('user_role');
  };

  const handleLogout = async () => {
    try {
      await api.post('logout/');
    } catch (error) {
      console.error('Logout API failed, clearing local session anyway:', error);
    } finally {
      clearLocalAuth();
      navigate('/login', { replace: true });
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'patient':
        return 'Patient';
      case 'dentist':
        return 'Dentist';
      case 'admin':
        return 'Administrator';
      default:
        return 'User';
    }
  };

  const getSidebarItems = () => {
    switch (role) {
      case 'patient':
        return [
          { id: 'patient-dashboard', label: 'Dashboard', icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
          { id: 'patient-results', label: 'My Results', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
          { id: 'patient-appointments', label: 'Appointments', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
          { id: 'patient-messages', label: 'Messages', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
          { id: 'patient-upload', label: 'Upload Images', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
          { id: 'patient-history', label: 'Case Timeline', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
          { id: 'patient-treatment', label: 'Treatment Plan', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' }
        ];
      case 'dentist':
        return [
          { id: 'dentist-dashboard', label: 'Dashboard', icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z', badge: undefined },
          { id: 'dentist-inbox', label: 'Case Inbox', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4', badge: 3 },
          { id: 'dentist-appointments', label: 'Appointments', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', badge: undefined },
          { id: 'dentist-messages', label: 'Messages', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z', badge: undefined },
          { id: 'dentist-charting', label: 'Clinical Chart', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', badge: undefined },
          { id: 'dentist-treatment', label: 'Treatment Plans', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', badge: undefined },
          { id: 'dentist-pending', label: 'Pending Patients', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', badge: 2 },
          { id: 'dentist-upload', label: 'New Analysis', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12', badge: undefined },
          { id: 'dentist-patients', label: 'My Patients', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', badge: undefined },
          { id: 'dentist-profile', label: 'My Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', badge: undefined }
        ];
      case 'admin':
        return [
          { id: 'admin-dashboard', label: 'Dashboard', icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
          { id: 'admin-analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          { id: 'admin-dentists', label: 'Manage Dentists', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
          { id: 'admin-patients', label: 'All Patients', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
          { id: 'admin-system', label: 'System Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }
        ];
      default:
        return [];
    }
  };

  return (
    <div className="main-app">
      {/* Top Navigation */}
      <nav className="top-nav">
        <div className="nav-left">
          <div className="logo-small">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2C8 2 5 5 5 9c0 2 1 4 2 5v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-6c1-1 2-3 2-5 0-4-3-7-7-7z"/>
            </svg>
          </div>
          <span className="app-title">Dental AI Assistant</span>
        </div>
        <div className="nav-right">
          <div className="security-indicator">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>Encrypted</span>
          </div>
          {userId && (
            <NotificationCenter 
              userId={userId} 
              onNavigate={onViewChange}
            />
          )}
          <div className="user-info">
            <div className={`role-badge ${role}`} id="role-badge">{getRoleLabel()}</div>
            <span id="user-name">{userName}</span>
          </div>
          <button className="btn btn--secondary btn--sm" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {/* Sidebar */}
      <aside className="sidebar" id="sidebar">
        <nav className="sidebar-nav">
          {getSidebarItems().map(item => (
            <a
              key={item.id}
              href="#"
              className={`sidebar-link ${activeView === item.id ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                onViewChange(item.id);
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={item.icon}/>
              </svg>
              <span>{item.label}</span>
              {'badge' in item && item.badge && (
                <span className="sidebar-badge">{item.badge}</span>
              )}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content" id="main-content">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
