import { memo } from 'react';
import './Spinner.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Spinner = memo(({ size = 'md', className = '' }: SpinnerProps) => (
  <div className={`spinner spinner--${size} ${className}`} role="status" aria-label="Loading">
    <svg viewBox="0 0 50 50">
      <circle cx="25" cy="25" r="20" fill="none" strokeWidth="4" />
    </svg>
  </div>
));

Spinner.displayName = 'Spinner';

export default Spinner;
