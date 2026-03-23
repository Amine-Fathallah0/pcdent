import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import './Toast.css';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

const iconMap: Record<ToastType, string> = {
  success: 'check-circle',
  error: 'x-circle',
  warning: 'alert-triangle',
  info: 'info',
};

const ToastItem = ({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  return (
    <div className={`toast toast--${toast.type}`} role="alert">
      <Icon name={iconMap[toast.type]} size={18} />
      <span className="toast__message">{toast.message}</span>
      <button className="toast__close" onClick={() => onRemove(toast.id)} aria-label="Dismiss">
        <Icon name="x" size={14} />
      </button>
    </div>
  );
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, type, message, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mounted && createPortal(
        <div className="toast-container" aria-live="polite">
          {toasts.map(toast => (
            <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};
