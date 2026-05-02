import { useState, useEffect, useRef, type JSX } from 'react';
import {
  formatTime,
  formatDate,
  getDayName,
  type Appointment
} from '../../data/database';
import { fetchAppointmentTypeSuggestions } from '../../lib/backendApi';

interface AppointmentSchedulerProps {
  userId: string;
  userRole: 'patient' | 'dentist';
  dentistId?: string;
  patientId?: string;
  dentistPatients?: Array<{ id: string; name: string; email: string }>;
  onCreateAppointment?: (payload: {
    dentistPatientLinkId: number;
    appointmentDate: string;
    appointmentType: string;
    duration: number;
    notes: string | null;
  }) => Promise<Appointment>;
  onClose: () => void;
  onSuccess: (appointment: Appointment) => void;
}

// Icons
const icons: Record<string, JSX.Element> = {
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  clock: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  user: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  x: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  check: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  stethoscope: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
      <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
      <circle cx="20" cy="10" r="2"/>
    </svg>
  ),
  notes: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  chevronLeft: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  chevronRight: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
};

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
];

const durations = [
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' }
];

const AppointmentScheduler = ({ userId: _userId, userRole, dentistPatients = [], onCreateAppointment, onClose, onSuccess }: AppointmentSchedulerProps) => {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [appointmentType, setAppointmentType] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [notes, setNotes] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const typeInputRef = useRef<HTMLInputElement>(null);

  const [selectedPatient, setSelectedPatient] = useState('');

  useEffect(() => {
    fetchAppointmentTypeSuggestions()
      .then(setSuggestions)
      .catch(() => setSuggestions([]));
  }, []);

  const filteredSuggestions = suggestions.filter(s =>
    s.toLowerCase().includes(appointmentType.toLowerCase()) && s !== appointmentType
  );

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const days: (Date | null)[] = [];

    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const isDateDisabled = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = date.getDay();
    return date < today || day === 0 || day === 6;
  };

  const handleDateSelect = (date: Date) => {
    if (!isDateDisabled(date)) {
      setSelectedDate(date.toISOString().split('T')[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || (userRole === 'dentist' && !selectedPatient)) return;

    setIsSubmitting(true);

    if (onCreateAppointment && userRole === 'dentist') {
      try {
        const created = await onCreateAppointment({
          dentistPatientLinkId: Number(selectedPatient),
          appointmentDate: `${selectedDate}T${selectedTime}:00`,
          appointmentType: appointmentType.trim(),
          duration: selectedDuration,
          notes: notes || null,
        });
        setIsSubmitting(false);
        onSuccess(created);
      } catch {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(false);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="modal-container" style={{ display: 'flex' }}>
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="modal appointment-scheduler-modal">
        <div className="modal-header">
          <h2 className="modal-title">
            {icons.calendar}
            <span style={{ marginLeft: '8px' }}>Schedule Appointment</span>
          </h2>
          <button className="close-modal" onClick={onClose}>
            {icons.x}
          </button>
        </div>

        <div className="modal-body">
          {/* Progress Steps */}
          <div className="scheduler-steps">
            <div className={`scheduler-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
              <div className="step-number">{step > 1 ? icons.check : '1'}</div>
              <span>Select Date</span>
            </div>
            <div className="step-line" />
            <div className={`scheduler-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
              <div className="step-number">{step > 2 ? icons.check : '2'}</div>
              <span>Select Time</span>
            </div>
            <div className="step-line" />
            <div className={`scheduler-step ${step >= 3 ? 'active' : ''}`}>
              <div className="step-number">3</div>
              <span>Details</span>
            </div>
          </div>

          {/* Step 1: Date + Patient */}
          {step === 1 && (
            <div className="scheduler-section">
              {userRole === 'dentist' && (
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label">
                    {icons.user}
                    <span style={{ marginLeft: '8px' }}>Select Patient</span>
                  </label>
                  <select
                    className="form-input"
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                  >
                    <option value="">Choose a patient...</option>
                    {dentistPatients.map(patient => (
                      <option key={patient.id} value={patient.id}>{patient.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="calendar-container">
                <div className="calendar-header">
                  <button className="calendar-nav" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
                    {icons.chevronLeft}
                  </button>
                  <h3>{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
                  <button className="calendar-nav" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
                    {icons.chevronRight}
                  </button>
                </div>

                <div className="calendar-weekdays">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="weekday">{day}</div>
                  ))}
                </div>

                <div className="calendar-days">
                  {generateCalendarDays().map((date, index) => (
                    <div key={index} className="calendar-day-wrapper">
                      {date ? (
                        <button
                          className={`calendar-day ${isDateDisabled(date) ? 'disabled' : ''} ${selectedDate === date.toISOString().split('T')[0] ? 'selected' : ''}`}
                          onClick={() => handleDateSelect(date)}
                          disabled={isDateDisabled(date)}
                        >
                          {date.getDate()}
                        </button>
                      ) : (
                        <div className="calendar-day empty" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedDate && (
                <div className="selected-date-display">
                  Selected: <strong>{getDayName(selectedDate)}, {formatDate(selectedDate)}</strong>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Time */}
          {step === 2 && (
            <div className="scheduler-section">
              <div className="selected-date-display" style={{ marginBottom: '24px' }}>
                📅 {getDayName(selectedDate)}, {formatDate(selectedDate)}
              </div>

              <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {icons.clock}
                Available Time Slots
              </h4>

              <div className="time-slots-grid">
                {timeSlots.map(time => (
                  <button
                    key={time}
                    className={`time-slot ${selectedTime === time ? 'selected' : ''}`}
                    onClick={() => setSelectedTime(time)}
                  >
                    {formatTime(time)}
                  </button>
                ))}
              </div>

              {selectedTime && (
                <div className="selected-time-display">
                  Selected: <strong>{formatTime(selectedTime)}</strong>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Details */}
          {step === 3 && (
            <div className="scheduler-section">
              <div className="appointment-summary">
                <div className="summary-item">
                  <span className="summary-icon">{icons.calendar}</span>
                  <span>{getDayName(selectedDate)}, {formatDate(selectedDate)}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-icon">{icons.clock}</span>
                  <span>{formatTime(selectedTime)}</span>
                </div>
              </div>

              {/* Appointment Type — free text with suggestions */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">
                  {icons.stethoscope}
                  <span style={{ marginLeft: '8px' }}>Appointment Type</span>
                </label>
                <input
                  ref={typeInputRef}
                  className="form-input"
                  type="text"
                  value={appointmentType}
                  onChange={(e) => {
                    setAppointmentType(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="e.g. Checkup, Cleaning, Root Canal..."
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <ul style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--color-surface, #fff)',
                    border: '1px solid var(--color-border, #e5e7eb)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 100,
                    margin: 0,
                    padding: '4px 0',
                    listStyle: 'none',
                  }}>
                    {filteredSuggestions.map(s => (
                      <li
                        key={s}
                        onMouseDown={() => {
                          setAppointmentType(s);
                          setShowSuggestions(false);
                        }}
                        style={{
                          padding: '8px 16px',
                          cursor: 'pointer',
                          fontSize: '14px',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-hover, #f3f4f6)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted, #6b7280)', marginTop: '4px' }}>
                  {suggestions.length > 0
                    ? 'Start typing — your common types appear as suggestions.'
                    : 'Type any label. Suggestions appear after you use a type 3+ times.'}
                </p>
              </div>

              {/* Duration */}
              <div className="form-group">
                <label className="form-label">
                  {icons.clock}
                  <span style={{ marginLeft: '8px' }}>Duration</span>
                </label>
                <div className="duration-options">
                  {durations.map(d => (
                    <button
                      key={d.value}
                      className={`duration-option ${selectedDuration === d.value ? 'selected' : ''}`}
                      onClick={() => setSelectedDuration(d.value)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">
                  {icons.notes}
                  <span style={{ marginLeft: '8px' }}>Notes (Optional)</span>
                </label>
                <textarea
                  className="form-input form-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes or special requests..."
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="footer-left">
            {step > 1 && (
              <button className="btn btn--secondary" onClick={() => setStep(step - 1)}>
                {icons.chevronLeft}
                Back
              </button>
            )}
          </div>
          <div className="footer-right">
            <button className="btn btn--outline" onClick={onClose}>Cancel</button>
            {step < 3 ? (
              <button
                className="btn btn--primary"
                onClick={() => setStep(step + 1)}
                disabled={(step === 1 && (!selectedDate || (userRole === 'dentist' && !selectedPatient))) || (step === 2 && !selectedTime)}
              >
                Next
                {icons.chevronRight}
              </button>
            ) : (
              <button
                className="btn btn--primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Scheduling...' : 'Confirm Appointment'}
                {icons.check}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentScheduler;
