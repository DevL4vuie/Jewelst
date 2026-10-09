import React from 'react';

export default function StatusChip({
  status = 'pending',
  label,
  className = ''
}) {
  const norm = String(status || '').toLowerCase();
  let variantClass = 'pos-chip--butter';

  if (['paid', 'completed', 'active', 'success', 'ready', 'finalized'].includes(norm)) {
    variantClass = 'pos-chip--mint';
  } else if (['pending', 'preparing', 'waiting', 'draft', 'low'].includes(norm)) {
    variantClass = 'pos-chip--butter';
  } else if (['new', 'info', 'in person', 'online', 'normal'].includes(norm)) {
    variantClass = 'pos-chip--pink';
  } else if (['failed', 'void', 'voided', 'cancelled', 'out of stock', 'danger', 'archived', 'withdrawal'].includes(norm)) {
    variantClass = 'pos-chip--coral';
  }

  return (
    <span className={`pos-chip ${variantClass} ${className}`}>
      {label || status}
    </span>
  );
}
