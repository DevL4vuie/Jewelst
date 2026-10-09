import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusChip from '../components/ui/StatusChip';
import DataTable from '../components/shared/DataTable';
import { formatCurrency } from '../lib/calculationUtils';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';

export default function CashFlowPage() {
  const { data } = useData();

  const [filterAccount, setFilterAccount] = useState('all');

  // Build combined chronological ledger of all cash movements
  const ledger = [];

  // Inflows: Sales
  data.sales.forEach(s => {
    if (s.status !== 'Voided') {
      const v = data.variants.find(item => item.id === s.variant_id);
      const des = v ? data.designs.find(d => d.id === v.design_id) : null;
      const amt = Number(s.selling_price) * Number(s.quantity);
      ledger.push({
        id: 'cf-s-' + s.id,
        date: s.sale_date,
        type: 'Inflow',
        category: 'Customer Sale',
        account: s.payment_method || 'Cash',
        description: `Sale: ${s.quantity}x ${des?.name || 'Sandal'}`,
        inflow: amt,
        outflow: 0
      });
    }
  });

  // Inflows & Outflows: Capital Entries
  data.capital_entries.forEach(c => {
    if (!c.archived_at) {
      const amt = Number(c.amount) || 0;
      if (c.entry_type === 'Capital In') {
        ledger.push({
          id: 'cf-c-' + c.id,
          date: c.entry_date,
          type: 'Inflow',
          category: 'Capital Addition',
          account: c.payment_method || 'Bank Transfer',
          description: `Owner Capital Injection: ${c.notes || ''}`,
          inflow: amt,
          outflow: 0
        });
      } else {
        ledger.push({
          id: 'cf-c-' + c.id,
          date: c.entry_date,
          type: 'Outflow',
          category: 'Owner Withdrawal',
          account: c.payment_method || 'Bank Transfer',
          description: `Owner Draw: ${c.notes || ''}`,
          inflow: 0,
          outflow: amt
        });
      }
    }
  });

  // Outflows: Purchases
  data.purchases.forEach(p => {
    if (p.status === 'Finalized') {
      const itemsCost = p.items.reduce((sum, it) => sum + (Number(it.quantity) * Number(it.unit_purchase_price)), 0);
      const expCost = p.expenses.reduce((sum, ex) => sum + Number(ex.amount), 0);
      const totalBatchPaid = itemsCost + expCost;
      ledger.push({
        id: 'cf-p-' + p.id,
        date: p.batch_date,
        type: 'Outflow',
        category: 'Inventory Restock',
        account: 'Bank Transfer',
        description: `Batch payment to ${p.supplier} (${p.items.length} designs)`,
        inflow: 0,
        outflow: totalBatchPaid
      });
    }
  });

  // Outflows: Operating Expenses
  data.expenses.forEach(e => {
    if (!e.archived_at) {
      ledger.push({
        id: 'cf-e-' + e.id,
        date: e.expense_date,
        type: 'Outflow',
        category: 'OPEX (' + e.category + ')',
        account: e.payment_method || 'Cash',
        description: e.description,
        inflow: 0,
        outflow: Number(e.amount) || 0
      });
    }
  });

  // Sort chronologically ascending to calculate running balance, then reverse for display
  ledger.sort((a, b) => new Date(a.date) - new Date(b.date));

  let running = 0;
  ledger.forEach(entry => {
    running += (entry.inflow - entry.outflow);
    entry.runningBalance = running;
  });

  // Reverse so newest entries appear first
  const displayLedger = [...ledger].reverse().filter(item => {
    if (filterAccount === 'all') return true;
    return item.account.toLowerCase() === filterAccount.toLowerCase();
  });

  const totalInflows = ledger.reduce((sum, r) => sum + r.inflow, 0);
  const totalOutflows = ledger.reduce((sum, r) => sum + r.outflow, 0);
  const netCashFlow = totalInflows - totalOutflows;

  // Account balances
  const cashTotal = ledger.filter(r => r.account === 'Cash').reduce((sum, r) => sum + r.inflow - r.outflow, 0);
  const gcashTotal = ledger.filter(r => r.account === 'GCash').reduce((sum, r) => sum + r.inflow - r.outflow, 0);
  const bankTotal = ledger.filter(r => r.account === 'Bank Transfer').reduce((sum, r) => sum + r.inflow - r.outflow, 0);

  const columns = [
    { header: 'Date', accessor: 'date', width: '110px' },
    {
      header: 'Type',
      align: 'center',
      render: (r) => (
        <StatusChip
          status={r.type === 'Inflow' ? 'completed' : 'danger'}
          label={r.type}
        />
      )
    },
    { header: 'Channel / Account', accessor: 'account', align: 'center', width: '120px' },
    {
      header: 'Category & Details',
      render: (r) => (
        <div>
          <div className="font-bold text-sm">{r.category}</div>
          <div className="text-xs text-muted">{r.description}</div>
        </div>
      )
    },
    {
      header: 'Inflow (+)',
      align: 'right',
      render: (r) => r.inflow > 0 ? (
        <span className="font-bold" style={{ color: 'var(--ink)' }}>
          +{formatCurrency(r.inflow)}
        </span>
      ) : '-'
    },
    {
      header: 'Outflow (-)',
      align: 'right',
      render: (r) => r.outflow > 0 ? (
        <span className="font-bold" style={{ color: 'var(--coral)' }}>
          -{formatCurrency(r.outflow)}
        </span>
      ) : '-'
    },
    {
      header: 'Running Balance',
      align: 'right',
      render: (r) => <strong style={{ color: 'var(--ink)' }}>{formatCurrency(r.runningBalance)}</strong>
    }
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="pos-title text-2xl" style={{ margin: 0 }}>Cash Flow Ledger</h1>
          <p className="text-sm text-muted font-bold" style={{ margin: '0.2rem 0 0 0' }}>
            Inflows, Outflows, Account Balances & Running Liquidity
          </p>
        </div>
      </div>

      {/* Account Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card tape="blue">
          <div className="text-xs text-muted font-bold mb-1">TOTAL INFLOWS</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>
            +{formatCurrency(totalInflows)}
          </div>
          <div className="text-xs text-muted mt-1">Sales + Capital In</div>
        </Card>

        <Card tape="pink">
          <div className="text-xs text-muted font-bold mb-1">TOTAL OUTFLOWS</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--coral)' }}>
            -{formatCurrency(totalOutflows)}
          </div>
          <div className="text-xs text-muted mt-1">Purchases + OPEX + Draws</div>
        </Card>

        <Card variant={netCashFlow >= 0 ? 'mint' : 'butter'}>
          <div className="text-xs text-muted font-bold mb-1">NET RUNNING CASH</div>
          <div className="text-2xl font-bold">
            {formatCurrency(netCashFlow)}
          </div>
          <div className="text-xs text-muted mt-1">Total business cash balance</div>
        </Card>

        <Card>
          <div className="text-xs text-muted font-bold mb-1">BY ACCOUNT</div>
          <div className="text-xs font-bold flex flex-col gap-1 mt-1">
            <div className="flex justify-between"><span>Cash Register:</span> <span>{formatCurrency(cashTotal)}</span></div>
            <div className="flex justify-between"><span>GCash Wallet:</span> <span>{formatCurrency(gcashTotal)}</span></div>
            <div className="flex justify-between"><span>Bank Account:</span> <span>{formatCurrency(bankTotal)}</span></div>
          </div>
        </Card>
      </div>

      {/* Ledger Table */}
      <Card>
        <div className="flex justify-between items-center mb-3">
          <div className="font-bold text-sm">CHRONOLOGICAL CASH LEDGER</div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted">Filter Account:</span>
            <select
              className="pos-select"
              style={{ minHeight: '34px', fontSize: '0.8rem', width: 'auto' }}
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
            >
              <option value="all">All Accounts</option>
              <option value="Cash">Cash Only</option>
              <option value="GCash">GCash Only</option>
              <option value="Bank Transfer">Bank Only</option>
            </select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={displayLedger}
          searchKey="description"
          searchPlaceholder="Search transactions..."
          exportFileName="Jewels_Cash_Flow_Ledger"
          exportSheetName="CashFlow"
        />
      </Card>
    </div>
  );
}
