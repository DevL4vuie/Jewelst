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
import { PiggyBank, Plus, ArrowUpRight, ArrowDownRight, Archive } from 'lucide-react';

export default function CapitalPage() {
  const { data, addCapitalEntry, archiveCapitalEntry, computeFinancials } = useData();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    entry_date: '',
    entry_type: '',
    amount: '',
    payment_method: '',
    notes: ''
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [entryToArchive, setEntryToArchive] = useState(null);

  const activeEntries = data.capital_entries.filter(c => !c.archived_at);

  const fin = computeFinancials();

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.entry_type || !form.payment_method) {
      alert('Select a transaction type and payment method.');
      return;
    }
    addCapitalEntry({
      ...form,
      amount: Number(form.amount) || 0
    });
    setModalOpen(false);
    setForm({
      entry_date: '',
      entry_type: '',
      amount: '',
      payment_method: '',
      notes: ''
    });
  };

  const columns = [
    { header: 'Date', accessor: 'entry_date', width: '120px' },
    {
      header: 'Entry Type',
      align: 'center',
      render: (r) => (
        <StatusChip
          status={r.entry_type === 'Capital In' ? 'completed' : 'withdrawal'}
          label={r.entry_type}
        />
      )
    },
    { header: 'Account / Source', accessor: 'payment_method', align: 'center', width: '130px' },
    {
      header: 'Amount',
      align: 'right',
      render: (r) => (
        <span className="font-bold text-base" style={{ color: r.entry_type === 'Capital In' ? 'var(--ink)' : 'var(--coral)' }}>
          {r.entry_type === 'Capital In' ? '+' : '-'}{formatCurrency(r.amount)}
        </span>
      )
    },
    { header: 'Notes / Source of Funds', accessor: 'notes' },
    {
      header: 'Action',
      align: 'center',
      render: (r) => (
        <Button
          size="sm"
          variant="danger"
          onClick={() => {
            setEntryToArchive(r);
            setConfirmOpen(true);
          }}
        >
          <Archive size={14} />
        </Button>
      )
    }
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="pos-title text-2xl" style={{ margin: 0 }}>Capital & ROI Tracking</h1>
          <p className="text-sm text-muted font-bold" style={{ margin: '0.2rem 0 0 0' }}>
            Capital Injections, Owner Withdrawals & Capital Recovery Tracking
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setForm({ entry_date: '', entry_type: '', amount: '', payment_method: '', notes: '' });
            setModalOpen(true);
          }}
        >
          <Plus size={18} />
          <span>Add Capital Entry</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card tape="blue">
          <div className="text-xs text-muted font-bold mb-1">TOTAL CAPITAL INVESTED</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>
            {formatCurrency(fin.totalCapitalIn)}
          </div>
          <div className="text-xs text-muted mt-1">Total owner funds injected</div>
        </Card>

        <Card variant="butter">
          <div className="text-xs text-muted font-bold mb-1">OWNER WITHDRAWALS</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--coral)' }}>
            {formatCurrency(fin.totalWithdrawals)}
          </div>
          <div className="text-xs text-muted mt-1">Harvested profit & draws</div>
        </Card>

        <Card tape="pink">
          <div className="text-xs text-muted font-bold mb-1">NET ACTIVE CAPITAL</div>
          <div className="text-2xl font-bold">
            {formatCurrency(fin.netCapitalInvested)}
          </div>
          <div className="text-xs text-muted mt-1">Injections minus withdrawals</div>
        </Card>

        <Card variant="mint">
          <div className="text-xs text-muted font-bold mb-1">RETURN ON CAPITAL (ROI)</div>
          <div className="text-2xl font-bold">
            {fin.roi}%
          </div>
          <div className="text-xs text-muted mt-1">Based on Net Profit</div>
        </Card>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={activeEntries}
          searchKey="notes"
          searchPlaceholder="Search notes or source of funds..."
          exportFileName="Jewels_Capital_Ledger"
          exportSheetName="Capital"
        />
      </Card>

      {/* Add Capital Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record Capital Movement"
        tape="blue"
      >
        <form onSubmit={handleSave}>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Transaction Type"
              required
              value={form.entry_type}
              onChange={(e) => setForm({ ...form, entry_type: e.target.value })}
            >
              <option value="" disabled>Select a transaction type</option>
              <option value="Capital In">Capital In (Add Funds)</option>
              <option value="Owner Withdrawal">Owner Withdrawal (Draw)</option>
            </Select>

            <Input
              label="Date"
              type="date"
              required
              value={form.entry_date}
              onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount (₱)"
              type="number"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="e.g. 20000"
            />

            <Select
              label="Payment / Account Method"
              required
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
            >
              <option value="" disabled>Select a payment method</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="GCash">GCash</option>
              <option value="Cash">Cash</option>
              <option value="Other">Other</option>
            </Select>
          </div>

          <Textarea
            label="Notes & Source / Purpose"
            required
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="e.g. Personal savings injection for Christmas stock buildup"
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Record Capital Entry</Button>
          </div>
        </form>
      </Modal>

      {/* Archive Confirm */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          if (entryToArchive) archiveCapitalEntry(entryToArchive.id);
        }}
        title="Archive Capital Entry?"
        message="Are you sure you want to archive this entry? It will be safely stored in Archived Records."
        confirmText="Archive Entry"
        variant="danger"
      />
    </div>
  );
}
