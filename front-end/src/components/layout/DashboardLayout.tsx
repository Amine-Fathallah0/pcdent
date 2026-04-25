import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationCenter from '../notifications/NotificationCenter';
import ReminderCenter, { type ReminderEntry } from '../notifications/ReminderCenter';
import api from '../../lib/api';
import ThemeToggle from '../auth/ThemeToggle';

interface DashboardLayoutProps {
  role: 'patient' | 'dentist' | 'admin';
  userName?: string;
  userId?: string;
  children: ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
  reminderItems?: ReminderEntry[];
}

const DashboardLayout = ({
  role,
  userName = 'User',
  userId = '',
  children,
  activeView,
  onViewChange,
  reminderItems = [],
}: DashboardLayoutProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    const lockState = { dashboardLock: true };

    // Create a history barrier so browser Back does not leave the dashboard route.
    window.history.pushState(lockState, '', window.location.href);

    const handlePopState = () => {
      window.history.pushState(lockState, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const clearLocalAuth = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('full_name');
    localStorage.removeItem('user_role');
  };

  const handleLogout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      await api.post('logout/', { refresh });
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
          { id: 'patient-appointments', label: 'Appointments', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
          { id: 'patient-results', label: 'Records', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
          { id: 'patient-messages', label: 'Chat', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
          { id: 'patient-history', label: 'Calendar', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
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
      {/* Sidebar */}
      <aside className="sidebar" id="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-header-top">
            <div className="sidebar-brand">
              <div className="logo-small">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2C8 2 5 5 5 9c0 2 1 4 2 5v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-6c1-1 2-3 2-5 0-4-3-7-7-7z" />
                </svg>
              </div>
              <div className="sidebar-brand__text">
                <p className="sidebar-brand__kicker">Dentalyze</p>
                <p className="sidebar-brand__title">Patient Portal</p>
              </div>
            </div>

            {userId && (
              <div className="sidebar-alerts">
                <div className="sidebar-bell-wrap">
                  <NotificationCenter
                    userId={userId}
                    onNavigate={onViewChange}
                  />
                </div>
                {role === 'patient' && (
                  <div className="sidebar-bell-wrap">
                    <ReminderCenter
                      reminders={reminderItems}
                      onNavigate={onViewChange}
                    />
                  </div>
                )}
              </div>
            )}
          </div>


        </div>

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
              <span className="sidebar-link__label">{item.label}</span>
              {'badge' in item && item.badge && (
                <span className="sidebar-badge">{item.badge}</span>
              )}
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="btn btn--secondary btn--sm btn--full" onClick={handleLogout}>Logout</button>
          <div className="sidebar-footer-controls">
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content" id="main-content">
        {/* Top Bar */}
        <div className="dashboard-topbar">
          <div className="dashboard-topbar__search">
            <svg className="dashboard-topbar__search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="dashboard-topbar__search-input"
              type="search"
              placeholder="Search records, appointments…"
              aria-label="Search"
            />
          </div>
          <div className="dashboard-topbar__right">
            <div className="dashboard-topbar__profile">
              <div className="dashboard-topbar__avatar" aria-hidden="true">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="dashboard-topbar__info">
                <span className="dashboard-topbar__name">{userName}</span>
                <span className="dashboard-topbar__role">{getRoleLabel()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="dashboard-body">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
