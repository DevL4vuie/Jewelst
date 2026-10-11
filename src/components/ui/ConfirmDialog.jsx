import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Permanent Deletion',
  message = 'This record will be permanently deleted. This action cannot be undone. Continue?',
  confirmText = 'Permanently Delete',
  variant = 'danger',
  errorMessage = ''
}) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const result = await onConfirm();
      if (result !== false) onClose();
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} tape="pink">
      <div className="flex items-start gap-3 mb-6">
        <div style={{ color: 'var(--coral)', flexShrink: 0, marginTop: '2px' }}>
          <AlertTriangle size={28} />
        </div>
        <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
          {message}
        </p>
      </div>
      {errorMessage && (
        <p role="alert" className="text-sm font-bold mb-4" style={{ color: 'var(--coral)' }}>
          {errorMessage}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button onClick={onClose} disabled={confirming}>
          Cancel
        </Button>
        <Button variant={variant} onClick={handleConfirm} disabled={confirming}>
          {confirming ? 'Deleting...' : confirmText}
        </Button>
      </div>
    </Modal>
  );
}
