import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppointmentDto, CounterProposePayload } from '../../lib/backendApi';
import { parseBackendDateTime, toLocalDateInputValue, toLocalTimeInputValue } from '../../lib/dateTime';

interface PendingRequestsWidgetProps {
  appointments: AppointmentDto[];
  userRole: 'patient' | 'dentist';
  onAccept: (id: number) => Promise<void>;
  onDecline: (id: number) => Promise<void>;
  onCounterPropose: (id: number, payload: CounterProposePayload) => Promise<void>;
}

const durations = [30, 45, 60, 90];

const formatDateTime = (iso: string) => {
  const date = parseBackendDateTime(iso);
  const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeLabel = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${dateLabel} at ${timeLabel}`;
};

const PendingRequestsWidget = ({
  appointments,
  userRole,
  onAccept,
  onDecline,
  onCounterPropose,
}: PendingRequestsWidgetProps) => {
  const [activeTab, setActiveTab] = useState<'needs-response' | 'waiting'>('needs-response');
  const [counterForId, setCounterForId] = useState<number | null>(null);
  const [counterDate, setCounterDate] = useState('');
  const [counterTime, setCounterTime] = useState('');
  const [counterDuration, setCounterDuration] = useState(30);
  const [counterNote, setCounterNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const needsResponseStatus = userRole === 'dentist' ? 'pending_dentist' : 'pending_patient';
  const waitingStatus = userRole === 'dentist' ? 'pending_patient' : 'pending_dentist';

  const pending = useMemo(
    () => appointments.filter((appt) => appt.status === 'pending_dentist' || appt.status === 'pending_patient'),
    [appointments],
  );

  const needsResponse = pending.filter((appt) => appt.status === needsResponseStatus);
  const waiting = pending.filter((appt) => appt.status === waitingStatus);

  const prevNeedsResponseCount = useRef(needsResponse.length);
  useEffect(() => {
    if (needsResponse.length > prevNeedsResponseCount.current) {
      setActiveTab('needs-response');
    }
    prevNeedsResponseCount.current = needsResponse.length;
  }, [needsResponse.length]);

  const openCounterForm = (appt: AppointmentDto) => {
    const date = parseBackendDateTime(appt.appointment_date);
    const isoDate = toLocalDateInputValue(date);
    const time = toLocalTimeInputValue(date);
    setCounterForId(appt.id);
    setCounterDate(isoDate);
    setCounterTime(time);
    setCounterDuration(appt.duration || 30);
    setCounterNote(appt.proposal_note || '');
    setError(null);
  };

  const submitCounter = async () => {
    if (!counterForId || !counterDate || !counterTime) {
      setError('Please select a date and time.');
      return;
    }
    try {
      await onCounterPropose(counterForId, {
        appointment_date: `${counterDate}T${counterTime}:00`,
        duration: counterDuration,
        proposal_note: counterNote.trim() || undefined,
      });
      setCounterForId(null);
      setCounterNote('');
      setError(null);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || 'Unable to submit counter proposal.');
    }
  };

  const list = activeTab === 'needs-response' ? needsResponse : waiting;

  return (
    <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: 16, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Pending Requests</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn--sm ${activeTab === 'needs-response' ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => setActiveTab('needs-response')}
          >
            Needs My Response ({needsResponse.length})
          </button>
          <button
            className={`btn btn--sm ${activeTab === 'waiting' ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => setActiveTab('waiting')}
          >
            Waiting ({waiting.length})
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted, #6b7280)' }}>No pending requests.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((appt) => (
            <div key={appt.id} style={{ border: '1px solid var(--color-border, #e5e7eb)', borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {userRole === 'dentist' ? appt.patient.user.full_name : appt.dentist.user.full_name}
                  </div>
                  <div style={{ color: 'var(--color-text-muted, #6b7280)', fontSize: 13 }}>
                    {appt.appointment_type || 'Appointment'} · {formatDateTime(appt.appointment_date)} · {appt.duration} min
                  </div>
                  {appt.proposal_note && (
                    <div style={{ marginTop: 6, fontSize: 13 }}>{appt.proposal_note}</div>
                  )}
                </div>
                {activeTab === 'needs-response' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn--sm btn--success" onClick={() => onAccept(appt.id)}>Accept</button>
                    <button className="btn btn--sm btn--danger-outline" onClick={() => onDecline(appt.id)}>Decline</button>
                    <button className="btn btn--sm btn--outline" onClick={() => openCounterForm(appt)}>Counter</button>
                  </div>
                )}
              </div>

              {counterForId === appt.id && (
                <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                    <input
                      className="form-input"
                      type="date"
                      value={counterDate}
                      onChange={(e) => setCounterDate(e.target.value)}
                    />
                    <input
                      className="form-input"
                      type="time"
                      value={counterTime}
                      onChange={(e) => setCounterTime(e.target.value)}
                    />
                    <select
                      className="form-input"
                      value={counterDuration}
                      onChange={(e) => setCounterDuration(Number(e.target.value))}
                    >
                      {durations.map((value) => (
                        <option key={value} value={value}>{value} min</option>
                      ))}
                    </select>
                  </div>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Optional note"
                    value={counterNote}
                    onChange={(e) => setCounterNote(e.target.value)}
                  />
                  {error && (
                    <div style={{ color: 'var(--color-danger, #dc2626)', fontSize: 13 }}>{error}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn--primary btn--sm" onClick={submitCounter}>Send Counter</button>
                    <button className="btn btn--outline btn--sm" onClick={() => setCounterForId(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingRequestsWidget;
