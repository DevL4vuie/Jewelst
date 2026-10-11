import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusChip from '../components/ui/StatusChip';
import DataTable from '../components/shared/DataTable';
import { formatCurrency } from '../lib/calculationUtils';
import { BarChart3, Calendar, Award, AlertTriangle } from 'lucide-react';

const dateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const daysAgo = (count) => {
  const date = new Date();
  date.setDate(date.getDate() - count);
  return dateInputValue(date);
};

const CHART_WIDTH = 1000;
const CHART_HEIGHT = 340;
const CHART_MARGIN = { top: 20, right: 20, bottom: 55, left: 90 };

export default function ReportsPage() {
  const { data, getVariantStock, getVariantCost } = useData();

  const [activeTab, setActiveTab] = useState('profitByDesign'); // 'profitByDesign' | 'dailySales' | 'bestSellers' | 'slowMovers'
  const [fromDate, setFromDate] = useState(() => daysAgo(29));
  const [toDate, setToDate] = useState(() => dateInputValue(new Date()));
  const dateRangeValid = Boolean(fromDate && toDate && fromDate <= toDate);
  const filteredSales = dateRangeValid
    ? data.sales.filter(s => s.status !== 'Voided' && s.sale_date >= fromDate && s.sale_date <= toDate)
    : [];

  // 1. Profit by Design
  const profitByDesign = data.designs.map(des => {
    let unitsSold = 0;
    let revenue = 0;
    let totalCogs = 0;

    filteredSales.forEach(s => {
      const v = data.variants.find(item => item.id === s.variant_id);
      if (v && v.design_id === des.id) {
        const qty = Number(s.quantity) || 0;
        unitsSold += qty;
        revenue += (Number(s.selling_price) || 0) * qty;
        totalCogs += (Number(s.unit_cost) || 0) * qty;
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
  filteredSales.forEach(s => {
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
  });
  const dailySales = Object.values(dailySalesMap).sort((a, b) => new Date(b.date) - new Date(a.date));
  const rangeLengthDays = dateRangeValid
    ? (new Date(`${toDate}T12:00:00`).getTime() - new Date(`${fromDate}T12:00:00`).getTime()) / 86400000
    : 0;
  const monthlyChart = rangeLengthDays > 90;
  const chartDataMap = {};
  dailySales.forEach(day => {
    const key = monthlyChart ? day.date.slice(0, 7) : day.date;
    if (!chartDataMap[key]) {
      chartDataMap[key] = { date: key, revenue: 0, cogs: 0, grossProfit: 0 };
    }
    chartDataMap[key].revenue += day.revenue;
    chartDataMap[key].cogs += day.cogs;
    chartDataMap[key].grossProfit += day.grossProfit;
  });
  // 3. Best Sellers (Variants)
  const variantSalesMap = {};
  filteredSales.forEach(s => {
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

  const pieColors = ['#2563eb', '#e67e22', '#16a085', '#d9468f', '#8b5cf6', '#64748b'];
  const topDesignRevenue = profitByDesign
    .filter(design => design.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);
  const topSellerVariants = bestSellerVariants.slice(0, 10);
  const topSlowMovers = [...slowMovers].sort((a, b) => b.stock - a.stock).slice(0, 10);
  const stockValueByDesign = slowMovers.reduce((totals, item) => {
    totals[item.designName] = (totals[item.designName] || 0) + item.stockValue;
    return totals;
  }, {});
  const slowMoverDesignValues = Object.entries(stockValueByDesign)
    .map(([name, value]) => ({ name, value }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);
  const saleTypeRevenue = filteredSales.reduce((totals, sale) => {
    const type = sale.sale_type || 'Other';
    totals[type] = (totals[type] || 0) + (Number(sale.selling_price) || 0) * (Number(sale.quantity) || 0);
    return totals;
  }, {});

  let chartTitle;
  let chartSubtitle;
  let chartData;
  let chartSeries;
  let pieTitle;
  let pieSubtitle;
  let pieSource;
  let pieMetric;
  let pieMetricLabel;
  let pieName;

  if (activeTab === 'dailySales') {
    chartTitle = 'Revenue, Cost & Gross Profit';
    chartSubtitle = monthlyChart ? 'Monthly totals' : 'Daily totals';
    chartData = Object.values(chartDataMap).sort((a, b) => a.date.localeCompare(b.date));
    chartSeries = [
      { key: 'revenue', label: 'Revenue', color: '#2563eb' },
      { key: 'cogs', label: 'Landed COGS', color: '#e67e22' },
      { key: 'grossProfit', label: 'Gross Profit', color: '#16a085' }
    ];
    pieTitle = 'Revenue by Sale Type';
    pieSubtitle = 'Share of revenue from retail and reseller sales';
    pieSource = Object.entries(saleTypeRevenue).map(([name, value]) => ({ name, value }));
    pieMetric = 'value';
    pieMetricLabel = 'Revenue';
    pieName = item => item.name;
  } else if (activeTab === 'bestSellers') {
    chartTitle = 'Top Variants by Pairs Sold';
    chartSubtitle = 'Top 10 variants in the selected date range';
    chartData = topSellerVariants.map(item => ({
      date: `${item.designName} · ${item.size} · ${item.color}`,
      units: item.units,
      revenue: item.revenue
    }));
    chartSeries = [{ key: 'units', label: 'Pairs Sold', color: '#2563eb' }];
    pieTitle = 'Revenue by Best-Selling Variant';
    pieSubtitle = 'Share of revenue among sold variants';
    pieSource = topSellerVariants.map(item => ({
      name: `${item.designName} · ${item.size} · ${item.color}`,
      value: item.revenue
    }));
    pieMetric = 'value';
    pieMetricLabel = 'Revenue';
    pieName = item => item.name;
  } else if (activeTab === 'slowMovers') {
    chartTitle = 'Remaining Stock by Variant';
    chartSubtitle = 'Current inventory · date range does not apply';
    chartData = topSlowMovers.map(item => ({
      date: `${item.designName} · ${item.size} · ${item.color}`,
      stock: item.stock
    }));
    chartSeries = [{ key: 'stock', label: 'Pairs in Stock', color: '#e67e22' }];
    pieTitle = 'Inventory Value by Design';
    pieSubtitle = 'Current stock valued at landed cost';
    pieSource = slowMoverDesignValues;
    pieMetric = 'value';
    pieMetricLabel = 'Stock Value';
    pieName = item => item.name;
  } else {
    chartTitle = 'Profitability by Design';
    chartSubtitle = 'Revenue, landed cost, and gross profit in the selected date range';
    chartData = profitByDesign
      .filter(item => item.revenue > 0 || item.totalCogs > 0)
      .slice(0, 10)
      .map(item => ({
        date: item.designName,
        revenue: item.revenue,
        cogs: item.totalCogs,
        grossProfit: item.profit
      }));
    chartSeries = [
      { key: 'revenue', label: 'Revenue', color: '#2563eb' },
      { key: 'cogs', label: 'Landed COGS', color: '#e67e22' },
      { key: 'grossProfit', label: 'Gross Profit', color: '#16a085' }
    ];
    pieTitle = 'Revenue by Design';
    pieSubtitle = 'Share of sales revenue in the selected date range';
    pieSource = topDesignRevenue.map(item => ({ name: item.designName, value: item.revenue }));
    pieMetric = 'value';
    pieMetricLabel = 'Revenue';
    pieName = item => item.name;
  }

  const chartValues = chartData.flatMap(point => chartSeries.map(series => Number(point[series.key]) || 0));
  const chartMin = Math.min(0, ...chartValues);
  const chartMax = Math.max(0, ...chartValues);
  const chartPadding = (chartMax - chartMin || 1) * 0.1;
  const yMin = chartMin - chartPadding;
  const yMax = chartMax + chartPadding;
  const chartPlotWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const chartPlotHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const chartSlotWidth = chartData.length ? chartPlotWidth / chartData.length : chartPlotWidth;
  const barWidth = Math.max(3, Math.min(24, chartSlotWidth * 0.22));
  const chartY = value => CHART_MARGIN.top + ((yMax - value) / (yMax - yMin)) * chartPlotHeight;
  const chartZeroY = chartY(0);
  const chartLabels = chartData.length <= 10
    ? chartData.map((point, index) => index)
    : Array.from(new Set(Array.from({ length: 6 }, (_, index) => Math.round(index * (chartData.length - 1) / 5))));
  const formatChartAxis = value => activeTab === 'bestSellers' || activeTab === 'slowMovers'
    ? new Intl.NumberFormat().format(value)
    : `${data.settings.currency_symbol || '₱'}${new Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value)}`;
  const pieItems = pieSource
    .filter(item => item[pieMetric] > 0)
    .sort((a, b) => b[pieMetric] - a[pieMetric]);
  const pieSlices = pieItems.slice(0, 5).map((item, index) => ({
    name: pieName(item),
    value: item[pieMetric],
    color: pieColors[index]
  }));
  const pieOtherValue = pieItems.slice(5).reduce((sum, item) => sum + item[pieMetric], 0);
  if (pieOtherValue > 0) pieSlices.push({ name: 'Other', value: pieOtherValue, color: pieColors[5] });
  const pieTotal = pieSlices.reduce((sum, item) => sum + item.value, 0);
  let pieOffset = 0;
  const pieStops = pieSlices.map(item => {
    const start = pieOffset;
    pieOffset += (item.value / pieTotal) * 100;
    return `${item.color} ${start}% ${pieOffset}%`;
  });
  const pieGradient = pieStops.length
    ? `conic-gradient(${pieStops.join(', ')})`
    : 'conic-gradient(#e5e7eb 0% 100%)';

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

      <Card tape="blue" className="mb-6">
        <div className="reports-chart-header">
          <div>
            <h2 className="pos-title text-lg" style={{ margin: 0 }}>
              {activeTab === 'profitByDesign' && 'Profit by Design'}
              {activeTab === 'dailySales' && 'Daily Sales Breakdown'}
              {activeTab === 'bestSellers' && 'Best Sellers Ranking'}
              {activeTab === 'slowMovers' && 'Slow Movers'}
            </h2>
              <p className="text-xs text-muted font-bold" style={{ margin: '0.25rem 0 0' }}>
                {activeTab === 'slowMovers'
                  ? 'Inventory charts show current stock and are not affected by dates'
                  : `Charts use ${fromDate} to ${toDate} · Voided sales excluded`}
            </p>
          </div>
          <div className="reports-date-filter">
            <label>
              <span className="pos-label">From</span>
              <input
                className="pos-input"
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={event => setFromDate(event.target.value)}
              />
            </label>
            <label>
              <span className="pos-label">To</span>
              <input
                className="pos-input"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={event => setToDate(event.target.value)}
              />
            </label>
          </div>
        </div>

        {!dateRangeValid ? (
          <div className="order-form-error" role="alert">Choose a valid date range: the start date must be on or before the end date.</div>
        ) : (
          <div className="reports-analytics-grid">
            <section className="reports-chart-panel">
              <h3 className="pos-title text-base" style={{ margin: '0 0 0.25rem' }}>{chartTitle}</h3>
              <p className="text-xs text-muted font-bold" style={{ margin: '0 0 0.75rem' }}>
                {chartSubtitle}
              </p>
              {chartData.length === 0 ? (
                <div className="text-sm text-muted reports-chart-empty">No sales in this date range.</div>
              ) : (
                <>
                  <div className="reports-chart-legend" aria-label="Bar chart series">
                    {chartSeries.map(series => (
                      <span key={series.key}>
                        <i style={{ backgroundColor: series.color }} />
                        {series.label}
                      </span>
                    ))}
                  </div>
                  <div className="reports-chart-scroll">
                    <svg
                      key={`bar-chart-${activeTab}-${fromDate}-${toDate}`}
                      className="reports-chart"
                      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                      role="img"
                      aria-label={`Bar graph of revenue, landed cost, and gross profit from ${fromDate} to ${toDate}`}
                    >
                      {Array.from({ length: 5 }, (_, index) => {
                        const value = yMax - ((yMax - yMin) * index) / 4;
                        const y = chartY(value);
                        return (
                          <g key={`grid-${index}`}>
                            <line
                              x1={CHART_MARGIN.left}
                              x2={CHART_WIDTH - CHART_MARGIN.right}
                              y1={y}
                              y2={y}
                              stroke="rgba(29, 42, 87, 0.13)"
                              strokeDasharray="4 5"
                            />
                            <text x={CHART_MARGIN.left - 10} y={y + 4} textAnchor="end" className="reports-chart-axis">
                              {formatChartAxis(value)}
                            </text>
                          </g>
                        );
                      })}
                      {chartData.map((point, index) => chartSeries.map((series, seriesIndex) => {
                        const x = CHART_MARGIN.left + index * chartSlotWidth + chartSlotWidth / 2
                          + (seriesIndex - (chartSeries.length - 1) / 2) * (barWidth + 3) - barWidth / 2;
                        const y = chartY(point[series.key]);
                        const barTop = Math.min(y, chartZeroY);
                        return (
                          <rect
                            key={`${series.key}-${point.date}`}
                            className="reports-chart-bar"
                            x={x}
                            y={barTop}
                            width={barWidth}
                            height={Math.max(1, Math.abs(chartZeroY - y))}
                            rx="3"
                            fill={series.color}
                            style={{
                              transformOrigin: `center ${point[series.key] < 0 ? 'top' : 'bottom'}`,
                              animationDelay: `${Math.min(index * chartSeries.length + seriesIndex, 24) * 25}ms`
                            }}
                          >
                            <title>{`${point.date}: ${series.label} ${formatCurrency(point[series.key])}`}</title>
                          </rect>
                        );
                      }))}
                      {chartLabels.map(index => {
                        const point = chartData[index];
                        const labelDate = activeTab === 'dailySales'
                          ? monthlyChart
                            ? new Date(`${point.date}-01T12:00:00`).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
                            : new Date(`${point.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                          : point.date.length > 13 ? `${point.date.slice(0, 12)}…` : point.date;
                        return (
                          <text
                            key={`date-${point.date}`}
                            x={CHART_MARGIN.left + index * chartSlotWidth + chartSlotWidth / 2}
                            y={CHART_HEIGHT - 15}
                            textAnchor="middle"
                            className="reports-chart-axis"
                          >
                            {labelDate}
                          </text>
                        );
                      })}
                    </svg>
                  </div>
                </>
              )}
            </section>

            <section className="reports-chart-panel">
              <h3 className="pos-title text-base" style={{ margin: '0 0 0.25rem' }}>{pieTitle}</h3>
              <p className="text-xs text-muted font-bold" style={{ margin: '0 0 0.75rem' }}>
                {pieSubtitle}
              </p>
              {pieTotal <= 0 ? (
                <div className="text-sm text-muted reports-chart-empty">No chart data for this report.</div>
              ) : (
                <div className="reports-pie-layout">
                  <div
                    key={`pie-chart-${activeTab}-${fromDate}-${toDate}`}
                    className="reports-pie-chart"
                    role="img"
                    aria-label={`Pie chart for ${pieTitle}`}
                    style={{ background: pieGradient }}
                  />
                  <div className="reports-pie-details">
                    <strong>Total {pieMetricLabel}: {formatCurrency(pieTotal)}</strong>
                  </div>
                  <div className="reports-pie-legend">
                    {pieSlices.map(item => (
                      <div key={item.name} title={`${item.name}: ${formatCurrency(item.value)}`}>
                        <i style={{ backgroundColor: item.color }} />
                        <span>{item.name}</span>
                        <strong>{((item.value / pieTotal) * 100).toFixed(1)}%</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </Card>

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
