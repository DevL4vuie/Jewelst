import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import StatusChip from '../components/ui/StatusChip';
import DataTable from '../components/shared/DataTable';
import { formatCurrency, calculateLandedCost } from '../lib/calculationUtils';
import { Truck, Plus, Trash2, Eye, DollarSign } from 'lucide-react';

export default function PurchasesPage() {
  const { data, addPurchaseBatch } = useData();

  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedBatchForView, setSelectedBatchForView] = useState(null);

  // New Batch Form State
  const [batchDate, setBatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplier, setSupplier] = useState('');
  const [batchNotes, setBatchNotes] = useState('');

  // Items in batch
  const [batchItems, setBatchItems] = useState([
    { variant_id: data.variants[0]?.id || '', quantity: '20', unit_purchase_price: '350' }
  ]);

  // Batch expenses (Shipping, Packaging, Freight, etc.)
  const [batchExpenses, setBatchExpenses] = useState([
    { type: 'Shipping', amount: '1200', notes: 'Courier cargo delivery' }
  ]);

  const activeVariants = data.variants.filter(v => !v.archived_at);

  const handleAddItemRow = () => {
    setBatchItems(prev => [
      ...prev,
      { variant_id: activeVariants[0]?.id || '', quantity: '10', unit_purchase_price: '350' }
    ]);
  };

  const handleRemoveItemRow = (idx) => {
    setBatchItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddExpenseRow = () => {
    setBatchExpenses(prev => [
      ...prev,
      { type: 'Shipping', amount: '500', notes: '' }
    ]);
  };

  const handleRemoveExpenseRow = (idx) => {
    setBatchExpenses(prev => prev.filter((_, i) => i !== idx));
  };

  // Live totals calculation for form preview
  const totalQuantity = batchItems.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const totalPurchaseCost = batchItems.reduce((sum, it) => sum + ((Number(it.quantity) || 0) * (Number(it.unit_purchase_price) || 0)), 0);
  const totalExpenses = batchExpenses.reduce((sum, ex) => sum + (Number(ex.amount) || 0), 0);
  const totalLandedBatch = totalPurchaseCost + totalExpenses;
  const allocatedExpensePerPair = totalQuantity > 0 ? totalExpenses / totalQuantity : 0;

  const handleSaveBatch = (e) => {
    e.preventDefault();
    if (!supplier.trim()) {
      alert('Please enter a supplier name.');
      return;
    }
    if (batchItems.length === 0) {
      alert('Please add at least one product item to this batch.');
      return;
    }

    addPurchaseBatch({
      batch_date: batchDate,
      supplier,
      notes: batchNotes,
      expenses: batchExpenses.map(ex => ({
        id: 'exp-' + Date.now() + Math.random(),
        type: ex.type,
        amount: Number(ex.amount) || 0,
        notes: ex.notes
      })),
      items: batchItems.map(it => ({
        variant_id: it.variant_id,
        quantity: Number(it.quantity) || 0,
        unit_purchase_price: Number(it.unit_purchase_price) || 0
      }))
    });

    setBatchModalOpen(false);
    // Reset form
    setSupplier('');
    setBatchNotes('');
  };

  const batchesData = data.purchases.map(b => {
    const totalPairs = b.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    const totalBaseCost = b.items.reduce((sum, it) => sum + ((Number(it.quantity) || 0) * (Number(it.unit_purchase_price) || 0)), 0);
    const totalExp = b.expenses.reduce((sum, ex) => sum + (Number(ex.amount) || 0), 0);
    const totalLanded = totalBaseCost + totalExp;

    return {
      ...b,
      totalPairs,
      totalBaseCost,
      totalExp,
      totalLanded
    };
  });

  const columns = [
    { header: 'Batch Date', accessor: 'batch_date', width: '120px' },
    {
      header: 'Supplier',
      render: (r) => (
        <div>
          <div className="font-bold text-sm">{r.supplier}</div>
          <div className="text-xs text-muted">{r.notes || 'No batch notes'}</div>
        </div>
      )
    },
    {
      header: 'Total Pairs',
      align: 'center',
      render: (r) => <span className="font-bold">{r.totalPairs} pairs</span>
    },
    {
      header: 'Base Cost',
      align: 'right',
      render: (r) => formatCurrency(r.totalBaseCost)
    },
    {
      header: 'Batch Expenses',
      align: 'right',
      render: (r) => formatCurrency(r.totalExp)
    },
    {
      header: 'Total Landed Cost',
      align: 'right',
      render: (r) => <strong style={{ color: 'var(--ink)' }}>{formatCurrency(r.totalLanded)}</strong>
    },
    {
      header: 'Status',
      align: 'center',
      render: (r) => <StatusChip status="completed" label={r.status || 'Finalized'} />
    },
    {
      header: 'Action',
      align: 'center',
      render: (r) => (
        <Button
          size="sm"
          variant="default"
          onClick={() => {
            setSelectedBatchForView(r);
            setDetailModalOpen(true);
          }}
        >
          <Eye size={14} />
          <span>View Items</span>
        </Button>
      )
    }
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="pos-title text-2xl" style={{ margin: 0 }}>Restock Purchase Batches</h1>
          <p className="text-sm text-muted font-bold" style={{ margin: '0.2rem 0 0 0' }}>
            Supplier Batches, Expense Allocation & Landed Cost Per Pair
          </p>
        </div>
        <Button variant="primary" onClick={() => setBatchModalOpen(true)}>
          <Plus size={18} />
          <span>New Purchase Batch</span>
        </Button>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={batchesData}
          searchKey="supplier"
          searchPlaceholder="Search by supplier or notes..."
          exportFileName="Jewels_Purchase_Batches"
          exportSheetName="Purchases"
        />
      </Card>

      {/* New Purchase Batch Modal */}
      <Modal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        title="Record New Restock Batch"
        tape="blue"
        maxWidth="720px"
      >
        <form onSubmit={handleSaveBatch}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
            <Input
              label="Batch Date"
              type="date"
              required
              value={batchDate}
              onChange={(e) => setBatchDate(e.target.value)}
            />
            <Input
              label="Supplier / Workshop Name"
              required
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="e.g. Marikina Footwear Artisans"
            />
          </div>

          <Textarea
            label="Batch Notes"
            value={batchNotes}
            onChange={(e) => setBatchNotes(e.target.value)}
            placeholder="Shipment tracker, batch invoice number..."
          />

          {/* Items Section */}
          <div style={{ background: 'var(--light-blue)', padding: '1rem', borderRadius: '14px', border: '2px solid var(--ink)', margin: '1rem 0' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-sm">BATCH ITEMS (PAIRS & BASE UNIT PRICES)</span>
              <Button size="sm" variant="default" onClick={handleAddItemRow} type="button">
                <Plus size={14} /> Add Product Item
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              {batchItems.map((item, idx) => (
                <div key={idx} className="flex flex-wrap items-end gap-2 p-2" style={{ background: 'var(--paper)', borderRadius: '10px', border: '1.5px solid var(--ink)' }}>
                  <div className="flex-1 w-full">
                    <label className="pos-label text-xs">Sandal Variant</label>
                    <select
                      className="pos-select"
                      style={{ minHeight: '38px', fontSize: '0.85rem' }}
                      value={item.variant_id}
                      onChange={(e) => {
                        const updated = [...batchItems];
                        updated[idx].variant_id = e.target.value;
                        setBatchItems(updated);
                      }}
                    >
                      {activeVariants.map(v => {
                        const des = data.designs.find(d => d.id === v.design_id);
                        return (
                          <option key={v.id} value={v.id}>
                            {des?.name || 'Design'} - Size {v.size} ({v.color})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div style={{ minWidth: '80px', flex: '0 0 auto' }}>
                    <label className="pos-label text-xs">Quantity</label>
                    <input
                      type="number"
                      className="pos-input"
                      style={{ minHeight: '38px', fontSize: '0.85rem' }}
                      value={item.quantity}
                      onChange={(e) => {
                        const updated = [...batchItems];
                        updated[idx].quantity = e.target.value;
                        setBatchItems(updated);
                      }}
                    />
                  </div>

                  <div style={{ minWidth: '100px', flex: '0 0 auto' }}>
                    <label className="pos-label text-xs">Unit Purchase Price</label>
                    <input
                      type="number"
                      className="pos-input"
                      style={{ minHeight: '38px', fontSize: '0.85rem' }}
                      value={item.unit_purchase_price}
                      onChange={(e) => {
                        const updated = [...batchItems];
                        updated[idx].unit_purchase_price = e.target.value;
                        setBatchItems(updated);
                      }}
                    />
                  </div>

                  {batchItems.length > 1 && (
                    <Button
                      size="sm"
                      variant="danger"
                      type="button"
                      className="pos-btn--icon"
                      style={{ width: '36px', height: '36px', alignSelf: 'flex-end' }}
                      onClick={() => handleRemoveItemRow(idx)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Batch Expenses (Shipping, tags, etc.) */}
          <div style={{ background: 'var(--butter-soft)', padding: '1rem', borderRadius: '14px', border: '2px solid var(--ink)', marginBottom: '1rem' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-sm">BATCH EXPENSES (ALLOCATED EQUALLY PER PAIR)</span>
              <Button size="sm" variant="default" onClick={handleAddExpenseRow} type="button">
                <Plus size={14} /> Add Batch Expense
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              {batchExpenses.map((exp, idx) => (
                <div key={idx} className="flex flex-wrap items-end gap-2 p-2" style={{ background: 'var(--paper)', borderRadius: '10px', border: '1.5px solid var(--ink)' }}>
                  <div style={{ minWidth: '120px', flex: '1 1 120px' }}>
                    <label className="pos-label text-xs">Expense Type</label>
                    <select
                      className="pos-select"
                      style={{ minHeight: '38px', fontSize: '0.85rem' }}
                      value={exp.type}
                      onChange={(e) => {
                        const updated = [...batchExpenses];
                        updated[idx].type = e.target.value;
                        setBatchExpenses(updated);
                      }}
                    >
                      <option value="Shipping">Shipping</option>
                      <option value="Packaging">Packaging</option>
                      <option value="Tags & Boxes">Tags & Boxes</option>
                      <option value="Transportation">Transportation</option>
                      <option value="Freight Cargo">Freight Cargo</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div style={{ minWidth: '100px', flex: '0 0 auto' }}>
                    <label className="pos-label text-xs">Amount (₱)</label>
                    <input
                      type="number"
                      className="pos-input"
                      style={{ minHeight: '38px', fontSize: '0.85rem' }}
                      value={exp.amount}
                      onChange={(e) => {
                        const updated = [...batchExpenses];
                        updated[idx].amount = e.target.value;
                        setBatchExpenses(updated);
                      }}
                    />
                  </div>

                  <div className="flex-1">
                    <label className="pos-label text-xs">Expense Notes</label>
                    <input
                      type="text"
                      className="pos-input"
                      style={{ minHeight: '38px', fontSize: '0.85rem' }}
                      value={exp.notes}
                      placeholder="e.g. Waybill #12345"
                      onChange={(e) => {
                        const updated = [...batchExpenses];
                        updated[idx].notes = e.target.value;
                        setBatchExpenses(updated);
                      }}
                    />
                  </div>

                  <Button
                    size="sm"
                    variant="danger"
                    type="button"
                    className="pos-btn--icon"
                    style={{ width: '36px', height: '36px', alignSelf: 'flex-end' }}
                    onClick={() => handleRemoveExpenseRow(idx)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Landed Cost Calculation Live Summary */}
          <div style={{ background: 'var(--mint-soft)', padding: '1rem', borderRadius: '14px', border: '2px solid var(--ink)', marginBottom: '1.25rem' }}>
            <div className="font-bold text-sm mb-1">LANDED COST SUMMARY</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
              <div>Total Pairs: <span>{totalQuantity}</span></div>
              <div>Base Cost: <span>{formatCurrency(totalPurchaseCost)}</span></div>
              <div>Allocated Exp / Pair: <span>{formatCurrency(allocatedExpensePerPair)}</span></div>
              <div>Total Landed Batch: <span>{formatCurrency(totalLandedBatch)}</span></div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setBatchModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">
              Finalize & Save Batch ({formatCurrency(totalLandedBatch)})
            </Button>
          </div>
        </form>
      </Modal>

      {/* Batch Details Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`Batch Details - ${selectedBatchForView?.supplier || ''}`}
        tape="pink"
        maxWidth="680px"
      >
        {selectedBatchForView && (
          <div>
            <div className="flex justify-between text-sm font-bold mb-3 p-2" style={{ background: 'var(--light-blue)', borderRadius: '10px' }}>
              <span>Date: {selectedBatchForView.batch_date}</span>
              <span>Total Landed: {formatCurrency(selectedBatchForView.totalLanded)}</span>
            </div>

            <div className="font-bold text-sm mb-2">ITEMS PURCHASED</div>
            <div className="pos-table-wrapper mb-4">
              <table className="pos-table">
                <thead>
                  <tr>
                    <th>Variant</th>
                    <th>Qty</th>
                    <th>Base Price</th>
                    <th>Allocated Exp</th>
                    <th>Landed Cost / Pair</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBatchForView.items.map((it, i) => {
                    const v = data.variants.find(item => item.id === it.variant_id);
                    const des = v ? data.designs.find(d => d.id === v.design_id) : null;
                    return (
                      <tr key={i}>
                        <td className="font-bold">
                          {des?.name || 'Design'} (Size {v?.size || '?'}, {v?.color || '?'})
                        </td>
                        <td>{it.quantity} pairs</td>
                        <td>{formatCurrency(it.unit_purchase_price)}</td>
                        <td>{formatCurrency(it.allocated_expense)}</td>
                        <td className="font-bold" style={{ color: 'var(--ink)' }}>
                          {formatCurrency(it.landed_cost)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {selectedBatchForView.expenses.length > 0 && (
              <div>
                <div className="font-bold text-sm mb-2">BATCH EXPENSES</div>
                <div className="flex flex-col gap-1 mb-4">
                  {selectedBatchForView.expenses.map((ex, i) => (
                    <div key={i} className="flex justify-between text-xs p-2" style={{ background: 'var(--paper)', border: '1px solid var(--ink)', borderRadius: '8px' }}>
                      <span className="font-bold">{ex.type}: {ex.notes || 'Expense'}</span>
                      <span className="font-bold">{formatCurrency(ex.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setDetailModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
