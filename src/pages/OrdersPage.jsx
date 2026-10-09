import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import StatusChip from '../components/ui/StatusChip';
import DataTable from '../components/shared/DataTable';
import { formatCurrency } from '../lib/calculationUtils';
import { ShoppingBag, Plus, CheckCircle, Clock } from 'lucide-react';

export default function OrdersPage() {
  const { data, addOrder, updateOrderStatus, finalizeOrderToSale } = useData();

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [orderToFinalize, setOrderToFinalize] = useState(null);
  const [finalizePayment, setFinalizePayment] = useState('GCash');

  // New Order Form state
  const [customerId, setCustomerId] = useState(data.customers[0]?.id || '');
  const [orderNotes, setOrderNotes] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState(data.variants[0]?.id || '');
  const [quantity, setQuantity] = useState('1');

  const activeVariants = data.variants.filter(v => !v.archived_at);
  const activeCustomers = data.customers.filter(c => !c.archived_at);

  const handleCreateOrder = (e) => {
    e.preventDefault();
    const v = data.variants.find(item => item.id === selectedVariantId);
    if (!v) return;

    const qty = Number(quantity) || 1;
    const total = v.selling_price * qty;

    addOrder({
      customer_id: customerId,
      status: 'Pending',
      total_amount: total,
      notes: orderNotes,
      items: [
        { variant_id: v.id, quantity: qty, selling_price: v.selling_price }
      ]
    });

    setOrderModalOpen(false);
    setOrderNotes('');
  };

  const handleOpenFinalize = (order) => {
    setOrderToFinalize(order);
    setFinalizePayment('GCash');
    setFinalizeModalOpen(true);
  };

  const handleConfirmFinalize = (e) => {
    e.preventDefault();
    if (orderToFinalize) {
      finalizeOrderToSale(orderToFinalize.id, finalizePayment);
    }
    setFinalizeModalOpen(false);
  };

  const orderRows = data.orders.map(o => {
    const cust = data.customers.find(c => c.id === o.customer_id);
    const itemNames = o.items.map(it => {
      const v = data.variants.find(item => item.id === it.variant_id);
      const des = v ? data.designs.find(d => d.id === v.design_id) : null;
      return `${des?.name || 'Sandal'} (${it.quantity}x)`;
    }).join(', ');

    return {
      ...o,
      customerName: cust?.name || 'Anonymous',
      customerPhone: cust?.phone || '-',
      itemSummary: itemNames
    };
  });

  const columns = [
    { header: 'Order Ref', accessor: 'order_number', width: '130px' },
    { header: 'Date', accessor: 'order_date', width: '110px' },
    {
      header: 'Customer',
      render: (r) => (
        <div>
          <div className="font-bold text-sm">{r.customerName}</div>
          <div className="text-xs text-muted">{r.customerPhone}</div>
        </div>
      )
    },
    { header: 'Items Reserved', accessor: 'itemSummary' },
    {
      header: 'Total Amount',
      align: 'right',
      render: (r) => <strong style={{ color: 'var(--ink)' }}>{formatCurrency(r.total_amount)}</strong>
    },
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
          {r.status !== 'Completed' && r.status !== 'Cancelled' && (
            <>
              <Button size="sm" variant="success" onClick={() => handleOpenFinalize(r)}>
                <CheckCircle size={14} />
                <span>Complete Sale</span>
              </Button>
              <select
                className="pos-select"
                style={{ minHeight: '34px', fontSize: '0.78rem', width: 'auto', padding: '0 0.4rem' }}
                value={r.status}
                onChange={(e) => updateOrderStatus(r.id, e.target.value)}
              >
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Preparing">Preparing</option>
                <option value="Ready">Ready</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="pos-title text-2xl" style={{ margin: 0 }}>Customer Orders & Reservations</h1>
          <p className="text-sm text-muted font-bold" style={{ margin: '0.2rem 0 0 0' }}>
            Pre-orders, Pickups, Deliveries & Final Sale Conversion
          </p>
        </div>
        <Button variant="primary" onClick={() => setOrderModalOpen(true)}>
          <Plus size={18} />
          <span>New Customer Order</span>
        </Button>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={orderRows}
          searchKey="order_number"
          searchPlaceholder="Search order ref, customer..."
          exportFileName="Jewels_Customer_Orders"
          exportSheetName="Orders"
        />
      </Card>

      {/* New Order Modal */}
      <Modal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        title="Create Customer Reservation"
        tape="pink"
      >
        <form onSubmit={handleCreateOrder}>
          <Select
            label="Customer"
            required
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            {activeCustomers.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.phone || 'No phone'})</option>
            ))}
          </Select>

          <Select
            label="Sandal Product & Size"
            required
            value={selectedVariantId}
            onChange={(e) => setSelectedVariantId(e.target.value)}
          >
            {activeVariants.map(v => {
              const des = data.designs.find(d => d.id === v.design_id);
              return (
                <option key={v.id} value={v.id}>
                  {des?.name || 'Design'} - Size {v.size} ({v.color}) - {formatCurrency(v.selling_price)}
                </option>
              );
            })}
          </Select>

          <Input
            label="Quantity (Pairs)"
            type="number"
            min="1"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />

          <Textarea
            label="Order / Delivery Notes"
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="e.g. For pickup on Saturday at boutique, or ship via Grab Express"
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setOrderModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Order</Button>
          </div>
        </form>
      </Modal>

      {/* Finalize to Sale Modal */}
      <Modal
        isOpen={finalizeModalOpen}
        onClose={() => setFinalizeModalOpen(false)}
        title={`Finalize ${orderToFinalize?.order_number || ''} as Paid Sale`}
        tape="blue"
      >
        {orderToFinalize && (
          <form onSubmit={handleConfirmFinalize}>
            <div className="p-3 mb-4 font-bold text-sm" style={{ background: 'var(--mint-soft)', border: '2px solid var(--ink)', borderRadius: '12px' }}>
              Finalizing will deduct inventory stock and credit {formatCurrency(orderToFinalize.total_amount)} into business revenue.
            </div>

            <Select
              label="Payment Method Collected"
              required
              value={finalizePayment}
              onChange={(e) => setFinalizePayment(e.target.value)}
            >
              <option value="Cash">Cash</option>
              <option value="GCash">GCash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Other">Other</option>
            </Select>

            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={() => setFinalizeModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="success">Finalize & Record Sale</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
