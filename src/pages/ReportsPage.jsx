import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusChip from '../components/ui/StatusChip';
import DataTable from '../components/shared/DataTable';
import ExcelExportBtn from '../components/shared/ExcelExportBtn';
import { formatCurrency } from '../lib/calculationUtils';
import { BarChart3, Calendar, Award, AlertTriangle, Layers, DollarSign } from 'lucide-react';

export default function ReportsPage() {
  const { data, getVariantStock, getVariantCost } = useData();

  const [activeTab, setActiveTab] = useState('profitByDesign'); // 'profitByDesign' | 'dailySales' | 'bestSellers' | 'slowMovers'

  // 1. Profit by Design
  const profitByDesign = data.designs.map(des => {
    let unitsSold = 0;
    let revenue = 0;
    let totalCogs = 0;

    data.sales.forEach(s => {
      if (s.status !== 'Voided') {
        const v = data.variants.find(item => item.id === s.variant_id);
        if (v && v.design_id === des.id) {
          const qty = Number(s.quantity) || 0;
          unitsSold += qty;
          revenue += (Number(s.selling_price) || 0) * qty;
          totalCogs += (Number(s.unit_cost) || 0) * qty;
        }
      }
    });

    const profit = revenue - totalCogs;
    const margin = revenue > 0 ? Number(((profit / revenue) * 100).toFixed(1)) : 0;

    return {
      id: des.id,
      designName: des.name,
      unitsSold,
      revenue,
      totalCogs,
      profit,
      margin
    };
  }).sort((a, b) => b.profit - a.profit);

  // 2. Daily Sales
  const dailySalesMap = {};
  data.sales.forEach(s => {
    if (s.status !== 'Voided') {
      const d = s.sale_date;
      if (!dailySalesMap[d]) {
        dailySalesMap[d] = {
          date: d,
          txnCount: 0,
          unitsSold: 0,
          revenue: 0,
          cogs: 0,
          grossProfit: 0
        };
      }
      const qty = Number(s.quantity) || 0;
      dailySalesMap[d].txnCount += 1;
      dailySalesMap[d].unitsSold += qty;
      dailySalesMap[d].revenue += (Number(s.selling_price) || 0) * qty;
      dailySalesMap[d].cogs += (Number(s.unit_cost) || 0) * qty;
      dailySalesMap[d].grossProfit = dailySalesMap[d].revenue - dailySalesMap[d].cogs;
    }
  });
  const dailySales = Object.values(dailySalesMap).sort((a, b) => new Date(b.date) - new Date(a.date));

  // 3. Best Sellers (Variants)
  const variantSalesMap = {};
  data.sales.forEach(s => {
    if (s.status !== 'Voided') {
      const vId = s.variant_id;
      if (!variantSalesMap[vId]) {
        variantSalesMap[vId] = {
          variantId: vId,
          units: 0,
          revenue: 0
        };
      }
      const qty = Number(s.quantity) || 0;
      variantSalesMap[vId].units += qty;
      variantSalesMap[vId].revenue += (Number(s.selling_price) || 0) * qty;
    }
  });

  const bestSellerVariants = Object.values(variantSalesMap).map(item => {
    const v = data.variants.find(x => x.id === item.variantId);
    const des = v ? data.designs.find(d => d.id === v.design_id) : null;
    return {
      variantId: item.variantId,
      designName: des?.name || 'Sandal',
      size: v?.size || '-',
      color: v?.color || '-',
      units: item.units,
      revenue: item.revenue
    };
  }).sort((a, b) => b.units - a.units);

  // 4. Slow Movers
  const slowMovers = data.variants.map(v => {
    const des = data.designs.find(d => d.id === v.design_id);
    const stock = getVariantStock(v.id);
    const cost = getVariantCost(v.id);
    return {
      id: v.id,
      designName: des?.name || 'Design',
      size: v.size,
      color: v.color,
      stock,
      cost,
      stockValue: stock * cost
    };
  }).filter(v => v.stock > 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="pos-title text-2xl" style={{ margin: 0 }}>Business Reports & Analytics</h1>
          <p className="text-sm text-muted font-bold" style={{ margin: '0.2rem 0 0 0' }}>
            Profit By Design, Daily Breakdown, Best Sellers & Slow Moving Stock
          </p>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={activeTab === 'profitByDesign' ? 'primary' : 'default'}
          onClick={() => setActiveTab('profitByDesign')}
        >
          <Award size={16} />
          <span>Profit By Design</span>
        </Button>
        <Button
          variant={activeTab === 'dailySales' ? 'primary' : 'default'}
          onClick={() => setActiveTab('dailySales')}
        >
          <Calendar size={16} />
          <span>Daily Sales Breakdown</span>
        </Button>
        <Button
          variant={activeTab === 'bestSellers' ? 'primary' : 'default'}
          onClick={() => setActiveTab('bestSellers')}
        >
          <BarChart3 size={16} />
          <span>Best Sellers Ranking</span>
        </Button>
        <Button
          variant={activeTab === 'slowMovers' ? 'primary' : 'default'}
          onClick={() => setActiveTab('slowMovers')}
        >
          <AlertTriangle size={16} />
          <span>Slow Movers (30+ Days)</span>
        </Button>
      </div>

      {/* Tab 1: Profit By Design */}
      {activeTab === 'profitByDesign' && (
        <Card tape="blue">
          <div className="font-bold text-sm mb-3">SANDAL DESIGN PROFITABILITY MATRIX</div>
          <DataTable
            columns={[
              { header: 'Design Name', accessor: 'designName', fontBold: true },
              { header: 'Units Sold', accessor: 'unitsSold', align: 'center' },
              { header: 'Gross Revenue', align: 'right', render: r => formatCurrency(r.revenue) },
              { header: 'COGS Expense', align: 'right', render: r => formatCurrency(r.totalCogs) },
              { header: 'Net Design Profit', align: 'right', render: r => <strong style={{ color: 'var(--ink)' }}>{formatCurrency(r.profit)}</strong> },
              {
                header: 'Profit Margin',
                align: 'center',
                render: r => <StatusChip status="completed" label={`${r.margin}%`} />
              }
            ]}
            data={profitByDesign}
            searchKey="designName"
            exportFileName="Jewels_Profit_By_Design"
            exportSheetName="ProfitByDesign"
          />
        </Card>
      )}

      {/* Tab 2: Daily Sales */}
      {activeTab === 'dailySales' && (
        <Card tape="pink">
          <div className="font-bold text-sm mb-3">DAILY SALES & PROFIT REPORT</div>
          <DataTable
            columns={[
              { header: 'Date', accessor: 'date', width: '130px' },
              { header: 'Transactions', accessor: 'txnCount', align: 'center', width: '120px' },
              { header: 'Units Sold', accessor: 'unitsSold', align: 'center', width: '110px' },
              { header: 'Revenue', align: 'right', render: r => formatCurrency(r.revenue) },
              { header: 'Landed COGS', align: 'right', render: r => formatCurrency(r.cogs) },
              { header: 'Gross Profit', align: 'right', render: r => <strong style={{ color: 'var(--ink)' }}>{formatCurrency(r.grossProfit)}</strong> }
            ]}
            data={dailySales}
            searchKey="date"
            exportFileName="Jewels_Daily_Sales"
            exportSheetName="DailySales"
          />
        </Card>
      )}

      {/* Tab 3: Best Sellers */}
      {activeTab === 'bestSellers' && (
        <Card tape="blue">
          <div className="font-bold text-sm mb-3">TOP PERFORMING SIZES & VARIANTS</div>
          <DataTable
            columns={[
              { header: 'Design', accessor: 'designName' },
              { header: 'Size', accessor: 'size', align: 'center', width: '80px' },
              { header: 'Color', accessor: 'color', width: '120px' },
              { header: 'Pairs Sold', accessor: 'units', align: 'center', render: r => <strong style={{ color: 'var(--ink)' }}>{r.units} pairs</strong> },
              { header: 'Total Revenue Generated', align: 'right', render: r => formatCurrency(r.revenue) }
            ]}
            data={bestSellerVariants}
            searchKey="designName"
            exportFileName="Jewels_Best_Sellers"
            exportSheetName="BestSellers"
          />
        </Card>
      )}

      {/* Tab 4: Slow Movers */}
      {activeTab === 'slowMovers' && (
        <Card variant="butter">
          <div className="font-bold text-sm mb-3">SLOW MOVING INVENTORY AUDIT</div>
          <DataTable
            columns={[
              { header: 'Design Name', accessor: 'designName' },
              { header: 'Size', accessor: 'size', align: 'center', width: '80px' },
              { header: 'Color', accessor: 'color', width: '120px' },
              { header: 'Remaining Stock', accessor: 'stock', align: 'center', render: r => <span className="font-bold">{r.stock} pairs</span> },
              { header: 'Unit Landed Cost', align: 'right', render: r => formatCurrency(r.cost) },
              { header: 'Capital Tied Up', align: 'right', render: r => <strong style={{ color: 'var(--coral)' }}>{formatCurrency(r.stockValue)}</strong> },
              {
                header: 'Recommendation',
                align: 'center',
                render: () => <StatusChip status="new" label="Bundle / Markdown" />
              }
            ]}
            data={slowMovers}
            searchKey="designName"
            exportFileName="Jewels_Slow_Movers"
            exportSheetName="SlowMovers"
          />
        </Card>
      )}
    </div>
  );
}
