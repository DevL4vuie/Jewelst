import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input, Textarea } from '../components/ui/Input';
import DataTable from '../components/shared/DataTable';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { formatCurrency } from '../lib/calculationUtils';
import { Users, Plus, Edit, Archive } from 'lucide-react';

export default function CustomersPage() {
  const { data, addCustomer, updateCustomer, archiveCustomer } = useData();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [customerToArchive, setCustomerToArchive] = useState(null);

  const activeCustomers = data.customers.filter(c => !c.archived_at);

  const customerRows = activeCustomers.map(c => {
    // Total sales purchases
    const customerSales = data.sales.filter(s => s.customer_id === c.id && s.status !== 'Voided');
    const totalPurchased = customerSales.reduce((sum, s) => sum + (Number(s.selling_price) * Number(s.quantity)), 0);
    // Total orders count
    const totalOrders = data.orders.filter(o => o.customer_id === c.id).length;

    return {
      ...c,
      totalPurchased,
      totalOrders
    };
  });

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setForm({ name: '', phone: '', address: '', notes: '' });
    setModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCustomer(c);
    setForm({
      name: c.name,
      phone: c.phone || '',
      address: c.address || '',
      notes: c.notes || ''
    });
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingCustomer) {
      updateCustomer(editingCustomer.id, form);
    } else {
      addCustomer(form);
    }
    setModalOpen(false);
  };

  const columns = [
    {
      header: 'Customer Name',
      render: (r) => (
        <div>
          <div className="font-bold text-sm">{r.name}</div>
          <div className="text-xs text-muted">{r.notes || 'No notes'}</div>
        </div>
      )
    },
    { header: 'Phone', accessor: 'phone', width: '140px' },
    { header: 'Delivery Address', accessor: 'address' },
    {
      header: 'Orders Placed',
      align: 'center',
      render: (r) => <span className="font-bold">{r.totalOrders} orders</span>
    },
    {
      header: 'Lifetime Spend',
      align: 'right',
      render: (r) => <strong style={{ color: 'var(--ink)' }}>{formatCurrency(r.totalPurchased)}</strong>
    },
    {
      header: 'Actions',
      align: 'center',
      render: (r) => (
        <div className="flex items-center justify-center gap-1">
          <Button size="sm" variant="default" onClick={() => handleOpenEdit(r)}>
            <Edit size={14} />
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              setCustomerToArchive(r);
              setConfirmOpen(true);
            }}
          >
            <Archive size={14} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="pos-title text-2xl" style={{ margin: 0 }}>Customer Directory</h1>
          <p className="text-sm text-muted font-bold" style={{ margin: '0.2rem 0 0 0' }}>
            Buyer Contact Records, Sizing Notes & Purchase History
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd}>
          <Plus size={18} />
          <span>Add New Customer</span>
        </Button>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={customerRows}
          searchKey="name"
          searchPlaceholder="Search customer by name or phone..."
          exportFileName="Jewels_Customers"
          exportSheetName="Customers"
        />
      </Card>

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCustomer ? 'Edit Customer Info' : 'New Customer Record'}
        tape="pink"
      >
        <form onSubmit={handleSave}>
          <Input
            label="Customer Full Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Maria Santos"
          />

          <Input
            label="Phone Number"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="0917-xxx-xxxx"
          />

          <Input
            label="Address / Delivery Location"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="City, Province or Barangay"
          />

          <Textarea
            label="Preferences & Footwear Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="e.g. Always buys Size 7, loves pastel colors"
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">
              {editingCustomer ? 'Update Customer' : 'Save Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Archive Confirm */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          if (customerToArchive) archiveCustomer(customerToArchive.id);
        }}
        title="Archive Customer?"
        message={`Are you sure you want to archive "${customerToArchive?.name}"? Existing order records will remain safely linked in historical views.`}
        confirmText="Archive Customer"
        variant="danger"
      />
    </div>
  );
}
