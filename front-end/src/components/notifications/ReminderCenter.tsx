import { useEffect, useRef, useState } from 'react';
import Icon from '../ui/Icon';

export interface ReminderEntry {
  id: string;
  icon: string;
  title: string;
  meta: string;
  done?: boolean;
  actionView?: string;
}

interface ReminderCenterProps {
  reminders: ReminderEntry[];
  onNavigate?: (viewId: string) => void;
}

const ReminderCenter = ({ reminders, onNavigate }: ReminderCenterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pendingCount = reminders.filter((item) => !item.done).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReminderClick = (reminder: ReminderEntry) => {
    if (reminder.actionView && onNavigate) {
      onNavigate(reminder.actionView);
    }
    setIsOpen(false);
  };

  return (
    <div className={`reminder-center ${isOpen ? 'is-open' : ''}`} ref={dropdownRef}>
      <button
        className="reminder-bell"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Reminders"
      >
        <Icon name="clock" size={20} />
        {pendingCount > 0 && (
          <span className="reminder-badge">{pendingCount > 9 ? '9+' : pendingCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="reminder-dropdown">
          <div className="reminder-header">
            <h3>Reminders</h3>
          </div>

          <div className="reminder-list">
            {reminders.length === 0 ? (
              <div className="reminder-empty">
                <div className="empty-icon">
                  <Icon name="clock" size={18} />
                </div>
                <p>No reminders yet</p>
              </div>
            ) : (
              reminders.map((reminder) => (
                <button
                  key={reminder.id}
                  className={`reminder-item ${reminder.done ? 'is-done' : ''}`}
                  onClick={() => handleReminderClick(reminder)}
                  type="button"
                >
                  <span className="reminder-item__icon" aria-hidden="true">
                    <Icon name={reminder.icon} size={16} />
                  </span>
                  <span className="reminder-item__content">
                    <span className="reminder-item__title">{reminder.title}</span>
                    <span className="reminder-item__meta">{reminder.meta}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReminderCenter;
