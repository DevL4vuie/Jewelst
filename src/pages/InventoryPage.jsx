import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import StatusChip from '../components/ui/StatusChip';
import DataTable from '../components/shared/DataTable';
import { formatCurrency } from '../lib/calculationUtils';
import { Boxes, Sliders, AlertTriangle, ArrowUpDown, Plus } from 'lucide-react';

export default function InventoryPage() {
  const { data, getVariantStock, getVariantCost, addStockAdjustment } = useData();

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedVariantForAdj, setSelectedVariantForAdj] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    quantity_change: '1',
    reason: 'Correction',
    notes: ''
  });

  // Prepare inventory rows
  const inventoryRows = data.variants.map((v) => {
    const design = data.designs.find(d => d.id === v.design_id);
    const category = design ? data.categories.find(c => c.id === design.category_id) : null;
    const stock = getVariantStock(v.id);
    const cost = getVariantCost(v.id);
    const stockValue = stock * cost;

    let status = 'In Stock';
    if (stock <= 0) status = 'Out of Stock';
    else if (stock <= v.reorder_level) status = 'Low Stock';

    return {
      id: v.id,
      designId: v.design_id,
      designName: design?.name || 'Unknown Design',
      categoryName: category?.name || 'General',
      size: v.size,
      color: v.color,
      stock,
      cost,
      selling_price: v.selling_price,
      stockValue,
      reorder_level: v.reorder_level,
      status,
      archived_at: v.archived_at
    };
  }).filter(item => !item.archived_at);

  const totalStockCount = inventoryRows.reduce((sum, r) => sum + r.stock, 0);
  const totalInventoryValue = inventoryRows.reduce((sum, r) => sum + r.stockValue, 0);

  const handleOpenAdjust = (row) => {
    setSelectedVariantForAdj(row);
    setAdjustForm({
      quantity_change: '1',
      reason: 'Recount',
      notes: ''
    });
    setAdjustModalOpen(true);
  };

  const handleSaveAdjustment = (e) => {
    e.preventDefault();
    if (!selectedVariantForAdj) return;

    addStockAdjustment({
      adjust_date: new Date().toISOString().slice(0, 10),
      variant_id: selectedVariantForAdj.id,
      quantity_change: Number(adjustForm.quantity_change) || 0,
      reason: adjustForm.reason,
      notes: adjustForm.notes
    });

    setAdjustModalOpen(false);
  };

  const columns = [
    {
      header: 'Design & Category',
      render: (r) => (
        <div>
          <div className="font-bold text-sm">{r.designName}</div>
          <div className="text-xs text-muted">{r.categoryName}</div>
        </div>
      )
    },
    { header: 'Size', accessor: 'size', align: 'center', width: '80px' },
    { header: 'Color', accessor: 'color', width: '120px' },
    {
      header: 'Stock On Hand',
      align: 'center',
      render: (r) => (
        <span className="font-bold text-base" style={{ color: r.stock <= r.reorder_level ? 'var(--coral)' : 'var(--ink)' }}>
          {r.stock} pairs
        </span>
      )
    },
    {
      header: 'Landed Cost',
      align: 'right',
      render: (r) => formatCurrency(r.cost)
    },
    {
      header: 'Selling Price',
      align: 'right',
      render: (r) => formatCurrency(r.selling_price)
    },
    {
      header: 'Total Stock Value',
      align: 'right',
      render: (r) => <strong style={{ color: 'var(--ink)' }}>{formatCurrency(r.stockValue)}</strong>
    },
    {
      header: 'Status',
      align: 'center',
      render: (r) => <StatusChip status={r.status} />
    },
    {
      header: 'Action',
      align: 'center',
      render: (r) => (
        <Button size="sm" variant="default" onClick={() => handleOpenAdjust(r)}>
          <Sliders size={14} />
          <span>Adjust</span>
        </Button>
      )
    }
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="pos-title text-2xl" style={{ margin: 0 }}>Inventory Stock On Hand</h1>
          <p className="text-sm text-muted font-bold" style={{ margin: '0.2rem 0 0 0' }}>
            Live Variant Stock, Weighted Landed Cost & Valuation
          </p>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card tape="blue">
          <div className="text-xs text-muted font-bold mb-1">TOTAL PAIRS IN STOCK</div>
          <div className="text-2xl font-bold">{totalStockCount} pairs</div>
          <div className="text-xs text-muted mt-1">Across all sandal variants</div>
        </Card>

        <Card tape="pink">
          <div className="text-xs text-muted font-bold mb-1">TOTAL INVENTORY CAPITAL VALUE</div>
          <div className="text-2xl font-bold">{formatCurrency(totalInventoryValue)}</div>
          <div className="text-xs text-muted mt-1">At weighted average landed cost</div>
        </Card>

        <Card variant="butter">
          <div className="text-xs text-muted font-bold mb-1">LOW STOCK VARIANTS</div>
          <div className="text-2xl font-bold">
            {inventoryRows.filter(r => r.stock <= r.reorder_level).length} variants
          </div>
          <div className="text-xs font-bold mt-1">Need supplier reorder</div>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <DataTable
          columns={columns}
          data={inventoryRows}
          searchKey="designName"
          searchPlaceholder="Search sandals by design, color..."
          exportFileName="Jewels_Sandal_Inventory"
          exportSheetName="Inventory"
        />
      </Card>

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title="Manual Stock Adjustment"
        tape="pink"
      >
        {selectedVariantForAdj && (
          <form onSubmit={handleSaveAdjustment}>
            <div className="p-3 mb-4" style={{ background: 'var(--light-blue)', border: '2px solid var(--ink)', borderRadius: '12px' }}>
              <div className="font-bold text-sm">{selectedVariantForAdj.designName}</div>
              <div className="text-xs text-muted">
                Size {selectedVariantForAdj.size} • Color: {selectedVariantForAdj.color}
              </div>
              <div className="text-xs font-bold mt-1">
                Current Stock: {selectedVariantForAdj.stock} pairs
              </div>
            </div>

            <Input
              label="Quantity Change (use positive e.g. 2 to add, negative e.g. -1 to subtract)"
              type="number"
              required
              value={adjustForm.quantity_change}
              onChange={(e) => setAdjustForm({ ...adjustForm, quantity_change: e.target.value })}
            />

            <Select
              label="Adjustment Reason"
              required
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
            >
              <option value="Recount">Recount (Physical Audit)</option>
              <option value="Damaged">Damaged Goods</option>
              <option value="Lost">Lost / Missing</option>
              <option value="Found">Found Unrecorded Stock</option>
              <option value="Correction">Data Entry Correction</option>
              <option value="Other">Other</option>
            </Select>

            <Textarea
              label="Reason Notes / Audit Details"
              value={adjustForm.notes}
              onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
              placeholder="e.g. Broken sole strap found during weekly warehouse inspection"
            />

            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={() => setAdjustModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">
                Apply Stock Adjustment
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
