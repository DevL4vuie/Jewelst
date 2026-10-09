import React from 'react';
import { X } from 'lucide-react';
import Button from './Button';

export default function Modal({
  isOpen,
  onClose,
  title,
  tape = 'blue',
  children,
  maxWidth = '580px'
}) {
  if (!isOpen) return null;

  return (
    <div className="pos-modal-overlay" onClick={onClose}>
      <div
        className={`pos-modal-dialog ${tape === 'pink' ? 'pos-tape pos-tape--pink' : tape ? 'pos-tape' : ''}`}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="pos-title text-xl">{title}</h2>
          <Button
            size="sm"
            onClick={onClose}
            className="pos-btn--icon"
            aria-label="Close"
          >
            <X size={18} />
          </Button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
