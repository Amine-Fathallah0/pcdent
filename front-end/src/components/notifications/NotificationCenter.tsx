import { useState, useEffect, useRef, type JSX } from 'react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationDto,
} from '../../lib/backendApi';
import { parseBackendDateTime } from '../../lib/dateTime';
import { useChatSocket, type ChatSocketEvent } from '../../hooks/useChatSocket';

interface NotificationCenterProps {
  userId?: string;
  userRole?: 'patient' | 'dentist' | 'admin';
  onNavigate?: (viewId: string) => void;
  onNotification?: (notification: NotificationDto) => void;
}

// Icons
const icons: Record<string, JSX.Element> = {
  bell: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  appointment: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  case: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  message: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  system: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  reminder: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  checkAll: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 6 9 17 4 12"/>
      <polyline points="22 10 13 21 8 16"/>
    </svg>
  )
};

const getTypeIcon = (type: 'appointment' | 'system') => {
  return icons[type] || icons.system;
};

const getTypeColor = (type: 'appointment' | 'system'): string => {
  const colors: Record<'appointment' | 'system', string> = {
    appointment: '#2563EB',
    system: '#6B7280',
  };
  return colors[type];
};

const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatAppointmentMeta = (notification: NotificationDto) => {
  const summary = notification.appointment_summary;
  if (!summary) return '';
  const date = parseBackendDateTime(summary.appointment_date);
  const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeLabel = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${dateLabel} at ${timeLabel} · ${summary.duration}m`;
};

const describeNotification = (notification: NotificationDto) => {
  const summary = notification.appointment_summary;
  switch (notification.notification_type) {
    case 'appointment_requested':
      return {
        title: 'New appointment request',
        message: summary
          ? `${summary.patient_name} requested ${summary.appointment_type || 'an appointment'} · ${formatAppointmentMeta(notification)}`
          : 'A patient requested a new appointment.',
      };
    case 'appointment_counter_proposed':
      return {
        title: 'Counter proposal received',
        message: summary
          ? `New proposed time for ${summary.appointment_type || 'appointment'} · ${formatAppointmentMeta(notification)}`
          : 'A new appointment time was proposed.',
      };
    case 'appointment_accepted':
      return {
        title: 'Appointment confirmed',
        message: summary
          ? `${summary.appointment_type || 'Appointment'} confirmed · ${formatAppointmentMeta(notification)}`
          : 'An appointment was confirmed.',
      };
    case 'appointment_declined':
      return {
        title: 'Appointment declined',
        message: summary
          ? `${summary.appointment_type || 'Appointment'} was declined.`
          : 'An appointment request was declined.',
      };
    case 'appointment_cancelled':
      return {
        title: 'Appointment cancelled',
        message: summary
          ? `${summary.cancelled_by_role === 'patient' ? 'Patient' : summary.cancelled_by_role === 'dentist' ? 'Dentist' : 'Someone'} cancelled ${summary.appointment_type || 'the appointment'}.`
          : 'An appointment was cancelled.',
      };
    case 'appointment_modified':
      return {
        title: 'Appointment updated',
        message: summary
          ? `Details changed · ${formatAppointmentMeta(notification)}`
          : 'An appointment was updated.',
      };
    default:
      return { title: 'Notification', message: 'You have a new update.' };
  }
};

const NotificationCenter = ({ userId, userRole = 'patient', onNavigate, onNotification }: NotificationCenterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const refreshCounts = (items: NotificationDto[]) => {
    setUnreadCount(items.filter((n) => !n.is_read).length);
  };

  const loadNotifications = () => {
    fetchNotifications().then((items) => {
      setNotifications(items);
      refreshCounts(items);
    }).catch(() => {
      setNotifications([]);
      setUnreadCount(0);
    });
  };

  useEffect(() => {
    if (!userId) return;
    loadNotifications();
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: NotificationDto) => {
    if (!notification.is_read) {
      try {
        const updated = await markNotificationRead(notification.id);
        setNotifications((prev) => {
          const next = prev.map((item) => (item.id === updated.id ? updated : item));
          refreshCounts(next);
          return next;
        });
      } catch {
        // ignore
      }
    }

    if (notification.appointment_summary && onNavigate) {
      const viewId = userRole === 'dentist' ? 'dentist-appointments' : 'patient-appointments';
      onNavigate(viewId);
    }
    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true, read_at: item.read_at ?? new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  useChatSocket({
    enabled: Boolean(userId),
    onEvent: (event: ChatSocketEvent) => {
      if (event.type !== 'notification.new') return;
      onNotification?.(event.notification);
      setNotifications((prev) => {
        const exists = prev.some((item) => item.id === event.notification.id);
        const next = exists ? prev : [event.notification, ...prev];
        refreshCounts(next);
        return next;
      });
    },
  });

  return (
    <div className={`notification-center ${isOpen ? 'is-open' : ''}`} ref={dropdownRef}>
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        {icons.bell}
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className="mark-all-read" onClick={handleMarkAllAsRead}>
                {icons.checkAll}
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <div className="empty-icon">{icons.bell}</div>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => {
                const content = describeNotification(notification);
                const type: 'appointment' | 'system' = notification.notification_type.startsWith('appointment_')
                  ? 'appointment'
                  : 'system';
                return (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div
                    className="notification-icon"
                    style={{ backgroundColor: `${getTypeColor(type)}20`, color: getTypeColor(type) }}
                  >
                    {getTypeIcon(type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{content.title}</div>
                    <div className="notification-message">{content.message}</div>
                    <div className="notification-time">{getRelativeTime(notification.created_at)}</div>
                  </div>
                  {!notification.is_read && <div className="unread-dot" />}
                </div>
              );
            })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
