import { useEffect, useCallback, type ReactNode, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlay?: boolean;
  showCloseButton?: boolean;
}

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlay = true,
  showCloseButton = true,
}: ModalProps) => {
  const handleEscape = useCallback((e: globalThis.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={closeOnOverlay ? onClose : undefined} role="dialog" aria-modal="true">
      <div
        className={`modal modal--${size}`}
        onClick={e => e.stopPropagation()}
        role="document"
      >
        {(title || showCloseButton) && (
          <div className="modal__header">
            {title && <h2 className="modal__title">{title}</h2>}
            {showCloseButton && (
              <button className="modal__close" onClick={onClose} aria-label="Close modal">
                <Icon name="x" size={20} />
              </button>
            )}
          </div>
        )}
        <div className="modal__body">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
