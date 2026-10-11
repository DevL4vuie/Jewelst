import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import NoticeModal from '../components/shared/NoticeModal';
import { Input, Select, Textarea } from '../components/ui/Input';
import StatusChip from '../components/ui/StatusChip';
import DataTable from '../components/shared/DataTable';
import { formatCurrency, getPriceForSaleType } from '../lib/calculationUtils';
import { ShoppingBag, Plus, CheckCircle, Trash2 } from 'lucide-react';

export default function OrdersPage() {
  const { data, addOrder, updateOrderStatus, finalizeOrderToSale } = useData();

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [orderToFinalize, setOrderToFinalize] = useState(null);
  const [finalizePayment, setFinalizePayment] = useState('');
  const [orderError, setOrderError] = useState('');
  const [finalizeError, setFinalizeError] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);

  // New Order Form state
  const [customerId, setCustomerId] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [saleType, setSaleType] = useState('');
  const [orderItems, setOrderItems] = useState([
    { variant_id: '', quantity: '' }
  ]);

  const activeVariants = data.variants.filter(v => !v.archived_at);
  const activeCustomers = data.customers.filter(c => !c.archived_at);

  const getOrderItemPrice = (item) => {
    const variant = activeVariants.find(v => v.id === item.variant_id);
    return getPriceForSaleType(variant, saleType);
  };

  const orderTotal = orderItems.reduce((total, item) => (
    total + getOrderItemPrice(item) * (Number(item.quantity) || 0)
  ), 0);

  const resetOrderForm = () => {
    setOrderNotes('');
    setCustomerId('');
    setSaleType('');
    setOrderItems([{ variant_id: '', quantity: '' }]);
    setFinalizePayment('');
    setOrderError('');
  };

  const handleCreateOrder = (e) => {
    e.preventDefault();
    setOrderError('');

    if (!customerId) {
      setOrderError('Select a customer before creating an order.');
      return;
    }

    if (!saleType) {
      setOrderError('Select a sale type before creating an order.');
      return;
    }

    if (orderItems.length === 0 || orderItems.some(item => (
      !activeVariants.some(variant => variant.id === item.variant_id) ||
      !Number.isInteger(Number(item.quantity)) ||
      Number(item.quantity) < 1
    ))) {
      setOrderError('Choose a valid sandal variant and a quantity of at least one for every item.');
      return;
    }

    setSavingOrder(true);
    try {
      const items = orderItems.map(item => ({
        variant_id: item.variant_id,
        quantity: Number(item.quantity),
        selling_price: getOrderItemPrice(item)
      }));

      addOrder({
        customer_id: customerId,
        status: 'Pending',
        sale_type: saleType,
        total_amount: orderTotal,
        notes: orderNotes,
        items
      });

      setOrderModalOpen(false);
      resetOrderForm();
    } catch (error) {
      console.error('Could not create customer order:', error);
      setOrderError('The order could not be saved. Please try again.');
    } finally {
      setSavingOrder(false);
    }
  };

  const handleAddOrderItem = () => {
    setOrderItems(items => [...items, {
      variant_id: '',
      quantity: ''
    }]);
  };

  const updateOrderItem = (index, updates) => {
    setOrderItems(items => items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...updates } : item
    )));
  };

  const handleOpenFinalize = (order) => {
    setOrderToFinalize(order);
    setFinalizePayment('');
    setFinalizeError('');
    setFinalizeModalOpen(true);
  };

  const handleConfirmFinalize = (e) => {
    e.preventDefault();
    if (!finalizePayment) {
      setFinalizeError('Select a payment method before finalizing the order.');
      return;
    }
    if (orderToFinalize) {
      const finalized = finalizeOrderToSale(orderToFinalize.id, finalizePayment);
      if (finalized !== true) {
        setFinalizeError(typeof finalized === 'string' ? finalized : 'The order could not be finalized.');
        return;
      }
    }
    setFinalizeModalOpen(false);
  };

  const orderRows = data.orders.map(o => {
    const cust = data.customers.find(c => c.id === o.customer_id);
    const itemNames = (o.items || []).map(it => {
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
        <Button
          variant="primary"
          onClick={() => {
            resetOrderForm();
            setOrderModalOpen(true);
          }}
        >
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
            <option value="" disabled>Select a customer</option>
            {activeCustomers.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.phone || 'No phone'})</option>
            ))}
          </Select>

          <Select
            label="Sale Type"
            required
            value={saleType}
            onChange={(e) => setSaleType(e.target.value)}
          >
            <option value="" disabled>Select a sale type</option>
            <option value="Retail">Retail</option>
            <option value="Reseller">Reseller</option>
          </Select>

          <section className="order-items-section">
            <div className="order-items-heading">
              <h3 className="pos-title text-sm">Order Items</h3>
              <Button
                type="button"
                size="sm"
                onClick={handleAddOrderItem}
                disabled={activeVariants.length === 0}
              >
                <Plus size={15} />
                <span>Add Item</span>
              </Button>
            </div>

            {orderItems.map((item, index) => {
              const selectedVariant = activeVariants.find(v => v.id === item.variant_id);
              const design = selectedVariant
                ? data.designs.find(d => d.id === selectedVariant.design_id)
                : null;
              const unitPrice = getOrderItemPrice(item);

              return (
                <div className="order-item-row" key={`order-item-${index}`}>
                  <div className="order-item-row__variant">
                    <Select
                      label="Sandal Product & Size"
                      required
                      value={item.variant_id}
                      disabled={activeVariants.length === 0}
                      onChange={(e) => updateOrderItem(index, { variant_id: e.target.value })}
                    >
                      <option value="" disabled>Select a variant</option>
                      {activeVariants.map(v => {
                        const variantDesign = data.designs.find(d => d.id === v.design_id);
                        return (
                          <option key={v.id} value={v.id}>
                            {variantDesign?.name || 'Design'} - Size {v.size} ({v.color}) - {formatCurrency(getPriceForSaleType(v, saleType))}
                          </option>
                        );
                      })}
                    </Select>
                    {selectedVariant && (
                      <div className="order-item-price">
                        {design?.name || 'Sandal'} · Size {selectedVariant.size} · {formatCurrency(unitPrice)} each
                      </div>
                    )}
                  </div>

                  <div className="order-item-row__quantity">
                    <label className="pos-label" htmlFor={`order-item-quantity-${index}`}>Quantity</label>
                    <input
                      id={`order-item-quantity-${index}`}
                      className="pos-input"
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={item.quantity}
                      onChange={(e) => updateOrderItem(index, { quantity: e.target.value })}
                    />
                  </div>

                  {orderItems.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      className="pos-btn--icon order-item-row__remove"
                      aria-label={`Remove item ${index + 1}`}
                      onClick={() => setOrderItems(items => items.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      <Trash2 size={15} />
                    </Button>
                  )}
                  {orderItems.length === 1 && <span className="order-item-row__remove-space" aria-hidden="true" />}
                </div>
              );
            })}

            <div className="order-total-row">
              <span>Total for {orderItems.reduce((count, item) => count + (Number(item.quantity) || 0), 0)} pair(s)</span>
              <strong>{formatCurrency(orderTotal)}</strong>
            </div>
          </section>

          <Textarea
            label="Order / Delivery Notes"
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="e.g. For pickup on Saturday at boutique, or ship via Grab Express"
          />

          {orderError && (
            <div className="order-form-error" role="alert">{orderError}</div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              onClick={() => {
                setOrderModalOpen(false);
                resetOrderForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={savingOrder || activeVariants.length === 0}>
              {savingOrder ? 'Saving...' : 'Create Order'}
            </Button>
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
                <option value="" disabled>Select a payment method</option>
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
      <NoticeModal
        isOpen={Boolean(finalizeError)}
        onClose={() => setFinalizeError('')}
        title="Could Not Finalize Order"
        message={finalizeError}
      />

    </div>
  );
}
