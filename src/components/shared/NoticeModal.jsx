import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

export default function NoticeModal({ isOpen, onClose, title = 'Notice', message }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} tape="pink" maxWidth="420px">
      <div className="flex items-start gap-3 mb-6" role="alert">
        <AlertTriangle size={28} style={{ color: 'var(--coral)', flexShrink: 0, marginTop: '2px' }} />
        <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{message}</p>
      </div>
      <div className="flex items-center justify-end gap-3">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={onClose}>Confirm</Button>
      </div>
    </Modal>
  );
}
