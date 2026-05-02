import { useState, type JSX } from 'react';
import {
  formatTime,
  formatDate,
  getRelativeDate,
  getAppointmentTypeLabel,
  getAppointmentStatusClass,
  updateAppointmentStatus,
  type Appointment
} from '../../data/database';

interface AppointmentListProps {
  appointments: Appointment[];
  userRole: 'patient' | 'dentist';
  onRefresh: () => void;
  onScheduleNew?: () => void;
  onUpdateStatus?: (appointmentId: string, status: Appointment['status']) => Promise<void>;
}

// Icons
const icons: Record<string, JSX.Element> = {
  calendar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  clock: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  user: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  check: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  x: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  plus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  mapPin: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  stethoscope: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
      <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
      <circle cx="20" cy="10" r="2"/>
    </svg>
  ),
  empty: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <path d="M8 14h.01"/>
      <path d="M12 14h.01"/>
      <path d="M16 14h.01"/>
      <path d="M8 18h.01"/>
      <path d="M12 18h.01"/>
    </svg>
  )
};

const getTypeIcon = (type: string): JSX.Element => {
  const typeIcons: Record<string, JSX.Element> = {
    checkup: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    cleaning: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2C8 2 5 5 5 9c0 2 1 4 2 5v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-6c1-1 2-3 2-5 0-4-3-7-7-7z"/>
      </svg>
    ),
    treatment: icons.stethoscope,
    consultation: icons.user,
    'follow-up': icons.calendar,
    emergency: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    )
  };
  return typeIcons[type.toLowerCase()] ?? icons.stethoscope;
};

const TYPE_PALETTE = ['#10B981', '#2563EB', '#7C3AED', '#F59E0B', '#6B7280', '#EF4444', '#0891B2', '#D97706', '#059669'];

const getTypeColor = (type: string): string => {
  const knownColors: Record<string, string> = {
    checkup: '#10B981',
    cleaning: '#2563EB',
    treatment: '#7C3AED',
    consultation: '#F59E0B',
    'follow-up': '#6B7280',
    emergency: '#EF4444'
  };
  if (knownColors[type.toLowerCase()]) return knownColors[type.toLowerCase()];
  // Deterministic color for unknown types based on string hash
  let hash = 0;
  for (let i = 0; i < type.length; i++) hash = (hash * 31 + type.charCodeAt(i)) & 0xffff;
  return TYPE_PALETTE[hash % TYPE_PALETTE.length];
};

const AppointmentList = ({ appointments, userRole, onRefresh, onScheduleNew, onUpdateStatus }: AppointmentListProps) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const upcomingAppointments = appointments.filter(a => 
    a.date >= today && (a.status === 'scheduled' || a.status === 'confirmed')
  ).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  const pastAppointments = appointments.filter(a => 
    a.date < today || a.status === 'completed' || a.status === 'cancelled'
  ).sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));

  const displayAppointments = activeTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  const handleConfirm = async (appointmentId: string) => {
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(appointmentId, 'scheduled');
      } else {
        updateAppointmentStatus(appointmentId, 'confirmed');
      }
      setActionFeedback({ type: 'success', message: 'Appointment confirmed!' });
      onRefresh();
      setTimeout(() => setActionFeedback(null), 3000);
    } catch {
      setActionFeedback({ type: 'error', message: 'Unable to confirm appointment.' });
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const handleCancel = async (appointmentId: string) => {
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(appointmentId, 'cancelled');
      } else {
        updateAppointmentStatus(appointmentId, 'cancelled');
      }
      setActionFeedback({ type: 'success', message: 'Appointment cancelled.' });
      onRefresh();
      setTimeout(() => setActionFeedback(null), 3000);
    } catch {
      setActionFeedback({ type: 'error', message: 'Unable to cancel appointment.' });
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const handleComplete = async (appointmentId: string) => {
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(appointmentId, 'completed');
      } else {
        updateAppointmentStatus(appointmentId, 'completed');
      }
      setActionFeedback({ type: 'success', message: 'Appointment marked as completed.' });
      onRefresh();
      setTimeout(() => setActionFeedback(null), 3000);
    } catch {
      setActionFeedback({ type: 'error', message: 'Unable to update appointment.' });
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  return (
    <div className="appointments-container">
      {/* Action Feedback */}
      {actionFeedback && (
        <div className={`action-toast ${actionFeedback.type}`}>
          {actionFeedback.type === 'success' ? icons.check : icons.x}
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="appointments-header">
        <div className="appointments-tabs">
          <button
            className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming
            {upcomingAppointments.length > 0 && (
              <span className="tab-badge">{upcomingAppointments.length}</span>
            )}
          </button>
          <button
            className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past
          </button>
        </div>
        {onScheduleNew && (
          <button className="btn btn--primary" onClick={onScheduleNew}>
            {icons.plus}
            <span>New Appointment</span>
          </button>
        )}
      </div>

      {/* Appointments List */}
      <div className="appointments-list">
        {displayAppointments.length === 0 ? (
          <div className="appointments-empty">
            <div className="empty-icon">{icons.empty}</div>
            <h3>No {activeTab} appointments</h3>
            <p>{activeTab === 'upcoming' ? 'Schedule a new appointment to get started.' : 'Your past appointments will appear here.'}</p>
            {activeTab === 'upcoming' && onScheduleNew && (
              <button className="btn btn--primary" onClick={onScheduleNew}>
                {icons.plus}
                <span>Schedule Appointment</span>
              </button>
            )}
          </div>
        ) : (
          displayAppointments.map(appointment => (
            <div key={appointment.id} className={`appointment-card ${getAppointmentStatusClass(appointment.status)}`}>
              <div className="appointment-date-section">
                <div className="appointment-date-badge">
                  <div className="date-day">{new Date(appointment.date + 'T00:00:00').getDate()}</div>
                  <div className="date-month">{new Date(appointment.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}</div>
                </div>
                <div className="appointment-relative-date">{getRelativeDate(appointment.date)}</div>
              </div>

              <div className="appointment-details">
                <div className="appointment-header-row">
                  <div className="appointment-type" style={{ backgroundColor: `${getTypeColor(appointment.type)}15`, color: getTypeColor(appointment.type) }}>
                    {getTypeIcon(appointment.type)}
                    <span>{getAppointmentTypeLabel(appointment.type)}</span>
                  </div>
                  <span className={`appointment-status-badge ${appointment.status}`}>
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                  </span>
                </div>

                <div className="appointment-info-row">
                  <div className="info-item">
                    {icons.clock}
                    <span>{formatTime(appointment.time)} ({appointment.duration} min)</span>
                  </div>
                  <div className="info-item">
                    {icons.user}
                    <span>{userRole === 'patient' ? appointment.dentistName : appointment.patientName}</span>
                  </div>
                </div>

                {appointment.notes && (
                  <div className="appointment-notes">
                    <span>{appointment.notes}</span>
                  </div>
                )}

                {/* Actions */}
                {activeTab === 'upcoming' && (
                  <div className="appointment-actions">
                    {appointment.status === 'scheduled' && userRole === 'dentist' && (
                      <button className="btn btn--sm btn--success" onClick={() => handleConfirm(appointment.id)}>
                        {icons.check}
                        <span>Confirm</span>
                      </button>
                    )}
                    {userRole === 'dentist' && appointment.status === 'confirmed' && (
                      <button className="btn btn--sm btn--primary" onClick={() => handleComplete(appointment.id)}>
                        {icons.check}
                        <span>Mark Complete</span>
                      </button>
                    )}
                    <button className="btn btn--sm btn--danger-outline" onClick={() => handleCancel(appointment.id)}>
                      {icons.x}
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AppointmentList;
