import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusChip from '../components/ui/StatusChip';
import DataTable from '../components/shared/DataTable';
import ThermalReceiptModal from '../components/shared/ThermalReceiptModal';
import Modal from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { formatCurrency } from '../lib/calculationUtils';
import { ShoppingBag, Ban, Printer, CheckCircle } from 'lucide-react';

export default function SalesPage() {
  const { data, voidSale } = useData();

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState(null);

  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [saleToVoid, setSaleToVoid] = useState(null);
  const [voidReason, setVoidReason] = useState('Customer exchange / cashier correction');

  const salesRows = data.sales.map(s => {
    const v = data.variants.find(item => item.id === s.variant_id);
    const des = v ? data.designs.find(d => d.id === v.design_id) : null;
    const cust = s.customer_id ? data.customers.find(c => c.id === s.customer_id) : null;
    const grossProfit = (Number(s.selling_price) - Number(s.unit_cost)) * Number(s.quantity);

    return {
      ...s,
      designName: des?.name || 'Unknown Design',
      size: v?.size || '-',
      color: v?.color || '-',
      customerName: cust?.name || 'Walk-in',
      totalAmount: Number(s.selling_price) * Number(s.quantity),
      grossProfit
    };
  });

  const handleOpenVoid = (sale) => {
    setSaleToVoid(sale);
    setVoidReason('Customer returned / cashier error');
    setVoidModalOpen(true);
  };

  const handleConfirmVoid = (e) => {
    e.preventDefault();
    if (saleToVoid) {
      voidSale(saleToVoid.id, voidReason);
    }
    setVoidModalOpen(false);
  };

  const handleReprintReceipt = (r) => {
    setSelectedSaleForReceipt({
      id: r.id,
      sale_date: r.sale_date,
      productName: r.designName,
      variantInfo: `Size ${r.size}, ${r.color}`,
      quantity: r.quantity,
      selling_price: r.selling_price,
      payment_method: r.payment_method,
      sales_channel: r.sales_channel
    });
    setReceiptOpen(true);
  };

  const columns = [
    { header: 'Date', accessor: 'sale_date', width: '110px' },
    {
      header: 'Product / Design',
      render: (r) => (
        <div>
          <div className="font-bold text-sm">{r.designName}</div>
          <div className="text-xs text-muted">Size {r.size} • {r.color}</div>
        </div>
      )
    },
    { header: 'Customer', accessor: 'customerName', width: '130px' },
    { header: 'Qty', accessor: 'quantity', align: 'center', width: '70px' },
    {
      header: 'Selling Price',
      align: 'right',
      render: (r) => formatCurrency(r.selling_price)
    },
    {
      header: 'Total Sale',
      align: 'right',
      render: (r) => <strong style={{ color: 'var(--ink)' }}>{formatCurrency(r.totalAmount)}</strong>
    },
    {
      header: 'Unit Cost',
      align: 'right',
      render: (r) => formatCurrency(r.unit_cost)
    },
    {
      header: 'Gross Profit',
      align: 'right',
      render: (r) => (
        <span className="font-bold" style={{ color: r.status === 'Voided' ? 'var(--coral)' : 'var(--ink)' }}>
          {r.status === 'Voided' ? '₱0.00' : formatCurrency(r.grossProfit)}
        </span>
      )
    },
    { header: 'Payment', accessor: 'payment_method', align: 'center', width: '100px' },
    {
      header: 'Status',
      align: 'center',
      render: (r) => <StatusChip status={r.status} />
    },
    {
      header: 'Actions',
      align: 'center',
      render: (r) => (
        <div className="flex items-center justify-center gap-1">
          <Button size="sm" variant="default" onClick={() => handleReprintReceipt(r)} title="Print Receipt">
            <Printer size={14} />
          </Button>
          {r.status !== 'Voided' && (
            <Button size="sm" variant="danger" onClick={() => handleOpenVoid(r)} title="Void Transaction">
              <Ban size={14} />
              <span>Void</span>
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="pos-title text-2xl" style={{ margin: 0 }}>Sales Transactions & History</h1>
          <p className="text-sm text-muted font-bold" style={{ margin: '0.2rem 0 0 0' }}>
            Historical Sales, Locked Landed Cost, Profit Per Sale & Void Reversals
          </p>
        </div>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={salesRows}
          searchKey="designName"
          searchPlaceholder="Search sales by product, customer..."
          exportFileName="Jewels_Sales_History"
          exportSheetName="Sales"
        />
      </Card>

      {/* Void Dialog */}
      <Modal
        isOpen={voidModalOpen}
        onClose={() => setVoidModalOpen(false)}
        title="Void Completed Sale"
        tape="pink"
      >
        {saleToVoid && (
          <form onSubmit={handleConfirmVoid}>
            <div className="p-3 mb-3" style={{ background: 'var(--coral)', color: 'var(--ink)', borderRadius: '12px', fontWeight: 800 }}>
              Warning: Voiding will reverse this sale from revenue calculations and return the {saleToVoid.quantity} pair(s) back to available stock.
            </div>

            <div className="mb-3 text-sm font-bold">
              Sale Ref: #{saleToVoid.id} • {saleToVoid.designName} (Size {saleToVoid.size}) • {formatCurrency(saleToVoid.totalAmount)}
            </div>

            <Input
              label="Reason for Voiding"
              required
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="e.g. Duplicate entry, wrong variant picked, customer return"
            />

            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={() => setVoidModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="danger">
                Confirm Void Sale
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Receipt Modal */}
      <ThermalReceiptModal
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        saleDetails={selectedSaleForReceipt}
        businessName={data.settings.business_name}
      />
    </div>
  );
}
