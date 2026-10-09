import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusChip from '../components/ui/StatusChip';
import { formatCurrency } from '../lib/calculationUtils';
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  Clock,
  ShoppingCart,
  PlusCircle,
  Truck,
  Receipt,
  PiggyBank,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data, getVariantStock, getVariantCost, computeFinancials } = useData();

  // Period controls
  const [selectedMonth, setSelectedMonth] = useState('10'); // October
  const [selectedYear, setSelectedYear] = useState('2026');

  const fin = computeFinancials(selectedMonth === 'all' ? null : selectedMonth, selectedYear);

  // Compute Low Stock variants (stock <= reorder_level)
  const lowStockItems = data.variants.map(v => {
    const stock = getVariantStock(v.id);
    const design = data.designs.find(d => d.id === v.design_id);
    return {
      ...v,
      designName: design?.name || 'Unknown Design',
      stock
    };
  }).filter(v => !v.archived_at && v.stock <= v.reorder_level);

  // Compute Slow Movers: variants with stock > 0 and no sale in 30 days
  const slowMovers = data.variants.map(v => {
    const stock = getVariantStock(v.id);
    const design = data.designs.find(d => d.id === v.design_id);
    const lastSale = data.sales
      .filter(s => s.variant_id === v.id && s.status !== 'Voided')
      .sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date))[0];
    return {
      ...v,
      designName: design?.name || 'Unknown Design',
      stock,
      lastSaleDate: lastSale?.sale_date || 'No sales recorded'
    };
  }).filter(v => !v.archived_at && v.stock > 0);

  // Best Sellers (ranking designs by units sold)
  const designSalesMap = {};
  data.sales.forEach(s => {
    if (s.status !== 'Voided') {
      const v = data.variants.find(item => item.id === s.variant_id);
      if (v) {
        const dId = v.design_id;
        designSalesMap[dId] = (designSalesMap[dId] || 0) + Number(s.quantity);
      }
    }
  });

  const bestSellers = Object.entries(designSalesMap).map(([dId, units]) => {
    const design = data.designs.find(d => d.id === dId);
    return {
      designName: design?.name || 'Design',
      photo_url: design?.photo_url,
      units
    };
  }).sort((a, b) => b.units - a.units).slice(0, 4);

  // Pending orders
  const pendingOrders = data.orders.filter(o => o.status === 'Pending' || o.status === 'Preparing');

  return (
    <div>
      {/* Top Header & Period Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="pos-title text-2xl" style={{ margin: 0 }}>Business Dashboard</h1>
          <p className="text-sm text-muted font-bold" style={{ margin: '0.2rem 0 0 0' }}>
            Inventory, Capital Recovery, OPEX & ROI Performance
          </p>
        </div>

        {/* Period Filter Card */}
        <div className="flex items-center gap-2">
          <select
            className="pos-select"
            style={{ width: 'auto', minHeight: '44px' }}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="all">All Months</option>
            <option value="1">January</option>
            <option value="2">February</option>
            <option value="3">March</option>
            <option value="4">April</option>
            <option value="5">May</option>
            <option value="6">June</option>
            <option value="7">July</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>

          <select
            className="pos-select"
            style={{ width: 'auto', minHeight: '44px' }}
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
      </div>

      {/* Quick Actions Row */}
      <Card tape="blue" className="mb-6">
        <div className="font-bold text-sm mb-3">QUICK ACTIONS</div>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => navigate('/pos')}>
            <ShoppingCart size={18} />
            <span>Record Sale (POS)</span>
          </Button>
          <Button variant="success" onClick={() => navigate('/purchases')}>
            <Truck size={18} />
            <span>New Purchase Batch</span>
          </Button>
          <Button variant="pink" onClick={() => navigate('/products')}>
            <PlusCircle size={18} />
            <span>Add Sandal Product</span>
          </Button>
          <Button variant="default" onClick={() => navigate('/expenses')}>
            <Receipt size={18} />
            <span>Add OPEX Expense</span>
          </Button>
          <Button variant="default" onClick={() => navigate('/capital')}>
            <PiggyBank size={18} />
            <span>Capital Entry</span>
          </Button>
        </div>
      </Card>

      {/* 10 Key Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {/* 1. Sales Revenue */}
        <Card>
          <div className="text-xs text-muted font-bold mb-1">TOTAL SALES</div>
          <div className="text-xl font-bold" style={{ color: 'var(--ink)' }}>
            {formatCurrency(fin.revenue)}
          </div>
          <div className="text-xs mt-1 font-bold" style={{ color: 'var(--ink)', opacity: 0.8 }}>
            {fin.unitsSold} pairs sold
          </div>
        </Card>

        {/* 2. COGS */}
        <Card>
          <div className="text-xs text-muted font-bold mb-1">COGS (COST OF GOODS)</div>
          <div className="text-xl font-bold">
            {formatCurrency(fin.cogs)}
          </div>
          <div className="text-xs mt-1 text-muted">Landed purchase cost</div>
        </Card>

        {/* 3. Gross Profit */}
        <Card variant="butter">
          <div className="text-xs text-muted font-bold mb-1">GROSS PROFIT</div>
          <div className="text-xl font-bold">
            {formatCurrency(fin.grossProfit)}
          </div>
          <div className="text-xs mt-1 font-bold">Sales minus COGS</div>
        </Card>

        {/* 4. OPEX */}
        <Card>
          <div className="text-xs text-muted font-bold mb-1">OPERATING EXPENSES</div>
          <div className="text-xl font-bold" style={{ color: 'var(--coral)' }}>
            {formatCurrency(fin.opex)}
          </div>
          <div className="text-xs mt-1 text-muted">Rent, ads, shipping</div>
        </Card>

        {/* 5. Sponsored PR Cost */}
        <Card variant="pink">
          <div className="text-xs text-muted font-bold mb-1">SPONSORED PR COST</div>
          <div className="text-xl font-bold">
            {formatCurrency(fin.sponsoredCost)}
          </div>
          <div className="text-xs mt-1 font-bold">Giveaway influencer cost</div>
        </Card>

        {/* 6. Net Profit */}
        <Card variant="mint">
          <div className="text-xs text-muted font-bold mb-1">NET PROFIT</div>
          <div className="text-xl font-bold">
            {formatCurrency(fin.netProfit)}
          </div>
          <div className="text-xs mt-1 font-bold">After OPEX & PR</div>
        </Card>

        {/* 7. ROI */}
        <Card variant={fin.roi >= 0 ? 'mint' : 'butter'}>
          <div className="text-xs text-muted font-bold mb-1">RETURN ON CAPITAL (ROI)</div>
          <div className="text-2xl font-bold">
            {fin.roi}%
          </div>
          <div className="text-xs mt-1 font-bold">Net Profit / Capital</div>
        </Card>

        {/* 8. Cash on Hand */}
        <Card>
          <div className="text-xs text-muted font-bold mb-1">EST. CASH ON HAND</div>
          <div className="text-xl font-bold">
            {formatCurrency(fin.cashOnHand)}
          </div>
          <div className="text-xs mt-1 text-muted">Available liquidity</div>
        </Card>

        {/* 9. Capital Tied Up in Stock */}
        <Card>
          <div className="text-xs text-muted font-bold mb-1">CAPITAL IN STOCK</div>
          <div className="text-xl font-bold">
            {formatCurrency(fin.capitalTiedUp)}
          </div>
          <div className="text-xs mt-1 text-muted">Current inventory value</div>
        </Card>

        {/* 10. Net Capital Invested */}
        <Card>
          <div className="text-xs text-muted font-bold mb-1">NET CAPITAL INVESTED</div>
          <div className="text-xl font-bold">
            {formatCurrency(fin.netCapitalInvested)}
          </div>
          <div className="text-xs mt-1 text-muted">Injections - withdrawals</div>
        </Card>
      </div>

      {/* Main Content Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left Column: Visual Charts & Analytics (2 cols) */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Cash Flow Performance Panel */}
          <Card tape="pink">
            <h2 className="pos-title text-lg mb-3">Financial Flow Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div style={{ background: 'var(--paper)', border: '2px solid var(--ink)', borderRadius: '12px', padding: '0.75rem' }}>
                <div className="text-xs font-bold text-muted">CASH INFLOWS</div>
                <div className="text-lg font-bold" style={{ color: 'var(--ink)' }}>
                  {formatCurrency(fin.revenue + fin.totalCapitalIn)}
                </div>
                <div className="text-xs text-muted">Sales + Capital In</div>
              </div>
              <div style={{ background: 'var(--paper)', border: '2px solid var(--ink)', borderRadius: '12px', padding: '0.75rem' }}>
                <div className="text-xs font-bold text-muted">TOTAL OUTFLOWS</div>
                <div className="text-lg font-bold" style={{ color: 'var(--coral)' }}>
                  {formatCurrency(fin.cogs + fin.opex + fin.totalWithdrawals)}
                </div>
                <div className="text-xs text-muted">COGS + OPEX + Draws</div>
              </div>
              <div style={{ background: 'var(--mint-soft)', border: '2px solid var(--ink)', borderRadius: '12px', padding: '0.75rem' }}>
                <div className="text-xs font-bold text-muted">NET PERIOD GAIN</div>
                <div className="text-lg font-bold">
                  {formatCurrency(fin.netProfit)}
                </div>
                <div className="text-xs text-muted">Net profit retained</div>
              </div>
            </div>

            {/* Visual Bar representation */}
            <div style={{ background: 'var(--light-blue)', padding: '1rem', borderRadius: '12px', border: '2px solid var(--ink)' }}>
              <div className="font-bold text-sm mb-2">Revenue Allocation Breakdown</div>
              <div className="flex w-full" style={{ height: '24px', borderRadius: '12px', overflow: 'hidden', border: '2px solid var(--ink)' }}>
                <div style={{ width: `${fin.revenue > 0 ? (fin.cogs / fin.revenue) * 100 : 50}%`, background: 'var(--yellow)', title: 'COGS' }} />
                <div style={{ width: `${fin.revenue > 0 ? (fin.opex / fin.revenue) * 100 : 25}%`, background: 'var(--coral)', title: 'OPEX' }} />
                <div style={{ width: `${fin.revenue > 0 ? (Math.max(0, fin.netProfit) / fin.revenue) * 100 : 25}%`, background: 'var(--mint)', title: 'Net Profit' }} />
              </div>
              <div className="flex flex-wrap justify-between text-xs font-bold mt-2 gap-2">
                <span className="flex items-center gap-1">
                  <span style={{ width: '10px', height: '10px', background: 'var(--yellow)', border: '1px solid var(--ink)', display: 'inline-block' }} /> COGS ({fin.revenue > 0 ? Math.round((fin.cogs / fin.revenue) * 100) : 0}%)
                </span>
                <span className="flex items-center gap-1">
                  <span style={{ width: '10px', height: '10px', background: 'var(--coral)', border: '1px solid var(--ink)', display: 'inline-block' }} /> OPEX ({fin.revenue > 0 ? Math.round((fin.opex / fin.revenue) * 100) : 0}%)
                </span>
                <span className="flex items-center gap-1">
                  <span style={{ width: '10px', height: '10px', background: 'var(--mint)', border: '1px solid var(--ink)', display: 'inline-block' }} /> Net Profit ({fin.revenue > 0 ? Math.round((fin.netProfit / fin.revenue) * 100) : 0}%)
                </span>
              </div>
            </div>
          </Card>

          {/* Best Sellers & Recent Sales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <h3 className="pos-title text-base mb-3">Top Selling Sandal Designs</h3>
              {bestSellers.length === 0 ? (
                <div className="text-sm text-muted">No sales recorded yet.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {bestSellers.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2" style={{ borderBottom: '1.5px dashed rgba(29, 42, 87, 0.2)' }}>
                      <div className="flex items-center gap-2">
                        {item.photo_url ? (
                          <img src={item.photo_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover', border: '1.5px solid var(--ink)' }} />
                        ) : (
                          <span style={{ fontSize: '1.2rem' }}>👡</span>
                        )}
                        <span className="font-bold text-sm">{item.designName}</span>
                      </div>
                      <StatusChip status="completed" label={`${item.units} pairs`} />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="pos-title text-base" style={{ margin: 0 }}>Recent Orders</h3>
                <Button size="sm" variant="default" onClick={() => navigate('/orders')}>View All</Button>
              </div>
              {pendingOrders.length === 0 ? (
                <div className="text-sm text-muted">No pending customer reservations.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {pendingOrders.slice(0, 3).map((ord) => {
                    const cust = data.customers.find(c => c.id === ord.customer_id);
                    return (
                      <div key={ord.id} className="p-2" style={{ borderBottom: '1.5px dashed rgba(29, 42, 87, 0.2)' }}>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm">{ord.order_number}</span>
                          <StatusChip status={ord.status} />
                        </div>
                        <div className="text-xs text-muted mt-1">
                          {cust?.name || 'Walk-in'} • {formatCurrency(ord.total_amount)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Right Column: Inventory Alerts & Operational Warnings (1 col) */}
        <div className="flex flex-col gap-6">
          {/* Low Stock Alerts */}
          <Card variant={lowStockItems.length > 0 ? 'butter' : 'default'}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={20} style={{ color: 'var(--coral)' }} />
              <h3 className="pos-title text-base" style={{ margin: 0 }}>Low Stock Alerts</h3>
            </div>
            {lowStockItems.length === 0 ? (
              <div className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                All variants are comfortably above reorder levels.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {lowStockItems.slice(0, 4).map((it) => (
                  <div key={it.id} className="flex justify-between items-center p-2" style={{ background: 'var(--paper)', border: '2px solid var(--ink)', borderRadius: '10px' }}>
                    <div>
                      <div className="font-bold text-xs">{it.designName}</div>
                      <div className="text-xs text-muted">Size {it.size} • {it.color}</div>
                    </div>
                    <StatusChip status="danger" label={`${it.stock} left`} />
                  </div>
                ))}
                <Button size="sm" variant="primary" onClick={() => navigate('/purchases')} className="mt-2">
                  Create Restock Batch
                </Button>
              </div>
            )}
          </Card>

          {/* Slow Movers */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={20} />
              <h3 className="pos-title text-base" style={{ margin: 0 }}>Slow Moving Stock</h3>
            </div>
            <p className="text-xs text-muted mb-3 font-bold">
              Variants in inventory without sales activity for 30+ days.
            </p>
            <div className="flex flex-col gap-2">
              {slowMovers.slice(0, 3).map((sm) => (
                <div key={sm.id} className="p-2" style={{ borderBottom: '1.5px dashed rgba(29, 42, 87, 0.2)' }}>
                  <div className="font-bold text-xs">{sm.designName}</div>
                  <div className="flex justify-between text-xs text-muted mt-1">
                    <span>Size {sm.size} • {sm.color} ({sm.stock} in stock)</span>
                    <StatusChip status="new" label="Discount / Promo" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
