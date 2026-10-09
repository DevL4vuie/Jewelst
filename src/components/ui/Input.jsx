import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';

export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="w-full mb-3">
      {label && <label className="pos-label">{label}</label>}
      <input className={`pos-input ${className}`} {...props} />
      {error && <div className="text-xs text-danger mt-1 font-bold">{error}</div>}
    </div>
  );
}

export function Select({ label, error, children, className = '', ...props }) {
  const {
    value,
    defaultValue,
    onChange,
    onBlur,
    onFocus,
    onKeyDown,
    name,
    required,
    disabled,
    id,
    style,
    ...selectProps
  } = props;
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState(null);
  const options = React.Children.toArray(children)
    .filter(child => React.isValidElement(child) && child.type === 'option')
    .map(child => ({
      value: String(child.props.value ?? child.props.children ?? ''),
      label: child.props.children,
      disabled: child.props.disabled || child.props.value === ''
    }));
  const selectedValue = value === undefined
    ? String(defaultValue ?? options[0]?.value ?? '')
    : String(value ?? '');
  const selectedOption = options.find(option => option.value === selectedValue);
  const validationError = required && touched && !selectedValue
    ? 'Please select an option.'
    : '';

  const selectOption = (option) => {
    if (option.disabled) return;
    onChange?.({
      target: { name, value: option.value },
      currentTarget: { name, value: option.value }
    });
    setOpen(false);
    setTouched(true);
    buttonRef.current?.focus();
  };

  const openMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const edgePadding = 8;
    const availableBelow = window.innerHeight - rect.bottom - edgePadding;
    const availableAbove = rect.top - edgePadding;
    const openUp = availableBelow < 180 && availableAbove > availableBelow;
    const availableHeight = openUp ? availableAbove : availableBelow;
    const menuHeight = Math.max(48, Math.min(320, options.length * 44, availableHeight));
    const left = Math.max(edgePadding, Math.min(rect.left, window.innerWidth - rect.width - edgePadding));

    setMenuStyle({
      left,
      width: Math.min(rect.width, window.innerWidth - edgePadding * 2),
      maxHeight: menuHeight,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 })
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (
        !buttonRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const closeOnViewportChange = () => setOpen(false);

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', closeOnViewportChange);
    window.addEventListener('scroll', closeOnViewportChange, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', closeOnViewportChange);
      window.removeEventListener('scroll', closeOnViewportChange, true);
    };
  }, [open]);

  const handleKeyDown = (event) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === 'Escape') {
      setOpen(false);
    } else if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openMenu();
    }
  };

  return (
    <div className="w-full mb-3">
      {label && <label className="pos-label" htmlFor={id} id={id ? `${id}-label` : undefined}>{label}</label>}
      <div className="pos-select-control">
        <button
          ref={buttonRef}
          id={id}
          type="button"
          className={`pos-select pos-select-trigger ${className}`}
          style={style}
          role="combobox"
          aria-labelledby={id ? `${id}-label` : undefined}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={id ? `${id}-options` : undefined}
          aria-invalid={Boolean(error || validationError)}
          aria-required={required || undefined}
          disabled={disabled}
          onClick={() => {
            if (open) {
              setOpen(false);
            } else {
              openMenu();
            }
          }}
          onBlur={(event) => {
            if (
              !event.currentTarget.parentElement?.contains(event.relatedTarget) &&
              !menuRef.current?.contains(event.relatedTarget)
            ) {
              setTouched(true);
              onBlur?.(event);
            }
          }}
          onFocus={onFocus}
          onKeyDown={handleKeyDown}
        >
          <span className="pos-select-trigger__label">
            {selectedOption?.label ?? <span className="pos-select-placeholder">Select an option</span>}
          </span>
          <ChevronDown size={18} aria-hidden="true" />
        </button>

        {open && (
          createPortal(
            <div
              ref={menuRef}
              id={id ? `${id}-options` : undefined}
              className="pos-select-menu"
              style={menuStyle}
              role="listbox"
              aria-labelledby={id ? `${id}-label` : undefined}
            >
              {options.map((option, index) => (
                <button
                  key={`${option.value}-${index}`}
                  type="button"
                  className={`pos-select-option${option.value === selectedValue ? ' selected' : ''}`}
                  role="option"
                  aria-selected={option.value === selectedValue}
                  disabled={option.disabled}
                  onClick={() => selectOption(option)}
                >
                  {option.label}
                </button>
              ))}
            </div>,
            document.body
          )
        )}

        <select
          className="pos-select-native"
          value={selectedValue}
          onChange={onChange}
          name={name}
          required={required}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0
          }}
          {...selectProps}
        >
          {children}
        </select>
      </div>
      {(error || validationError) && (
        <div className="text-xs text-danger mt-1 font-bold">{error || validationError}</div>
      )}
    </div>
  );
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className="w-full mb-3">
      {label && <label className="pos-label">{label}</label>}
      <textarea className={`pos-textarea ${className}`} {...props} />
      {error && <div className="text-xs text-danger mt-1 font-bold">{error}</div>}
    </div>
  );
}
