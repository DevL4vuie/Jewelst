import React from 'react';

export default function Button({
  children,
  variant = 'default', // 'default' | 'primary' | 'success' | 'pink' | 'danger'
  size = 'normal', // 'normal' | 'sm' | 'icon'
  tape = false,
  className = '',
  ...props
}) {
  const variantClass = {
    default: '',
    primary: 'pos-btn--primary',
    success: 'pos-btn--success',
    pink: 'pos-btn--pink',
    danger: 'pos-btn--danger'
  }[variant] || '';

  const sizeClass = {
    normal: '',
    sm: 'pos-btn--sm',
    icon: 'pos-btn--icon'
  }[size] || '';

  return (
    <button
      className={`pos-btn ${variantClass} ${sizeClass} ${tape ? 'pos-tape' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
