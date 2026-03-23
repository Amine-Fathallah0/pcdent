import { 
  useState, 
  useRef, 
  useCallback, 
  memo,
  type ReactNode,
  type KeyboardEvent
} from 'react';
import { useClickOutside } from '../../hooks';
import Icon from './Icon';
import './Dropdown.css';

interface DropdownOption {
  value: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

const Dropdown = memo(({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  error,
  disabled = false,
  fullWidth = false,
  className = '',
}: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const containerRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false));
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  const handleToggle = useCallback(() => {
    if (!disabled) {
      setIsOpen(prev => !prev);
      setHighlightedIndex(-1);
    }
  }, [disabled]);

  const handleSelect = useCallback((optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  }, [onChange]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          const option = options[highlightedIndex];
          if (!option.disabled) {
            handleSelect(option.value);
          }
        } else {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev => 
            prev < options.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
    }
  }, [disabled, isOpen, highlightedIndex, options, handleSelect]);

  return (
    <div 
      ref={containerRef}
      className={`dropdown ${fullWidth ? 'dropdown--full' : ''} ${className}`}
    >
      {label && <label className="dropdown__label">{label}</label>}
      
      <div
        className={`dropdown__trigger ${isOpen ? 'dropdown__trigger--open' : ''} ${disabled ? 'dropdown__trigger--disabled' : ''} ${error ? 'dropdown__trigger--error' : ''}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={`dropdown__value ${!selectedOption ? 'dropdown__value--placeholder' : ''}`}>
          {selectedOption?.icon && <Icon name={selectedOption.icon} size={16} />}
          {selectedOption?.label || placeholder}
        </span>
        <Icon 
          name={isOpen ? 'chevron-up' : 'chevron-down'} 
          size={16} 
          className="dropdown__chevron" 
        />
      </div>

      {isOpen && (
        <ul
          ref={listRef}
          className="dropdown__menu"
          role="listbox"
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              className={`dropdown__option ${option.value === value ? 'dropdown__option--selected' : ''} ${option.disabled ? 'dropdown__option--disabled' : ''} ${index === highlightedIndex ? 'dropdown__option--highlighted' : ''}`}
              onClick={() => !option.disabled && handleSelect(option.value)}
              onMouseEnter={() => setHighlightedIndex(index)}
              role="option"
              aria-selected={option.value === value}
            >
              {option.icon && <Icon name={option.icon} size={16} />}
              <span>{option.label}</span>
              {option.value === value && (
                <Icon name="check" size={16} className="dropdown__check" />
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <span className="dropdown__error">{error}</span>}
    </div>
  );
});

Dropdown.displayName = 'Dropdown';

export default Dropdown;
