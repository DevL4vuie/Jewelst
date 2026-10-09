import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { calculateLandedCost } from '../lib/calculationUtils';

const DataContext = createContext(null);

const STORAGE_KEY = 'jewelst_sandal_system_data_v3';

// Empty starting data — no hardcoded seed records
const initialData = {
  settings: {
    business_name: "Jewel's Sandals",
    currency: "PHP",
    currency_symbol: "₱",
    slow_mover_days: 30,
    default_reorder_level: 5,
    timezone: "Asia/Manila"
  },
  categories: [],
  designs: [],
  variants: [],
  purchases: [],
  sales: [],
  orders: [],
  customers: [],
  sponsors: [],
  sponsored_items: [],
  expenses: [],
  capital_entries: [],
  stock_adjustments: [],
  activity_log: []
};




export function DataProvider({ children }) {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed reading from localStorage', e);
    }
    return initialData;
  });

  // Save to localStorage on state change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed saving to localStorage', e);
    }
  }, [data]);

  const logActivity = (action, details) => {
    const entry = {
      id: 'act-' + Date.now(),
      timestamp: new Date().toISOString(),
      user: 'Admin (Jewel)',
      action,
      details
    };
    setData(prev => ({
      ...prev,
      activity_log: [entry, ...prev.activity_log]
    }));
  };

  const normalizeVariant = (variant = {}) => {
    const base = { ...variant };
    const unitCost = Number(base.unit_cost ?? base.cost ?? base.landed_cost ?? 0) || 0;
    const retail = Number(base.retail_price ?? base.selling_price ?? base.unit_price ?? 0) || 0;
    const reseller = Number(base.reseller_price ?? base.selling_price ?? base.unit_price ?? 0) || 0;
    return {
      ...base,
      unit_cost: unitCost,
      retail_price: retail,
      reseller_price: reseller,
      selling_price: Number(base.selling_price ?? retail ?? reseller ?? 0) || 0
    };
  };

  const getVariantPriceByType = (variant, saleType = 'Retail') => {
    const normalized = normalizeVariant(variant);
    const type = String(saleType || 'Retail').toLowerCase();

    if (type === 'reseller') {
      return Number(normalized.reseller_price || normalized.retail_price || normalized.selling_price || 0);
    }

    return Number(normalized.retail_price || normalized.selling_price || normalized.reseller_price || 0);
  };

  const getVariantPrice = (variantId, saleType = 'Retail') => {
    const variant = data.variants.find(item => item.id === variantId);
    return getVariantPriceByType(variant, saleType);
  };

  // Compute live stock on hand for each variant: Purchased - Sold - Sponsored +/- Adjustments
  const getVariantStock = (variantId) => {
    // Purchased quantity
    let purchased = 0;
    data.purchases.forEach(b => {
      if (b.status === 'Finalized') {
        b.items.forEach(it => {
          if (it.variant_id === variantId) purchased += Number(it.quantity) || 0;
        });
      }
    });

    // Sold quantity (excluding voided sales)
    let sold = 0;
    data.sales.forEach(s => {
      if (s.variant_id === variantId && s.status !== 'Voided') {
        sold += Number(s.quantity) || 0;
      }
    });

    // Sponsored quantity
    let sponsored = 0;
    data.sponsored_items.forEach(sp => {
      if (sp.variant_id === variantId) {
        sponsored += Number(sp.quantity) || 0;
      }
    });

    // Adjustments
    let adjusted = 0;
    data.stock_adjustments.forEach(adj => {
      if (adj.variant_id === variantId) {
        adjusted += Number(adj.quantity_change) || 0;
      }
    });

    return Math.max(0, purchased - sold - sponsored + adjusted);
  };

  // Get weighted average unit cost for a variant
  const getVariantCost = (variantId) => {
    let totalSpent = 0;
    let totalQty = 0;
    data.purchases.forEach(b => {
      if (b.status === 'Finalized') {
        b.items.forEach(it => {
          if (it.variant_id === variantId) {
            totalSpent += (Number(it.landed_cost) || 0) * (Number(it.quantity) || 0);
            totalQty += Number(it.quantity) || 0;
          }
        });
      }
    });
    if (totalQty > 0) return Number((totalSpent / totalQty).toFixed(2));
    const v = normalizeVariant(data.variants.find(item => item.id === variantId));
    const fallback = Number(v.retail_price || v.reseller_price || v.selling_price || 0) || 0;
    return fallback > 0 ? Number((fallback * 0.5).toFixed(2)) : 300;
  };

  // --- CRUD ACTIONS ---

  // Categories
  const addCategory = (cat) => {
    const newCat = { ...cat, id: 'cat-' + Date.now(), archived_at: null };
    setData(prev => ({ ...prev, categories: [...prev.categories, newCat] }));
    logActivity('Category Created', `Added category: ${newCat.name}`);
    return newCat;
  };

  const updateCategory = (id, cat) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id === id ? { ...c, ...cat } : c)
    }));
    logActivity('Category Updated', `Updated category ID: ${id}`);
  };

  const archiveCategory = (id) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id === id ? { ...c, archived_at: new Date().toISOString() } : c)
    }));
    logActivity('Category Archived', `Archived category ID: ${id}`);
  };

  const restoreCategory = (id) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id === id ? { ...c, archived_at: null } : c)
    }));
    logActivity('Category Restored', `Restored category ID: ${id}`);
  };

  const deleteCategory = (id) => {
    // Check if any designs depend on this category
    const hasDesigns = data.designs.some(d => d.category_id === id);
    if (hasDesigns) {
      alert('Cannot delete: This category has associated designs. Please reassign or delete designs first.');
      return false;
    }
    setData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== id)
    }));
    logActivity('Category Permanently Deleted', `Deleted category ID: ${id}`);
    return true;
  };

  // Designs
  const addDesign = (des) => {
    const newDes = { ...des, id: 'des-' + Date.now(), archived_at: null };
    setData(prev => ({ ...prev, designs: [...prev.designs, newDes] }));
    logActivity('Design Created', `Added design: ${newDes.name}`);
    return newDes;
  };

  const updateDesign = (id, des) => {
    setData(prev => ({
      ...prev,
      designs: prev.designs.map(d => d.id === id ? { ...d, ...des } : d)
    }));
    logActivity('Design Updated', `Updated design ID: ${id}`);
  };

  const archiveDesign = (id) => {
    setData(prev => ({
      ...prev,
      designs: prev.designs.map(d => d.id === id ? { ...d, archived_at: new Date().toISOString() } : d)
    }));
    logActivity('Design Archived', `Archived design ID: ${id}`);
  };

  const restoreDesign = (id) => {
    setData(prev => ({
      ...prev,
      designs: prev.designs.map(d => d.id === id ? { ...d, archived_at: null } : d)
    }));
    logActivity('Design Restored', `Restored design ID: ${id}`);
  };

  const deleteDesign = (id) => {
    // Check if any variants depend on it
    const hasVariants = data.variants.some(v => v.design_id === id);
    if (hasVariants) {
      alert('Cannot delete: This design has active or archived variants.');
      return false;
    }
    setData(prev => ({
      ...prev,
      designs: prev.designs.filter(d => d.id !== id)
    }));
    logActivity('Design Permanently Deleted', `Deleted design ID: ${id}`);
    return true;
  };

  // Variants
  const addVariant = (varItem) => {
    const normalized = normalizeVariant(varItem);
    const newVar = {
      ...normalized,
      id: 'var-' + Date.now(),
      archived_at: null,
      unit_cost: normalized.unit_cost || 0,
      retail_price: normalized.retail_price || normalized.selling_price || 0,
      reseller_price: normalized.reseller_price || normalized.selling_price || 0,
      selling_price: normalized.selling_price || normalized.retail_price || normalized.reseller_price || 0
    };
    setData(prev => ({ ...prev, variants: [...prev.variants, newVar] }));
    logActivity('Variant Created', `Added variant: Size ${newVar.size}, ${newVar.color}`);
    return newVar;
  };

  const updateVariant = (id, varItem) => {
    setData(prev => ({
      ...prev,
      variants: prev.variants.map(v => {
        if (v.id !== id) return v;
        const normalized = normalizeVariant({ ...v, ...varItem });
        return {
          ...v,
          ...varItem,
          ...normalized,
          unit_cost: normalized.unit_cost || 0,
          retail_price: normalized.retail_price || normalized.selling_price || 0,
          reseller_price: normalized.reseller_price || normalized.selling_price || 0,
          selling_price: normalized.selling_price || normalized.retail_price || normalized.reseller_price || 0
        };
      })
    }));
    logActivity('Variant Updated', `Updated variant ID: ${id}`);
  };

  const archiveVariant = (id) => {
    setData(prev => ({
      ...prev,
      variants: prev.variants.map(v => v.id === id ? { ...v, archived_at: new Date().toISOString() } : v)
    }));
    logActivity('Variant Archived', `Archived variant ID: ${id}`);
  };

  const restoreVariant = (id) => {
    setData(prev => ({
      ...prev,
      variants: prev.variants.map(v => v.id === id ? { ...v, archived_at: null } : v)
    }));
    logActivity('Variant Restored', `Restored variant ID: ${id}`);
  };

  const deleteVariant = (id) => {
    // Check if variant has purchase or sale history
    const inSales = data.sales.some(s => s.variant_id === id);
    const inPurchases = data.purchases.some(p => p.items.some(it => it.variant_id === id));
    if (inSales || inPurchases) {
      alert('Cannot delete: This variant has historical sales or purchase records. It can only be kept archived to preserve data integrity.');
      return false;
    }
    setData(prev => ({
      ...prev,
      variants: prev.variants.filter(v => v.id !== id)
    }));
    logActivity('Variant Permanently Deleted', `Deleted variant ID: ${id}`);
    return true;
  };

  // Purchases
  const addPurchaseBatch = (batchData) => {
    const totalQty = batchData.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalExp = batchData.expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    const allocatedPerPair = totalQty > 0 ? totalExp / totalQty : 0;

    const itemsWithCost = batchData.items.map((item, idx) => {
      const unitPrice = Number(item.unit_purchase_price) || 0;
      return {
        id: 'pitem-' + Date.now() + '-' + idx,
        variant_id: item.variant_id,
        quantity: Number(item.quantity) || 0,
        unit_purchase_price: unitPrice,
        allocated_expense: Number(allocatedPerPair.toFixed(2)),
        landed_cost: Number((unitPrice + allocatedPerPair).toFixed(2))
      };
    });

    const newBatch = {
      ...batchData,
      id: 'batch-' + Date.now(),
      status: 'Finalized',
      items: itemsWithCost
    };

    setData(prev => ({
      ...prev,
      purchases: [newBatch, ...prev.purchases]
    }));
    logActivity('Purchase Batch Saved', `Batch from ${newBatch.supplier}: ${totalQty} pairs, total landed cost calculated`);
    return newBatch;
  };

  // Sales (POS)
  const recordSale = (saleData) => {
    const variant = data.variants.find(item => item.id === saleData.variant_id);
    const saleType = saleData.sale_type || 'Retail';
    const available = getVariantStock(saleData.variant_id);
    if ((Number(saleData.quantity) || 0) > available) {
      alert(`Cannot complete sale: requested ${saleData.quantity} pairs, but only ${available} are in stock.`);
      return false;
    }

    const variantPrice = getVariantPriceByType(variant, saleType);
    const effectivePrice = Number(saleData.selling_price) || variantPrice || 0;
    const currentCost = getVariantCost(saleData.variant_id);
    const newSale = {
      ...saleData,
      id: 'sale-' + Date.now(),
      sale_type: saleType,
      selling_price: effectivePrice,
      unit_cost: currentCost,
      status: 'Completed'
    };

    setData(prev => ({
      ...prev,
      sales: [newSale, ...prev.sales]
    }));
    logActivity('Sale Recorded', `Sold ${newSale.quantity} pair(s) at ₱${effectivePrice} each via ${newSale.payment_method} (${saleType})`);
    return newSale;
  };

  const voidSale = (id, reason = 'Entry error') => {
    setData(prev => ({
      ...prev,
      sales: prev.sales.map(s => s.id === id ? { ...s, status: 'Voided', notes: `${s.notes || ''} [Voided: ${reason}]` } : s)
    }));
    logActivity('Sale Voided', `Voided sale ID: ${id}. Reason: ${reason}`);
  };

  // Orders
  const addOrder = (orderData) => {
    const orderNumber = 'ORD-' + new Date().getFullYear() + '-' + String(data.orders.length + 1).padStart(3, '0');
    const newOrder = {
      ...orderData,
      id: 'ord-' + Date.now(),
      order_number: orderNumber,
      order_date: orderData.order_date || new Date().toISOString().slice(0, 10),
      status: orderData.status || 'Pending'
    };
    setData(prev => ({
      ...prev,
      orders: [newOrder, ...prev.orders]
    }));
    logActivity('Order Created', `Created ${orderNumber} for amount ₱${newOrder.total_amount}`);
    return newOrder;
  };

  const updateOrderStatus = (id, status) => {
    setData(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === id ? { ...o, status } : o)
    }));
    logActivity('Order Status Updated', `Order ${id} set to ${status}`);
  };

  const finalizeOrderToSale = (orderId, paymentMethod = 'Cash') => {
    const order = data.orders.find(o => o.id === orderId);
    if (!order) return false;

    // Record each item as a sale
    order.items.forEach(it => {
      recordSale({
        sale_date: new Date().toISOString().slice(0, 10),
        customer_id: order.customer_id,
        variant_id: it.variant_id,
        quantity: it.quantity,
        selling_price: it.selling_price,
        payment_method: paymentMethod,
        sales_channel: 'Online',
        notes: `Converted from order ${order.order_number}`
      });
    });

    updateOrderStatus(orderId, 'Completed');
    return true;
  };

  // Customers
  const addCustomer = (cust) => {
    const newCust = { ...cust, id: 'cust-' + Date.now(), archived_at: null };
    setData(prev => ({ ...prev, customers: [...prev.customers, newCust] }));
    logActivity('Customer Added', `Added customer: ${newCust.name}`);
    return newCust;
  };

  const updateCustomer = (id, cust) => {
    setData(prev => ({
      ...prev,
      customers: prev.customers.map(c => c.id === id ? { ...c, ...cust } : c)
    }));
    logActivity('Customer Updated', `Updated customer ID: ${id}`);
  };

  const archiveCustomer = (id) => {
    setData(prev => ({
      ...prev,
      customers: prev.customers.map(c => c.id === id ? { ...c, archived_at: new Date().toISOString() } : c)
    }));
    logActivity('Customer Archived', `Archived customer ID: ${id}`);
  };

  const restoreCustomer = (id) => {
    setData(prev => ({
      ...prev,
      customers: prev.customers.map(c => c.id === id ? { ...c, archived_at: null } : c)
    }));
    logActivity('Customer Restored', `Restored customer ID: ${id}`);
  };

  const deleteCustomer = (id) => {
    setData(prev => ({
      ...prev,
      customers: prev.customers.filter(c => c.id !== id)
    }));
    logActivity('Customer Permanently Deleted', `Deleted customer ID: ${id}`);
    return true;
  };

  // Sponsors & Sponsored Items
  const addSponsor = (spon) => {
    const newSpon = { ...spon, id: 'spon-' + Date.now(), archived_at: null };
    setData(prev => ({ ...prev, sponsors: [...prev.sponsors, newSpon] }));
    logActivity('Sponsor Added', `Added sponsor: ${newSpon.name}`);
    return newSpon;
  };

  const updateSponsor = (id, spon) => {
    setData(prev => ({
      ...prev,
      sponsors: prev.sponsors.map(s => s.id === id ? { ...s, ...spon } : s)
    }));
  };

  const archiveSponsor = (id) => {
    setData(prev => ({
      ...prev,
      sponsors: prev.sponsors.map(s => s.id === id ? { ...s, archived_at: new Date().toISOString() } : s)
    }));
    logActivity('Sponsor Archived', `Archived sponsor ID: ${id}`);
  };

  const restoreSponsor = (id) => {
    setData(prev => ({
      ...prev,
      sponsors: prev.sponsors.map(s => s.id === id ? { ...s, archived_at: null } : s)
    }));
  };

  const deleteSponsor = (id) => {
    setData(prev => ({
      ...prev,
      sponsors: prev.sponsors.filter(s => s.id !== id)
    }));
    logActivity('Sponsor Deleted', `Deleted sponsor ID: ${id}`);
    return true;
  };

  const recordSponsoredItem = (itemData) => {
    const avail = getVariantStock(itemData.variant_id);
    if (itemData.quantity > avail) {
      alert(`Cannot give away: requested ${itemData.quantity} pairs, but only ${avail} available.`);
      return false;
    }
    const cost = getVariantCost(itemData.variant_id);
    const newSp = {
      ...itemData,
      id: 'spitem-' + Date.now(),
      unit_cost: cost
    };
    setData(prev => ({
      ...prev,
      sponsored_items: [newSp, ...prev.sponsored_items]
    }));
    logActivity('Sponsored Item Given', `Recorded ${newSp.quantity} giveaway pairs for sponsor, marketing cost: ₱${(cost * newSp.quantity).toFixed(2)}`);
    return newSp;
  };

  // Expenses
  const addExpense = (exp) => {
    const newExp = { ...exp, id: 'opex-' + Date.now(), archived_at: null };
    setData(prev => ({ ...prev, expenses: [newExp, ...prev.expenses] }));
    logActivity('Expense Added', `Added ${newExp.category} expense: ₱${newExp.amount}`);
    return newExp;
  };

  const updateExpense = (id, exp) => {
    setData(prev => ({
      ...prev,
      expenses: prev.expenses.map(e => e.id === id ? { ...e, ...exp } : e)
    }));
  };

  const archiveExpense = (id) => {
    setData(prev => ({
      ...prev,
      expenses: prev.expenses.map(e => e.id === id ? { ...e, archived_at: new Date().toISOString() } : e)
    }));
    logActivity('Expense Archived', `Archived expense ID: ${id}`);
  };

  const restoreExpense = (id) => {
    setData(prev => ({
      ...prev,
      expenses: prev.expenses.map(e => e.id === id ? { ...e, archived_at: null } : e)
    }));
  };

  const deleteExpense = (id) => {
    setData(prev => ({
      ...prev,
      expenses: prev.expenses.filter(e => e.id !== id)
    }));
    logActivity('Expense Permanently Deleted', `Deleted expense ID: ${id}`);
    return true;
  };

  // Capital Entries
  const addCapitalEntry = (cap) => {
    const newCap = { ...cap, id: 'cap-' + Date.now(), archived_at: null };
    setData(prev => ({ ...prev, capital_entries: [newCap, ...prev.capital_entries] }));
    logActivity('Capital Entry Added', `${newCap.entry_type}: ₱${newCap.amount} via ${newCap.payment_method}`);
    return newCap;
  };

  const archiveCapitalEntry = (id) => {
    setData(prev => ({
      ...prev,
      capital_entries: prev.capital_entries.map(c => c.id === id ? { ...c, archived_at: new Date().toISOString() } : c)
    }));
    logActivity('Capital Entry Archived', `Archived capital ID: ${id}`);
  };

  const restoreCapitalEntry = (id) => {
    setData(prev => ({
      ...prev,
      capital_entries: prev.capital_entries.map(c => c.id === id ? { ...c, archived_at: null } : c)
    }));
  };

  const deleteCapitalEntry = (id) => {
    setData(prev => ({
      ...prev,
      capital_entries: prev.capital_entries.filter(c => c.id !== id)
    }));
    logActivity('Capital Entry Permanently Deleted', `Deleted capital ID: ${id}`);
    return true;
  };

  // Stock Adjustments
  const addStockAdjustment = (adj) => {
    const newAdj = { ...adj, id: 'adj-' + Date.now() };
    setData(prev => ({
      ...prev,
      stock_adjustments: [newAdj, ...prev.stock_adjustments]
    }));
    logActivity('Stock Adjusted', `Variant ${adj.variant_id}: ${adj.quantity_change > 0 ? '+' : ''}${adj.quantity_change} (${adj.reason})`);
    return newAdj;
  };

  // Settings
  const updateSettings = (newSettings) => {
    setData(prev => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings }
    }));
    logActivity('Settings Updated', 'Business settings updated');
  };

  // Summary Computations (Live Financials)
  const computeFinancials = (selectedMonth = null, selectedYear = null) => {
    // Filter by period if specified
    const matchesPeriod = (dateStr) => {
      if (!dateStr) return true;
      const d = new Date(dateStr);
      if (selectedYear && d.getFullYear() !== Number(selectedYear)) return false;
      if (selectedMonth && (d.getMonth() + 1) !== Number(selectedMonth)) return false;
      return true;
    };

    // Sales Revenue & COGS & Units Sold
    let revenue = 0;
    let cogs = 0;
    let unitsSold = 0;
    let retailRevenue = 0;
    let resellerRevenue = 0;
    let retailProfit = 0;
    let resellerProfit = 0;
    data.sales.forEach(s => {
      if (s.status !== 'Voided' && matchesPeriod(s.sale_date)) {
        const qty = Number(s.quantity) || 0;
        const price = Number(s.selling_price) || 0;
        const cost = Number(s.unit_cost) || 0;
        const saleType = String(s.sale_type || 'Retail').toLowerCase();
        revenue += price * qty;
        cogs += cost * qty;
        unitsSold += qty;

        if (saleType === 'reseller') {
          resellerRevenue += price * qty;
          resellerProfit += (price - cost) * qty;
        } else {
          retailRevenue += price * qty;
          retailProfit += (price - cost) * qty;
        }
      }
    });

    const grossProfit = revenue - cogs;

    // OPEX
    let opex = 0;
    data.expenses.forEach(e => {
      if (!e.archived_at && matchesPeriod(e.expense_date)) {
        opex += Number(e.amount) || 0;
      }
    });

    // Sponsored Items Cost (Marketing Expense)
    let sponsoredCost = 0;
    data.sponsored_items.forEach(sp => {
      if (matchesPeriod(sp.given_date)) {
        sponsoredCost += (Number(sp.unit_cost) || 0) * (Number(sp.quantity) || 0);
      }
    });

    // Net Profit
    const netProfit = grossProfit - sponsoredCost - opex;

    // Capital In & Withdrawals
    let totalCapitalIn = 0;
    let totalWithdrawals = 0;
    data.capital_entries.forEach(c => {
      if (!c.archived_at) {
        if (c.entry_type === 'Capital In') totalCapitalIn += Number(c.amount) || 0;
        else if (c.entry_type === 'Owner Withdrawal') totalWithdrawals += Number(c.amount) || 0;
      }
    });

    const netCapitalInvested = totalCapitalIn - totalWithdrawals;
    const roi = netCapitalInvested > 0 ? Number(((netProfit / netCapitalInvested) * 100).toFixed(1)) : 0;

    // Capital Tied Up In Current Stock
    let capitalTiedUp = 0;
    data.variants.forEach(v => {
      if (!v.archived_at) {
        const stock = getVariantStock(v.id);
        const cost = getVariantCost(v.id);
        capitalTiedUp += stock * cost;
      }
    });

    // Cash On Hand (All cash inflows minus outflows)
    // Inflows: Sales revenue + Capital In
    // Outflows: Purchases expenses + Landed purchases cost + OPEX + Owner withdrawals
    let totalPurchasesCashOut = 0;
    data.purchases.forEach(p => {
      if (p.status === 'Finalized') {
        const itemsCost = p.items.reduce((sum, it) => sum + (Number(it.quantity) * Number(it.unit_purchase_price)), 0);
        const expCost = p.expenses.reduce((sum, ex) => sum + Number(ex.amount), 0);
        totalPurchasesCashOut += itemsCost + expCost;
      }
    });

    const cashOnHand = (revenue + totalCapitalIn) - (totalPurchasesCashOut + opex + totalWithdrawals);

    return {
      revenue,
      cogs,
      grossProfit,
      opex,
      sponsoredCost,
      netProfit,
      roi,
      unitsSold,
      capitalTiedUp,
      cashOnHand: Math.max(0, cashOnHand),
      totalCapitalIn,
      totalWithdrawals,
      netCapitalInvested
    };
  };

  return (
    <DataContext.Provider value={{
      data,
      getVariantStock,
      getVariantCost,
      computeFinancials,
      // Categories
      addCategory,
      updateCategory,
      archiveCategory,
      restoreCategory,
      deleteCategory,
      // Designs
      addDesign,
      updateDesign,
      archiveDesign,
      restoreDesign,
      deleteDesign,
      // Variants
      addVariant,
      updateVariant,
      archiveVariant,
      restoreVariant,
      deleteVariant,
      // Purchases
      addPurchaseBatch,
      // Sales
      recordSale,
      voidSale,
      // Orders
      addOrder,
      updateOrderStatus,
      finalizeOrderToSale,
      // Customers
      addCustomer,
      updateCustomer,
      archiveCustomer,
      restoreCustomer,
      deleteCustomer,
      // Sponsors
      addSponsor,
      updateSponsor,
      archiveSponsor,
      restoreSponsor,
      deleteSponsor,
      recordSponsoredItem,
      // Expenses
      addExpense,
      updateExpense,
      archiveExpense,
      restoreExpense,
      deleteExpense,
      // Capital
      addCapitalEntry,
      archiveCapitalEntry,
      restoreCapitalEntry,
      deleteCapitalEntry,
      // Stock adjustments
      addStockAdjustment,
      // Settings & Log
      updateSettings,
      logActivity
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
