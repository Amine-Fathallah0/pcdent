import { memo, forwardRef, type InputHTMLAttributes } from 'react';
import './Toggle.css';

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
}

const Toggle = forwardRef<HTMLInputElement, ToggleProps>(({
  checked,
  onChange,
  label,
  description,
  disabled,
  id,
  ...props
}, ref) => {
  const toggleId = id || `toggle-${Math.random().toString(36).slice(2)}`;

  return (
    <div className={`toggle-wrapper ${disabled ? 'toggle-wrapper--disabled' : ''}`}>
      <label htmlFor={toggleId} className="toggle">
        <input
          ref={ref}
          type="checkbox"
          id={toggleId}
          className="toggle__input"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          {...props}
        />
        <span className="toggle__slider">
          <span className="toggle__knob" />
        </span>
      </label>
      {(label || description) && (
        <div className="toggle__content">
          {label && (
            <label htmlFor={toggleId} className="toggle__label">
              {label}
            </label>
          )}
          {description && (
            <span className="toggle__description">{description}</span>
          )}
        </div>
      )}
    </div>
  );
});

Toggle.displayName = 'Toggle';

export default memo(Toggle);
