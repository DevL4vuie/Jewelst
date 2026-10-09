import React from 'react';
import { Printer, CheckCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { formatCurrency } from '../../lib/calculationUtils';

export default function ThermalReceiptModal({
  isOpen,
  onClose,
  saleDetails,
  businessName = "Jewel's Sandals"
}) {
  if (!saleDetails) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receipt Preview" tape="blue">
      <div className="flex flex-col items-center mb-4 text-center">
        <div style={{ color: 'var(--mint)', marginBottom: '0.25rem' }}>
          <CheckCircle size={40} />
        </div>
        <h3 className="pos-title text-lg" style={{ margin: 0 }}>Transaction Successful!</h3>
        <p className="text-sm text-muted" style={{ margin: '0.25rem 0 0 0' }}>
          Receipt generated for sale #{saleDetails.id?.slice(-6) || 'RECEIPT'}
        </p>
      </div>

      {/* Printable Receipt Paper Container */}
      <div
        id="thermal-receipt-area"
        style={{
          background: '#fff',
          color: '#1d2a57',
          padding: '1.25rem',
          border: '2px dashed var(--ink)',
          borderRadius: '12px',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          marginBottom: '1.25rem'
        }}
      >
        <div className="text-center mb-2">
          <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{businessName}</div>
          <div>Boutique Sandal Management</div>
          <div>Taguig City, Metro Manila</div>
          <div>Tel: (02) 8888-SANDAL</div>
        </div>

        <div style={{ borderBottom: '1px dashed #1d2a57', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
          <div>Date: {saleDetails.sale_date || new Date().toLocaleDateString()}</div>
          <div>Ref: {saleDetails.id || 'TXN-' + Date.now()}</div>
          <div>Payment: {saleDetails.payment_method || 'Cash'}</div>
          <div>Channel: {saleDetails.sales_channel || 'In Person'}</div>
        </div>

        <div style={{ marginBottom: '0.5rem' }}>
          <div className="flex justify-between font-bold" style={{ borderBottom: '1px solid #1d2a57', paddingBottom: '2px', marginBottom: '4px' }}>
            <span>Item</span>
            <span>Qty x Price</span>
            <span>Total</span>
          </div>

          <div className="flex justify-between" style={{ padding: '2px 0' }}>
            <span>{saleDetails.productName || 'Sandal Variant'}</span>
            <span>{saleDetails.quantity} x {formatCurrency(saleDetails.selling_price)}</span>
            <span className="font-bold">{formatCurrency((saleDetails.quantity || 1) * (saleDetails.selling_price || 0))}</span>
          </div>
          {saleDetails.variantInfo && (
            <div className="text-xs text-muted" style={{ paddingLeft: '4px' }}>
              ({saleDetails.variantInfo})
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px dashed #1d2a57', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
          <div className="flex justify-between font-bold text-base">
            <span>TOTAL AMOUNT:</span>
            <span>{formatCurrency((saleDetails.quantity || 1) * (saleDetails.selling_price || 0))}</span>
          </div>
        </div>

        <div className="text-center mt-3 text-xs" style={{ borderTop: '1px dashed #1d2a57', paddingTop: '0.5rem' }}>
          <div>Thank you for shopping with us!</div>
          <div>Please keep this receipt for warranty/exchange.</div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" onClick={handlePrint}>
          <Printer size={16} />
          <span>Print Receipt</span>
        </Button>
      </div>
    </Modal>
  );
}
