import React from 'react';
import { Printer, CheckCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { formatCurrency } from '../../lib/calculationUtils';

export default function ThermalReceiptModal({
  isOpen,
  onClose,
  saleDetails,
  businessName = "Jewel's Sandals",
  businessDescription = 'Boutique Sandal Management',
  businessAddress = 'Taguig City, Metro Manila',
  businessPhone = '(02) 8888-SANDAL',
  thankYouMessage = 'Thank you for shopping with us!',
  warrantyNote = 'Please keep this receipt for warranty/exchange.',
  receiptType = 'sale'
}) {
  if (!saleDetails) return null;

  const isGiveaway = receiptType === 'giveaway';
  const receiptItems = saleDetails.items?.length
    ? saleDetails.items
    : [{
        productName: saleDetails.productName || 'Sandal Variant',
        variantInfo: saleDetails.variantInfo,
        quantity: saleDetails.quantity || 1,
        selling_price: saleDetails.selling_price || 0
      }];
  const totalAmount = saleDetails.totalAmount ?? receiptItems.reduce(
    (total, item) => total + (Number(item.quantity) || 0) * (Number(item.selling_price) || 0),
    0
  );
  const transactionDateTime = saleDetails.transaction_time
    ? new Date(saleDetails.transaction_time)
    : null;
  const receiptDate = transactionDateTime && !Number.isNaN(transactionDateTime.getTime())
    ? transactionDateTime.toLocaleDateString('en-PH')
    : saleDetails.sale_date || new Date().toLocaleDateString('en-PH');
  const receiptTime = transactionDateTime && !Number.isNaN(transactionDateTime.getTime())
    ? transactionDateTime.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Not recorded';

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receipt Preview" tape="blue">
      <div className="flex flex-col items-center mb-4 text-center">
        <div style={{ color: 'var(--mint)', marginBottom: '0.25rem' }}>
          <CheckCircle size={40} />
        </div>
        <h3 className="pos-title text-lg" style={{ margin: 0 }}>
          {isGiveaway ? 'Giveaway Recorded' : 'Transaction Successful!'}
        </h3>
        <p className="text-sm text-muted" style={{ margin: '0.25rem 0 0 0' }}>
          {isGiveaway
            ? `Receipt for ${saleDetails.sponsorName || 'partner'}`
            : `Receipt generated for sale #${saleDetails.id?.slice(-6) || 'RECEIPT'}`}
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
          {businessDescription && <div>{businessDescription}</div>}
          {businessAddress && <div>{businessAddress}</div>}
          {businessPhone && <div>Tel: {businessPhone}</div>}
        </div>

        <div style={{ borderBottom: '1px dashed #1d2a57', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
          <div>Date: {receiptDate}</div>
          <div>Time: {receiptTime}</div>
          <div>Ref: {saleDetails.transaction_id || saleDetails.order_number || saleDetails.id || 'TXN-' + Date.now()}</div>
          {isGiveaway ? (
            <>
              <div>Partner: {saleDetails.sponsorName || 'Partner'}</div>
              {saleDetails.notes && <div>Campaign: {saleDetails.notes}</div>}
            </>
          ) : (
            <>
              <div>Payment: {saleDetails.payment_method || 'Cash'}</div>
              <div>Channel: {saleDetails.sales_channel || 'In Person'}</div>
            </>
          )}
        </div>

        <div style={{ marginBottom: '0.5rem' }}>
          <div className="flex justify-between font-bold" style={{ borderBottom: '1px solid #1d2a57', paddingBottom: '2px', marginBottom: '4px' }}>
            <span>Item</span>
            <span>{isGiveaway ? 'Qty x Cost' : 'Qty x Price'}</span>
            <span>Total</span>
          </div>

          {receiptItems.map((item, index) => (
            <React.Fragment key={`${item.productName}-${item.variantInfo || ''}-${index}`}>
              <div className="flex justify-between" style={{ padding: '2px 0' }}>
                <span>{item.productName}</span>
                <span>{item.quantity} x {formatCurrency(item.selling_price)}</span>
                <span className="font-bold">{formatCurrency((Number(item.quantity) || 0) * (Number(item.selling_price) || 0))}</span>
              </div>
              {item.variantInfo && (
                <div className="text-xs text-muted" style={{ paddingLeft: '4px' }}>
                  ({item.variantInfo})
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div style={{ borderTop: '1px dashed #1d2a57', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
          <div className="flex justify-between font-bold text-base">
            <span>{isGiveaway ? 'MARKETING COST:' : 'TOTAL AMOUNT:'}</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        <div className="text-center mt-3 text-xs" style={{ borderTop: '1px dashed #1d2a57', paddingTop: '0.5rem' }}>
          {thankYouMessage && <div>{thankYouMessage}</div>}
          {warrantyNote && <div>{warrantyNote}</div>}
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
