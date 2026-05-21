import { useEffect, useMemo, useState } from 'react';
import {
  createDentistOverride,
  deleteDentistOverride,
  fetchDentistOverrides,
  fetchDentistSchedule,
  replaceDentistSchedule,
  type DentistAvailabilityOverrideDto,
  type DentistScheduleEntry,
} from '../../lib/backendApi';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DEFAULT_START = '09:00';
const DEFAULT_END = '17:00';

interface ScheduleRow {
  weekday: number;
  enabled: boolean;
  start_time: string;
  end_time: string;
}

const buildDefaultSchedule = (): ScheduleRow[] =>
  Array.from({ length: 7 }, (_, idx) => ({
    weekday: idx,
    enabled: idx < 5,
    start_time: DEFAULT_START,
    end_time: DEFAULT_END,
  }));

const DentistAvailabilityEditor = () => {
  const [schedule, setSchedule] = useState<ScheduleRow[]>(() => buildDefaultSchedule());
  const [overrides, setOverrides] = useState<DentistAvailabilityOverrideDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [overrideDate, setOverrideDate] = useState('');
  const [overrideBlocked, setOverrideBlocked] = useState(false);
  const [overrideStart, setOverrideStart] = useState('');
  const [overrideEnd, setOverrideEnd] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [scheduleEntries, overrideEntries] = await Promise.all([
        fetchDentistSchedule(),
        fetchDentistOverrides(),
      ]);

      setOverrides(overrideEntries);
      if (scheduleEntries.length === 0) {
        setSchedule(buildDefaultSchedule());
        return;
      }
      setSchedule((prev) => {
        const next = prev.map((row) => ({ ...row, enabled: false }));
        for (const entry of scheduleEntries) {
          const idx = entry.weekday;
          const existing = next[idx];
          if (!existing) continue;
          if (!existing.enabled) {
            existing.enabled = true;
            existing.start_time = entry.start_time.slice(0, 5);
            existing.end_time = entry.end_time.slice(0, 5);
          }
        }
        return next;
      });
    } catch (err) {
      console.error(err);
      setError('Unable to load availability.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSaveSchedule = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload: DentistScheduleEntry[] = schedule
        .filter((row) => row.enabled)
        .map((row) => ({
          weekday: row.weekday,
          start_time: row.start_time,
          end_time: row.end_time,
        }));
      await replaceDentistSchedule(payload);
      setMessage('Schedule saved.');
    } catch (err) {
      console.error(err);
      setError('Unable to save schedule.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateOverride = async () => {
    setError(null);
    setMessage(null);
    if (!overrideDate) {
      setError('Please select a date.');
      return;
    }
    if (!overrideBlocked && (!overrideStart || !overrideEnd)) {
      setError('Start and end times are required.');
      return;
    }
    try {
      const payload = {
        date: overrideDate,
        start_time: overrideBlocked ? null : overrideStart,
        end_time: overrideBlocked ? null : overrideEnd,
        is_blocked: overrideBlocked,
        reason: overrideReason,
      };
      const created = await createDentistOverride(payload as Omit<DentistAvailabilityOverrideDto, 'id'>);
      setOverrides((prev) => [created, ...prev]);
      setOverrideDate('');
      setOverrideBlocked(false);
      setOverrideStart('');
      setOverrideEnd('');
      setOverrideReason('');
      setMessage('Override added.');
    } catch (err) {
      console.error(err);
      setError('Unable to add override.');
    }
  };

  const handleDeleteOverride = async (id: number) => {
    try {
      await deleteDentistOverride(id);
      setOverrides((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
      setError('Unable to delete override.');
    }
  };

  const sortedOverrides = useMemo(
    () => [...overrides].sort((a, b) => b.date.localeCompare(a.date)),
    [overrides],
  );

  if (loading) {
    return <p style={{ color: 'var(--color-text-muted, #6b7280)' }}>Loading availability…</p>;
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: 16, padding: 20 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Weekly Schedule</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          {schedule.map((row) => (
            <div key={row.weekday} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 10, alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) => setSchedule((prev) => prev.map((item) =>
                    item.weekday === row.weekday ? { ...item, enabled: e.target.checked } : item
                  ))}
                />
                <span>{WEEKDAYS[row.weekday]}</span>
              </label>
              <input
                className="form-input"
                type="time"
                value={row.start_time}
                disabled={!row.enabled}
                onChange={(e) => setSchedule((prev) => prev.map((item) =>
                  item.weekday === row.weekday ? { ...item, start_time: e.target.value } : item
                ))}
              />
              <input
                className="form-input"
                type="time"
                value={row.end_time}
                disabled={!row.enabled}
                onChange={(e) => setSchedule((prev) => prev.map((item) =>
                  item.weekday === row.weekday ? { ...item, end_time: e.target.value } : item
                ))}
              />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn--primary" onClick={handleSaveSchedule} disabled={saving}>
            {saving ? 'Saving…' : 'Save Schedule'}
          </button>
          {message && <span style={{ color: 'var(--color-success, #10b981)' }}>{message}</span>}
          {error && <span style={{ color: 'var(--color-danger, #dc2626)' }}>{error}</span>}
        </div>
      </div>

      <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: 16, padding: 20 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Date Overrides</h3>
        <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <input
              className="form-input"
              type="date"
              value={overrideDate}
              onChange={(e) => setOverrideDate(e.target.value)}
            />
            <input
              className="form-input"
              type="time"
              value={overrideStart}
              onChange={(e) => setOverrideStart(e.target.value)}
              disabled={overrideBlocked}
            />
            <input
              className="form-input"
              type="time"
              value={overrideEnd}
              onChange={(e) => setOverrideEnd(e.target.value)}
              disabled={overrideBlocked}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={overrideBlocked}
              onChange={(e) => setOverrideBlocked(e.target.checked)}
            />
            Block full day
          </label>
          <input
            className="form-input"
            type="text"
            placeholder="Reason (optional)"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
          />
          <button className="btn btn--outline" onClick={handleCreateOverride}>Add Override</button>
        </div>

        {sortedOverrides.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted, #6b7280)' }}>No overrides yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {sortedOverrides.map((override) => (
              <div key={override.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: 10, padding: 10 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{override.date}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted, #6b7280)' }}>
                    {override.is_blocked
                      ? 'Blocked'
                      : `${override.start_time?.slice(0, 5)} - ${override.end_time?.slice(0, 5)}`}
                    {override.reason ? ` · ${override.reason}` : ''}
                  </div>
                </div>
                <button className="btn btn--sm btn--danger-outline" onClick={() => handleDeleteOverride(override.id)}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DentistAvailabilityEditor;
