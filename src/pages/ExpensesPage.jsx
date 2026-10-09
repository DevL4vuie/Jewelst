import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import StatusChip from '../components/ui/StatusChip';
import DataTable from '../components/shared/DataTable';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { formatCurrency } from '../lib/calculationUtils';
import { Receipt, Plus, Edit, Archive } from 'lucide-react';

export default function ExpensesPage() {
  const { data, addExpense, updateExpense, archiveExpense } = useData();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [form, setForm] = useState({
    expense_date: new Date().toISOString().slice(0, 10),
    category: 'Packaging',
    amount: '',
    payment_method: 'Cash',
    description: ''
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [expenseToArchive, setExpenseToArchive] = useState(null);

  const activeExpenses = data.expenses.filter(e => !e.archived_at);

  const totalOpex = activeExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Category breakdown
  const catBreakdown = {};
  activeExpenses.forEach(e => {
    catBreakdown[e.category] = (catBreakdown[e.category] || 0) + Number(e.amount);
  });

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setForm({
      expense_date: new Date().toISOString().slice(0, 10),
      category: 'Packaging',
      amount: '',
      payment_method: 'Cash',
      description: ''
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (e) => {
    setEditingExpense(e);
    setForm({
      expense_date: e.expense_date,
      category: e.category,
      amount: String(e.amount),
      payment_method: e.payment_method || 'Cash',
      description: e.description || ''
    });
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingExpense) {
      updateExpense(editingExpense.id, {
        ...form,
        amount: Number(form.amount) || 0
      });
    } else {
      addExpense({
        ...form,
        amount: Number(form.amount) || 0
      });
    }
    setModalOpen(false);
  };

  const columns = [
    { header: 'Date', accessor: 'expense_date', width: '120px' },
    {
      header: 'Category',
      render: (r) => <StatusChip status="new" label={r.category} />
    },
    { header: 'Description / Purpose', accessor: 'description' },
    { header: 'Paid Via', accessor: 'payment_method', align: 'center', width: '120px' },
    {
      header: 'Amount',
      align: 'right',
      render: (r) => <strong style={{ color: 'var(--coral)' }}>{formatCurrency(r.amount)}</strong>
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
              setExpenseToArchive(r);
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
          <h1 className="pos-title text-2xl" style={{ margin: 0 }}>Operating Expenses (OPEX)</h1>
          <p className="text-sm text-muted font-bold" style={{ margin: '0.2rem 0 0 0' }}>
            Store Rent, Utilities, Packaging, Courier & Marketing Expenditures
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd}>
          <Plus size={18} />
          <span>Record New Expense</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card tape="pink">
          <div className="text-xs text-muted font-bold mb-1">TOTAL OPERATING EXPENSES</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--coral)' }}>
            {formatCurrency(totalOpex)}
          </div>
          <div className="text-xs text-muted mt-1">Deducted from gross profit</div>
        </Card>

        {Object.entries(catBreakdown).slice(0, 3).map(([cat, amount], i) => (
          <Card key={i}>
            <div className="text-xs text-muted font-bold mb-1">{cat.toUpperCase()}</div>
            <div className="text-xl font-bold">{formatCurrency(amount)}</div>
            <div className="text-xs text-muted mt-1">
              {totalOpex > 0 ? `${Math.round((amount / totalOpex) * 100)}% of total OPEX` : ''}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={activeExpenses}
          searchKey="description"
          searchPlaceholder="Search expenses by description..."
          exportFileName="Jewels_Operating_Expenses"
          exportSheetName="Expenses"
        />
      </Card>

      {/* Add / Edit Expense Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingExpense ? 'Edit Expense Record' : 'Record Operating Expense'}
        tape="pink"
      >
        <form onSubmit={handleSave}>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Expense Date"
              type="date"
              required
              value={form.expense_date}
              onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
            />
            <Select
              label="Expense Category"
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="Rent">Rent</option>
              <option value="Utilities">Utilities</option>
              <option value="Advertising">Advertising / Meta Ads</option>
              <option value="Transportation">Transportation / Courier</option>
              <option value="Packaging">Packaging & Ribbons</option>
              <option value="Supplies">Supplies & Store Display</option>
              <option value="Internet">Internet & Telecom</option>
              <option value="Other">Other Operating Expense</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount (₱)"
              type="number"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="e.g. 1500"
            />
            <Select
              label="Paid Via"
              required
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
            >
              <option value="Cash">Cash</option>
              <option value="GCash">GCash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Other">Other</option>
            </Select>
          </div>

          <Textarea
            label="Description / Purpose"
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="e.g. Purchased 200 custom pink dustbags and shipping boxes"
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">
              {editingExpense ? 'Update Expense' : 'Save Expense'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Archive Confirm */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          if (expenseToArchive) archiveExpense(expenseToArchive.id);
        }}
        title="Archive Expense?"
        message="Are you sure you want to archive this expense? It will be hidden from current lists but can be restored from Archived Records."
        confirmText="Archive Expense"
        variant="danger"
      />
    </div>
  );
}
