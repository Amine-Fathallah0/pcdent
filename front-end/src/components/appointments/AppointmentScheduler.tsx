import { useState, useEffect, useMemo, type JSX } from 'react';
import {
  fetchAppointmentTypeSuggestions,
  fetchAvailableSlots,
  fetchMyLinks,
  type AppointmentDto,
  type AvailableSlotsResponse,
  type DentistPatientLinkDto,
} from '../../lib/backendApi';

interface AppointmentSchedulerProps {
  userRole: 'patient' | 'dentist';
  dentistPatients?: Array<{ id: string; name: string; email: string }>;
  /**
   * For patients: id of the dentist they want to book with (Dentist PK = User UUID).
   * For dentists: ignored — the link is selected via patient picker.
   */
  defaultDentistId?: string;
  onCreateAppointment: (payload: {
    dentistPatientLinkId: number;
    appointmentDate: string;
    appointmentType: string;
    duration: number;
    notes: string | null;
    proposalNote: string | null;
    forceOverride: boolean;
  }) => Promise<AppointmentDto>;
  onClose: () => void;
  onSuccess: (appointment: AppointmentDto) => void;
}

const icons: Record<string, JSX.Element> = {
  x: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  clock: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  chevronLeft: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  chevronRight: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const durations = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
];

const formatDayLabel = (date: Date, today: Date) => {
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, today)) return 'Today';
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (sameDay(date, tomorrow)) return 'Tomorrow';
  return DAY_LABELS[(date.getDay() + 6) % 7];
};

const toIsoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDisplayTime = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

const VISIBLE_DAYS = 7;
const INITIAL_SLOTS_VISIBLE = 14;

const AppointmentScheduler = ({
  userRole,
  dentistPatients = [],
  defaultDentistId,
  onCreateAppointment,
  onClose,
  onSuccess,
}: AppointmentSchedulerProps) => {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [windowStart, setWindowStart] = useState<Date>(today);
  const [selectedDateIso, setSelectedDateIso] = useState<string>(toIsoDate(today));
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [duration, setDuration] = useState<number>(30);

  const [appointmentType, setAppointmentType] = useState('');
  const [proposalNote, setProposalNote] = useState('');
  const [notes, setNotes] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAllSlots, setShowAllSlots] = useState(false);

  const [selectedPatientLinkId, setSelectedPatientLinkId] = useState<string>('');
  const [resolvedDentistLink, setResolvedDentistLink] = useState<DentistPatientLinkDto | null>(null);
  const [patientLinks, setPatientLinks] = useState<DentistPatientLinkDto[]>([]);
  const [selectedDentistLinkId, setSelectedDentistLinkId] = useState<string>('');

  const [slotsResponse, setSlotsResponse] = useState<AvailableSlotsResponse | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formatDentistLabel = (link: DentistPatientLinkDto, idx: number) => {
    if (link.dentist_name) {
      return link.dentist_name;
    }
    const tail = link.dentist ? link.dentist.slice(-6) : String(link.id);
    return `Dentist ${idx + 1} · ${tail}`;
  };

  // Appointment type suggestions (dentist only — patients leave blank)
  useEffect(() => {
    if (userRole !== 'dentist') return;
    fetchAppointmentTypeSuggestions().then(setSuggestions).catch(() => setSuggestions([]));
  }, [userRole]);

  // Resolve patient → dentist link (the patient must be linked to the chosen dentist)
  useEffect(() => {
    if (userRole !== 'patient') return;
    fetchMyLinks().then((links) => {
      const active = links.filter((l) => l.is_active);
      setPatientLinks(active);
      const match = defaultDentistId
        ? active.find((l) => l.dentist === defaultDentistId)
        : active[0];
      setResolvedDentistLink(match ?? null);
      setSelectedDentistLinkId(match ? String(match.id) : '');
    }).catch(() => setResolvedDentistLink(null));
  }, [userRole, defaultDentistId]);

  // Determine the dentist id for the slot query
  const dentistIdForSlots: string | null = userRole === 'patient'
    ? (resolvedDentistLink?.dentist ?? null)
    : (() => {
        if (!selectedPatientLinkId) return null;
        const match = dentistPatients.find((p) => p.id === selectedPatientLinkId);
        return match?.id ?? null;  // dentistPatients here carries link id, not dentist id — rebuilt below
      })();

  // For dentists we use a different approach: links are passed via dentistPatients (id=link.id).
  // The dentist's own id can be inferred from any link they have (they ARE the dentist).
  // We fetch slots for the dentist (themselves). The simpler path: for dentists, slot queries
  // hit /dentists/<self>/available-slots/. But our endpoint validates dentist===self anyway.
  // We'll piggy-back: if dentist, only proceed when a patient link is chosen, and we'll need
  // the dentist's own user_id. We grab it from /me/.
  const [dentistSelfId, setDentistSelfId] = useState<string | null>(null);
  useEffect(() => {
    if (userRole !== 'dentist') return;
    import('../../lib/backendApi').then(({ fetchMe }) =>
      fetchMe().then((me) => setDentistSelfId(me.user_id))
    );
  }, [userRole]);

  const effectiveDentistId = userRole === 'patient' ? dentistIdForSlots : dentistSelfId;

  // Window of days shown in the carousel
  const visibleDays = useMemo(() => {
    return Array.from({ length: VISIBLE_DAYS }, (_, i) => {
      const d = new Date(windowStart);
      d.setDate(windowStart.getDate() + i);
      return d;
    });
  }, [windowStart]);

  // Fetch slots whenever the date window or duration changes
  useEffect(() => {
    if (!effectiveDentistId) {
      setSlotsResponse(null);
      return;
    }
    const start = visibleDays[0];
    const end = visibleDays[visibleDays.length - 1];
    setSlotsLoading(true);
    setSlotsError(null);
    fetchAvailableSlots(effectiveDentistId, toIsoDate(start), toIsoDate(end), duration)
      .then((resp) => setSlotsResponse(resp))
      .catch(() => setSlotsError('Could not load available slots.'))
      .finally(() => setSlotsLoading(false));
  }, [effectiveDentistId, windowStart, duration, visibleDays]);

  const slotsForSelected = slotsResponse?.slots[selectedDateIso] ?? [];
  const visibleSlots = showAllSlots ? slotsForSelected : slotsForSelected.slice(0, INITIAL_SLOTS_VISIBLE);

  const navigateWindow = (deltaDays: number) => {
    const next = new Date(windowStart);
    next.setDate(windowStart.getDate() + deltaDays);
    if (next < today) return;
    setWindowStart(next);
    setShowAllSlots(false);
    setSelectedTime('');
  };

  const monthLabel = `${MONTH_LABELS[windowStart.getMonth()].slice(0, 3)} ${windowStart.getFullYear()}`;

  const filteredSuggestions = suggestions.filter((s) =>
    s.toLowerCase().includes(appointmentType.toLowerCase()) && s !== appointmentType,
  );

  const canSubmit = (() => {
    if (!selectedDateIso || !selectedTime) return false;
    if (userRole === 'dentist' && !selectedPatientLinkId) return false;
    if (userRole === 'patient' && !resolvedDentistLink) return false;
    return true;
  })();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const linkId = userRole === 'dentist'
      ? Number(selectedPatientLinkId)
      : resolvedDentistLink!.id;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const created = await onCreateAppointment({
        dentistPatientLinkId: linkId,
        appointmentDate: `${selectedDateIso}T${selectedTime}:00`,
        appointmentType: appointmentType.trim(),
        duration,
        notes: notes.trim() || null,
        proposalNote: proposalNote.trim() || null,
        forceOverride: false,
      });
      onSuccess(created);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setSubmitError(detail || 'Could not create appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDateObj = (() => {
    const [y, m, d] = selectedDateIso.split('-').map(Number);
    return new Date(y, m - 1, d);
  })();
  const formattedSelectedDate = selectedDateObj.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  const slotEndTime = (() => {
    if (!selectedTime) return '';
    const [h, m] = selectedTime.split(':').map(Number);
    const start = new Date(2000, 0, 1, h, m);
    const end = new Date(start.getTime() + duration * 60_000);
    return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
  })();

  return (
    <div className="modal-container" style={{ display: 'flex' }}>
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="modal" style={{ maxWidth: 720, maxHeight: '90vh', padding: 0, overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--color-border, #e5e7eb)' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Schedule Appointment</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} aria-label="Close">
            {icons.x}
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {userRole === 'dentist' && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Patient</label>
              <select
                className="form-input"
                value={selectedPatientLinkId}
                onChange={(e) => setSelectedPatientLinkId(e.target.value)}
              >
                <option value="">Choose a patient...</option>
                {dentistPatients.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {userRole === 'patient' && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Dentist</label>
              <select
                className="form-input"
                value={selectedDentistLinkId}
                onChange={(e) => {
                  const linkId = e.target.value;
                  setSelectedDentistLinkId(linkId);
                  const match = patientLinks.find((l) => String(l.id) === linkId) ?? null;
                  setResolvedDentistLink(match);
                  setSelectedTime('');
                  setShowAllSlots(false);
                }}
              >
                <option value="">Choose a dentist...</option>
                {patientLinks.map((link, idx) => (
                  <option key={link.id} value={String(link.id)}>{formatDentistLabel(link, idx)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Card 1: date + time */}
          <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Select Date and Time</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: 999, fontSize: 13 }}>
                <button onClick={() => navigateWindow(-VISIBLE_DAYS)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }} aria-label="Previous week">
                  {icons.chevronLeft}
                </button>
                <span style={{ minWidth: 90, textAlign: 'center' }}>{monthLabel}</span>
                <button onClick={() => navigateWindow(VISIBLE_DAYS)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }} aria-label="Next week">
                  {icons.chevronRight}
                </button>
              </div>
            </div>

            {/* Day carousel */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(7, 1fr) auto', gap: 6, alignItems: 'center', marginBottom: 18 }}>
              <button
                onClick={() => navigateWindow(-VISIBLE_DAYS)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted, #6b7280)' }}
                aria-label="Previous"
              >
                {icons.chevronLeft}
              </button>
              {visibleDays.map((d) => {
                const iso = toIsoDate(d);
                const isPast = d < today;
                const isSelected = iso === selectedDateIso;
                const dayCount = slotsResponse?.slots[iso]?.length ?? 0;
                const noSlots = !slotsLoading && slotsResponse !== null && dayCount === 0;
                return (
                  <button
                    key={iso}
                    onClick={() => {
                      if (isPast) return;
                      setSelectedDateIso(iso);
                      setShowAllSlots(false);
                      setSelectedTime('');
                    }}
                    disabled={isPast}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      padding: '10px 4px',
                      background: 'transparent',
                      border: 'none',
                      cursor: isPast ? 'not-allowed' : 'pointer',
                      color: isPast ? 'var(--color-text-muted, #d1d5db)' : 'inherit',
                      borderBottom: isSelected ? '2px solid var(--color-primary, #10b981)' : '2px solid transparent',
                      fontWeight: isSelected ? 600 : 400,
                      opacity: noSlots && !isSelected ? 0.5 : 1,
                    }}
                  >
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted, #9ca3af)' }}>{formatDayLabel(d, today)}</span>
                    <span style={{ fontSize: 18 }}>{d.getDate()}</span>
                  </button>
                );
              })}
              <button
                onClick={() => navigateWindow(VISIBLE_DAYS)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted, #6b7280)' }}
                aria-label="Next"
              >
                {icons.chevronRight}
              </button>
            </div>

            {/* Time slots grid */}
            <div>
              {slotsLoading && (
                <p style={{ color: 'var(--color-text-muted, #6b7280)', fontSize: 14, margin: '8px 0' }}>Loading slots…</p>
              )}
              {slotsError && (
                <p style={{ color: 'var(--color-danger, #dc2626)', fontSize: 14, margin: '8px 0' }}>{slotsError}</p>
              )}
              {!slotsLoading && !slotsError && slotsForSelected.length === 0 && (
                <p style={{ color: 'var(--color-text-muted, #6b7280)', fontSize: 14, margin: '8px 0' }}>
                  No availability for this day.
                </p>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
                {visibleSlots.map((time) => {
                  const isSelected = time === selectedTime;
                  return (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      style={{
                        padding: '10px 8px',
                        background: isSelected ? 'var(--color-primary, #10b981)' : 'var(--color-surface, #fff)',
                        color: isSelected ? '#fff' : 'inherit',
                        border: '1px solid var(--color-border, #e5e7eb)',
                        borderRadius: 10,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: isSelected ? 600 : 400,
                      }}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
              {slotsForSelected.length > INITIAL_SLOTS_VISIBLE && (
                <button
                  onClick={() => setShowAllSlots((v) => !v)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary, #10b981)', cursor: 'pointer', marginTop: 12, fontSize: 14, fontWeight: 500 }}
                >
                  {showAllSlots ? 'Show fewer slots' : `Show more slots`}
                  <span style={{ color: 'var(--color-text-muted, #6b7280)', fontWeight: 400, marginLeft: 8 }}>
                    ({slotsForSelected.length} available)
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Card 2: currently selected */}
          {selectedTime && (
            <div style={{
              background: 'var(--color-surface, #fff)',
              border: '1px solid var(--color-border, #e5e7eb)',
              borderRadius: 12,
              padding: '14px 18px',
              marginBottom: 16,
              color: 'var(--color-text, #111827)',
            }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary, #6b7280)', marginBottom: 4 }}>Currently Selected:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                {icons.clock}
                <span>{formattedSelectedDate}, {formatDisplayTime(selectedTime)} – {formatDisplayTime(slotEndTime)}</span>
              </div>
            </div>
          )}

          {/* Card 3: details */}
          <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Duration</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {durations.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setDuration(d.value)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 999,
                        border: '1px solid var(--color-border, #e5e7eb)',
                        background: duration === d.value ? 'var(--color-primary, #10b981)' : 'transparent',
                        color: duration === d.value ? '#fff' : 'inherit',
                        cursor: 'pointer',
                        fontSize: 14,
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
                  Appointment Type {userRole === 'patient' && <span style={{ color: 'var(--color-text-muted, #9ca3af)', fontWeight: 400 }}>(optional)</span>}
                </label>
                <input
                  className="form-input"
                  type="text"
                  value={appointmentType}
                  onChange={(e) => { setAppointmentType(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="e.g. Checkup, Cleaning, Root Canal..."
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, margin: 0, padding: '4px 0', listStyle: 'none' }}>
                    {filteredSuggestions.map((s) => (
                      <li
                        key={s}
                        onMouseDown={() => { setAppointmentType(s); setShowSuggestions(false); }}
                        style={{ padding: '8px 16px', cursor: 'pointer', fontSize: 14 }}
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {userRole === 'patient' && (
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
                    Note to Dentist <span style={{ color: 'var(--color-text-muted, #9ca3af)', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    className="form-input"
                    type="text"
                    value={proposalNote}
                    onChange={(e) => setProposalNote(e.target.value)}
                    placeholder="Anything the dentist should know about your request"
                    maxLength={500}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
                  Notes <span style={{ color: 'var(--color-text-muted, #9ca3af)', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any private notes…"
                />
              </div>
            </div>
          </div>

          {submitError && (
            <div style={{ background: 'var(--color-danger-bg, #fee2e2)', color: 'var(--color-danger, #b91c1c)', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 14 }}>
              {submitError}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--color-border, #e5e7eb)' }}>
          <button className="btn btn--outline" onClick={onClose}>Cancel</button>
          <button
            className="btn btn--primary"
            disabled={!canSubmit || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting
              ? 'Sending…'
              : userRole === 'patient' ? 'Send Request' : 'Confirm Appointment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentScheduler;
