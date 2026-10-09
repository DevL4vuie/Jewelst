import React from 'react';

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
  return (
    <div className="w-full mb-3">
      {label && <label className="pos-label">{label}</label>}
      <select className={`pos-select ${className}`} {...props}>
        {children}
      </select>
      {error && <div className="text-xs text-danger mt-1 font-bold">{error}</div>}
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
