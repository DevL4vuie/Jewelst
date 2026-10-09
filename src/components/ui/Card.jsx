import React from 'react';

export default function Card({
  children,
  variant = 'default', // 'default' | 'pink' | 'mint' | 'butter'
  tape = false, // boolean or 'blue' | 'pink'
  className = '',
  ...props
}) {
  let variantClass = '';
  if (variant === 'pink') variantClass = 'pos-card--pink';
  if (variant === 'mint') variantClass = 'pos-card--mint';
  if (variant === 'butter') variantClass = 'pos-card--butter';

  return (
    <div className={`pos-card ${variantClass} ${className}`} {...props}>
      {children}
    </div>
  );
}
