import React, { useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import StatusChip from '../components/ui/StatusChip';
import DataTable from '../components/shared/DataTable';
import { UserCheck, Plus, Shield, User, Key } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([
    { id: 'u-1', full_name: 'Jewel (Owner)', email: 'owner@jewelssandals.ph', role: 'Admin', status: 'Active' },
    { id: 'u-2', full_name: 'Ana Cashier', email: 'cashier@jewelssandals.ph', role: 'Cashier', status: 'Active' },
    { id: 'u-3', full_name: 'Mark Stockkeeper', email: 'stock@jewelssandals.ph', role: 'Staff', status: 'Active' }
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', role: 'Cashier' });

  const handleAddUser = (e) => {
    e.preventDefault();
    setUsers(prev => [
      ...prev,
      { ...form, id: 'u-' + Date.now(), status: 'Active' }
    ]);
    setModalOpen(false);
    setForm({ full_name: '', email: '', role: 'Cashier' });
  };

  const columns = [
    {
      header: 'Staff Member',
      render: (r) => (
        <div>
          <div className="font-bold text-sm">{r.full_name}</div>
          <div className="text-xs text-muted">{r.email}</div>
        </div>
      )
    },
    {
      header: 'Assigned Role',
      align: 'center',
      render: (r) => (
        <StatusChip
          status={r.role === 'Admin' ? 'completed' : r.role === 'Cashier' ? 'new' : 'pending'}
          label={r.role}
        />
      )
    },
    {
      header: 'Permissions Scope',
      render: (r) => (
        <span className="text-xs font-bold text-muted">
          {r.role === 'Admin' ? 'Full Access: POS, Inventory, Purchases, Expenses, Financials & Reports' :
           r.role === 'Cashier' ? 'POS Terminal, Customer Walk-in Sales & Receipts only' :
           'Inventory Counting, Variant Inspection & Receiving only'}
        </span>
      )
    },
    {
      header: 'Status',
      align: 'center',
      render: (r) => <StatusChip status="completed" label={r.status} />
    }
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="pos-title text-2xl" style={{ margin: 0 }}>Staff & Access Control</h1>
          <p className="text-sm text-muted font-bold" style={{ margin: '0.2rem 0 0 0' }}>
            System Users, Role-Based Access Guards & Authorization
          </p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          <Plus size={18} />
          <span>Add Staff Account</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card tape="blue">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} />
            <span className="font-bold text-sm">ADMINISTRATOR</span>
          </div>
          <p className="text-xs text-muted font-bold">
            Full management of stock purchases, operating expenses, capital tracking, voiding, and permanent deletion.
          </p>
        </Card>

        <Card tape="pink">
          <div className="flex items-center gap-2 mb-1">
            <User size={18} />
            <span className="font-bold text-sm">CASHIER</span>
          </div>
          <p className="text-xs text-muted font-bold">
            Counter sales checkout, scanning footwear variants, issuing thermal receipts and receiving payments.
          </p>
        </Card>

        <Card variant="butter">
          <div className="flex items-center gap-2 mb-1">
            <Key size={18} />
            <span className="font-bold text-sm">STAFF / WAREHOUSE</span>
          </div>
          <p className="text-xs text-muted font-bold">
            Viewing inventory levels, restocking assistance, and packaging customer orders.
          </p>
        </Card>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={users}
          searchKey="full_name"
          searchPlaceholder="Search staff by name or email..."
          exportFileName="Jewels_Users_Directory"
          exportSheetName="Users"
        />
      </Card>

      {/* Add Staff Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Staff User"
        tape="pink"
      >
        <form onSubmit={handleAddUser}>
          <Input
            label="Staff Full Name"
            required
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="e.g. Maria Cashier"
          />

          <Input
            label="Email Address"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="staff@jewelssandals.ph"
          />

          <Select
            label="System Role"
            required
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="Cashier">Cashier</option>
            <option value="Staff">Warehouse Staff</option>
            <option value="Admin">Administrator (Owner)</option>
          </Select>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Staff User</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
