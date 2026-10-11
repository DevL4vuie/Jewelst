import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { calculateLandedCost, createTransactionId } from '../lib/calculationUtils';
import { deleteLocalImage } from '../lib/localImageStorage';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

const DATA_COLLECTIONS = [
  'categories',
  'designs',
  'variants',
  'purchases',
  'sales',
  'orders',
  'customers',
  'sponsors',
  'sponsored_items',
  'expenses',
  'capital_entries',
  'stock_adjustments',
  'activity_log'
];

const createRecordId = prefix => (
  `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`
);

function isRetryableStorageError(error) {
  const status = Number(error?.statusCode || error?.status);
  return status === 408 || status === 429 || status >= 500 ||
    /failed to fetch|fetch failed|networkerror|network request failed|load failed/i.test(error?.message || '');
}

async function removeDesignImages(paths) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let error;
    try {
      ({ error } = await supabase.storage.from('design-images').remove(paths));
    } catch (caughtError) {
      error = caughtError;
    }
    if (!error) return;
    if (!isRetryableStorageError(error) || attempt === 3) throw error;
    await new Promise(resolve => window.setTimeout(resolve, 400 * (2 ** (attempt - 1))));
  }
}

async function loadSharedData() {
  if (!supabase) throw new Error('Supabase is not configured.');

  const tables = [
    'categories', 'customers', 'sponsors', 'designs', 'variants',
    'purchases', 'purchase_items', 'purchase_expenses', 'sales', 'orders',
    'order_items', 'sponsored_items', 'expenses', 'capital_entries',
    'stock_adjustments', 'activity_log', 'business_settings'
  ];
  const results = await Promise.all(tables.map(async table => {
    const rows = [];
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const { data: page, error } = await supabase
        .from(table)
        .select('*')
        .range(offset, offset + pageSize - 1);
      if (error) return { data: null, error };
      rows.push(...(page || []));
      if (!page || page.length < pageSize) return { data: rows, error: null };
    }
  }));
  const failedIndex = results.findIndex(result => result.error);
  if (failedIndex >= 0) {
    throw new Error(`Could not read ${tables[failedIndex]}: ${results[failedIndex].error.message}`);
  }

  const rowsByTable = Object.fromEntries(tables.map((table, index) => [table, results[index].data || []]));
  const records = table => rowsByTable[table].map(row => ({
    ...(row.data || {}),
    id: row.id,
    ...(row.category_id !== undefined ? { category_id: row.category_id } : {}),
    ...(row.design_id !== undefined ? { design_id: row.design_id } : {}),
    ...(row.variant_id !== undefined ? { variant_id: row.variant_id } : {}),
    ...(row.customer_id !== undefined ? { customer_id: row.customer_id } : {}),
    ...(row.sponsor_id !== undefined ? { sponsor_id: row.sponsor_id } : {})
  }));
  const purchaseItems = rowsByTable.purchase_items;
  const purchaseExpenses = rowsByTable.purchase_expenses;
  const orderItems = rowsByTable.order_items;

  return {
    settings: rowsByTable.business_settings.reduce((settings, row) => ({
      ...settings,
      [row.setting_key]: row.setting_value
    }), {}),
    categories: records('categories'),
    customers: records('customers'),
    sponsors: records('sponsors'),
    designs: records('designs'),
    variants: records('variants'),
    purchases: records('purchases').map(purchase => ({
      ...purchase,
      items: purchaseItems
        .filter(item => item.purchase_id === purchase.id)
        .map(item => ({ ...(item.data || {}), id: item.id, variant_id: item.variant_id })),
      expenses: purchaseExpenses
        .filter(expense => expense.purchase_id === purchase.id)
        .map(expense => ({ ...(expense.data || {}), id: expense.id }))
    })),
    sales: records('sales'),
    orders: records('orders').map(order => ({
      ...order,
      items: orderItems
        .filter(item => item.order_id === order.id)
        .map(item => ({ ...(item.data || {}), id: item.id, variant_id: item.variant_id }))
    })),
    sponsored_items: records('sponsored_items'),
    expenses: records('expenses'),
    capital_entries: records('capital_entries'),
    stock_adjustments: records('stock_adjustments'),
    activity_log: records('activity_log')
  };
}

// Empty starting data — no hardcoded seed records
const initialData = {
  settings: {
    business_name: "Jewel's Sandals",
    receipt_subtitle: 'Boutique Sandal Management',
    receipt_address: 'Taguig City, Metro Manila',
    receipt_phone: '(02) 8888-SANDAL',
    receipt_thank_you: 'Thank you for shopping with us!',
    receipt_warranty_note: 'Please keep this receipt for warranty/exchange.',
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

function getStateChanges(previous, next) {
  const changes = {};
  DATA_COLLECTIONS.forEach(collection => {
    const previousRecords = previous?.[collection] || [];
    const nextRecords = next?.[collection] || [];
    const previousById = new Map(previousRecords.map(record => [record.id, record]));
    const nextById = new Map(nextRecords.map(record => [record.id, record]));
    const upsert = nextRecords.filter(record => (
      !previousById.has(record.id) ||
      JSON.stringify(previousById.get(record.id)) !== JSON.stringify(record)
    ));
    const deleted = previousRecords
      .filter(record => !nextById.has(record.id))
      .map(record => record.id);

    if (upsert.length || deleted.length) {
      changes[collection] = { upsert, delete: deleted };
    }
  });

  const settingsChanges = {};
  Object.entries(next?.settings || {}).forEach(([key, value]) => {
    if (JSON.stringify(previous?.settings?.[key]) !== JSON.stringify(value)) {
      settingsChanges[key] = value;
    }
  });

  return {
    changes,
    settings: Object.keys(settingsChanges).length ? settingsChanges : null
  };
}

function applyStateChanges(base, changes, settings) {
  const merged = { ...base };
  Object.entries(changes).forEach(([collection, delta]) => {
    const deleted = new Set(delta.delete);
    const upserts = new Map(delta.upsert.map(record => [record.id, record]));
    const existing = base[collection] || [];
    const ids = new Set(existing.map(record => record.id));
    merged[collection] = existing
      .filter(record => !deleted.has(record.id))
      .map(record => upserts.get(record.id) || record);
    delta.upsert.forEach(record => {
      if (!ids.has(record.id) && !deleted.has(record.id)) merged[collection].push(record);
    });
  });
  if (settings) merged.settings = { ...base.settings, ...settings };
  return merged;
}

export function DataProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [syncError, setSyncError] = useState('');
  const [loadRetryCount, setLoadRetryCount] = useState(0);
  const [syncRetryCount, setSyncRetryCount] = useState(0);
  const [loadedUserId, setLoadedUserId] = useState(null);
  const dataRef = useRef(data);
  const persistedDataRef = useRef(null);
  const writeInProgressRef = useRef(false);
  const authUserIdRef = useRef(user?.id);
  const loadGenerationRef = useRef(0);

  dataRef.current = data;
  authUserIdRef.current = user?.id;

  useEffect(() => {
    const generation = ++loadGenerationRef.current;
    if (authLoading) return undefined;

    let active = true;
    setLoadError('');
    setSyncError('');
    persistedDataRef.current = null;
    setLoadedUserId(null);

    if (!user) {
      setData(initialData);
      setLoading(false);
      return () => { active = false; };
    }

    if (!supabase) {
      setLoadError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild the app.');
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    loadSharedData()
      .then(remoteData => {
        if (!active || loadGenerationRef.current !== generation) return;

        const normalizedData = {
          ...initialData,
          ...remoteData,
          settings: { ...initialData.settings, ...remoteData.settings }
        };
        persistedDataRef.current = normalizedData;
        setData(normalizedData);
        setLoadedUserId(user.id);
        setLoading(false);
      })
      .catch(error => {
        if (!active || loadGenerationRef.current !== generation) return;
        console.error('Could not load shared business data from Supabase:', error);
        setLoadError(`Could not load business data from Supabase. ${error.message || 'Check the database setup and connection.'}`);
        setLoading(false);
      });

    return () => { active = false; };
  }, [authLoading, user?.id, loadRetryCount]);

  useEffect(() => {
    if (!supabase || !user || loadedUserId !== user.id || !persistedDataRef.current) return undefined;

    const generation = loadGenerationRef.current;
    const syncUserId = user.id;
    let active = true;
    let refreshRequestId = 0;
    const refreshFromRemote = async () => {
      if (!active || writeInProgressRef.current) return;
      const requestId = ++refreshRequestId;
      const remoteData = await loadSharedData();
      if (!active || requestId !== refreshRequestId ||
          loadGenerationRef.current !== generation || authUserIdRef.current !== syncUserId) return;
      const localChanges = getStateChanges(persistedDataRef.current, dataRef.current);
      const normalizedRemote = {
        ...initialData,
        ...remoteData,
        settings: { ...initialData.settings, ...remoteData.settings }
      };
      persistedDataRef.current = normalizedRemote;
      setData(current => applyStateChanges(normalizedRemote, localChanges.changes, localChanges.settings));
    };
    const syncChannel = supabase.channel(`business-state-${user.id}`);
    [
      'categories', 'customers', 'sponsors', 'designs', 'variants',
      'purchases', 'purchase_items', 'purchase_expenses', 'sales', 'orders',
      'order_items', 'sponsored_items', 'expenses', 'capital_entries',
      'stock_adjustments', 'activity_log', 'business_settings'
    ].forEach(table => {
      syncChannel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table
      }, () => {
        refreshFromRemote().catch(error => {
          if (!active) return;
          console.error('Could not refresh shared business data:', error);
          setSyncError(`Live data refresh failed. ${error.message || 'Check your connection and retry.'}`);
        });
      });
    });
    syncChannel
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setSyncError('Live updates are disconnected. Reload the page to restore synchronization.');
        }
      });

    return () => {
      active = false;
      supabase.removeChannel(syncChannel);
    };
  }, [user?.id, loadedUserId]);

  useEffect(() => {
    if (!supabase || !user || loadedUserId !== user.id || !persistedDataRef.current || writeInProgressRef.current) return;

    const generation = loadGenerationRef.current;
    const syncUserId = user.id;
    const snapshot = data;
    const previousData = persistedDataRef.current;
    const { changes, settings } = getStateChanges(persistedDataRef.current, snapshot);
    if (Object.keys(changes).length === 0 && !settings) return;

    writeInProgressRef.current = true;
    supabase.rpc('apply_jewelst_changes', {
      p_changes: changes,
      p_settings: settings
    }).then(async ({ error }) => {
      if (error) throw error;
      if (loadGenerationRef.current !== generation || authUserIdRef.current !== syncUserId) return;
      const remoteData = await loadSharedData();
      if (loadGenerationRef.current !== generation || authUserIdRef.current !== syncUserId) return;
      const normalizedRemote = {
        ...initialData,
        ...remoteData,
        settings: { ...initialData.settings, ...remoteData.settings }
      };
      const retainedPhotoPaths = new Set(
        normalizedRemote.designs.map(design => design.photo_path).filter(Boolean)
      );
      const removedPhotoPaths = [...new Set(
        (previousData?.designs || [])
          .map(design => design.photo_path)
          .filter(path => path && !retainedPhotoPaths.has(path))
      )];
      persistedDataRef.current = normalizedRemote;
      const changesDuringWrite = getStateChanges(snapshot, dataRef.current);
      setData(applyStateChanges(normalizedRemote, changesDuringWrite.changes, changesDuringWrite.settings));
      setSyncError('');
      if (removedPhotoPaths.length) {
        try {
          await removeDesignImages(removedPhotoPaths);
        } catch (error) {
          console.error('Design details were saved, but replaced or removed images could not be deleted from Supabase Storage:', error);
          setSyncError(
            `Design details were saved, but an old image could not be removed from Supabase Storage. ${error.message || 'Check your connection and retry.'}`
          );
        }
      }
    }).catch(error => {
      if (loadGenerationRef.current !== generation || authUserIdRef.current !== syncUserId) return;
      console.error('Could not save business data to Supabase:', error);
      const detail = error.message === 'Failed to fetch'
        ? 'The app could not reach Supabase. Check the device’s internet connection and confirm the deployed VITE_SUPABASE_URL is correct.'
        : error.message || 'Check your connection and retry.';
      setSyncError(`Changes are not saved to Supabase. ${detail}`);
    }).finally(() => {
      writeInProgressRef.current = false;
      if (loadGenerationRef.current !== generation && authUserIdRef.current) {
        setSyncRetryCount(count => count + 1);
      }
    });
  }, [data, loadedUserId, syncRetryCount, user?.id]);

  const retryDataSync = () => {
    if (loadError) {
      setLoadRetryCount(count => count + 1);
    } else {
      setSyncRetryCount(count => count + 1);
    }
    setLoadError('');
    setSyncError('');
  };

  const logActivity = (action, details) => {
    const entry = {
      id: createRecordId('act'),
      timestamp: new Date().toISOString(),
      user: user?.full_name || user?.email || 'Authenticated user',
      action,
      details
    };
    setData(prev => ({
      ...prev,
      activity_log: [entry, ...prev.activity_log]
    }));
  };

  const clearActivityLog = () => {
    setData(prev => ({ ...prev, activity_log: [] }));
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
    const newCat = { ...cat, id: createRecordId('cat'), archived_at: null };
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
    const newDes = { ...des, id: createRecordId('des'), archived_at: null };
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

  const deleteDesign = async (id) => {
    const dependentVariants = data.variants.filter(variant => variant.design_id === id);
    const variantsWithHistory = dependentVariants.filter(variant => (
      data.sales.some(sale => sale.variant_id === variant.id) ||
      data.purchases.some(purchase => purchase.items?.some(item => item.variant_id === variant.id)) ||
      data.orders.some(order => order.items?.some(item => item.variant_id === variant.id)) ||
      data.sponsored_items.some(item => item.variant_id === variant.id) ||
      data.stock_adjustments.some(adjustment => adjustment.variant_id === variant.id)
    ));
    if (variantsWithHistory.length > 0) {
      const labels = variantsWithHistory
        .map(variant => `size ${variant.size} (${variant.color})`)
        .join(', ');
      throw new Error(
        `Cannot delete this design because its variant${variantsWithHistory.length > 1 ? 's are' : ' is'} linked to historical records: ${labels}. Keep the design archived to preserve sales, purchase, order, giveaway, and stock adjustment history.`
      );
    }
    const design = data.designs.find(item => item.id === id);
    if (design?.photo_path) {
      if (!supabase) throw new Error('Cannot delete this design image because Supabase is not configured.');
      const { error } = await supabase.storage
        .from('design-images')
        .remove([design.photo_path]);
      if (error) {
        console.error('Could not delete the design image from Supabase Storage:', error);
        throw new Error(`The design was not deleted because its image could not be removed from storage. ${error.message}`);
      }
    }
    if (design?.photo_ref) {
      try {
        await deleteLocalImage(design.photo_ref);
      } catch (error) {
        console.error('Could not delete the design image from local storage:', error);
        throw new Error(`The design was not deleted because its locally stored image could not be removed. ${error.message}`);
      }
    }
    setData(prev => ({
      ...prev,
      designs: prev.designs.filter(d => d.id !== id),
      variants: prev.variants.filter(variant => variant.design_id !== id)
    }));
    logActivity(
      'Design Permanently Deleted',
      `Deleted design ID: ${id} and ${dependentVariants.length} unused variant(s)`
    );
    return true;
  };

  // Variants
  const addVariant = (varItem) => {
    const normalized = normalizeVariant(varItem);
    const newVar = {
      ...normalized,
      id: createRecordId('var'),
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
    // Preserve variant references used by any historical inventory record.
    const inSales = data.sales.some(s => s.variant_id === id);
    const inPurchases = data.purchases.some(p => p.items.some(it => it.variant_id === id));
    const inOrders = data.orders.some(order => order.items?.some(item => item.variant_id === id));
    const inSponsoredItems = data.sponsored_items.some(item => item.variant_id === id);
    const inAdjustments = data.stock_adjustments.some(item => item.variant_id === id);
    if (inSales || inPurchases || inOrders || inSponsoredItems || inAdjustments) {
      alert('Cannot delete: This variant has historical inventory records. It can only be kept archived to preserve data integrity.');
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
        id: createRecordId(`pitem-${idx}`),
        variant_id: item.variant_id,
        quantity: Number(item.quantity) || 0,
        unit_purchase_price: unitPrice,
        allocated_expense: Number(allocatedPerPair.toFixed(2)),
        landed_cost: Number((unitPrice + allocatedPerPair).toFixed(2))
      };
    });

    const newBatch = {
      ...batchData,
      id: createRecordId('batch'),
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
      return { error: `Cannot complete sale: requested ${saleData.quantity} pairs, but only ${available} are in stock.` };
    }

    const variantPrice = getVariantPriceByType(variant, saleType);
    const effectivePrice = Number(saleData.selling_price) || variantPrice || 0;
    const currentCost = getVariantCost(saleData.variant_id);
    const newSale = {
      ...saleData,
      id: createRecordId('sale'),
      transaction_time: saleData.transaction_time || new Date().toISOString(),
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

  const voidSale = (idOrIds, reason = 'Entry error') => {
    const ids = new Set(Array.isArray(idOrIds) ? idOrIds : [idOrIds]);
    setData(prev => ({
      ...prev,
      sales: prev.sales.map(s => ids.has(s.id)
        ? { ...s, status: 'Voided', notes: `${s.notes || ''} [Voided: ${reason}]` }
        : s)
    }));
    logActivity('Sale Voided', `Voided ${ids.size} sale line(s). Reason: ${reason}`);
  };

  // Orders
  const addOrder = (orderData) => {
    const orderNumber = 'ORD-' + new Date().getFullYear() + '-' + String(data.orders.length + 1).padStart(3, '0');
    const newOrder = {
      ...orderData,
      id: createRecordId('ord'),
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
    if (!order || !Array.isArray(order.items) || order.items.length === 0) {
      return 'Cannot complete this order: no order items were found.';
    }
    if (order.status === 'Completed' || order.status === 'Cancelled') {
      return `Cannot complete this order because its status is ${order.status.toLowerCase()}.`;
    }

    const quantityByVariant = order.items.reduce((totals, item) => {
      totals[item.variant_id] = (totals[item.variant_id] || 0) + (Number(item.quantity) || 0);
      return totals;
    }, {});
    for (const [variantId, quantity] of Object.entries(quantityByVariant)) {
      const available = getVariantStock(variantId);
      if (quantity < 1 || quantity > available) {
        const variant = data.variants.find(item => item.id === variantId);
        return `Cannot complete order: requested ${quantity} pair(s) of size ${variant?.size || '?'} (${variant?.color || 'unknown'}), but only ${available} are in stock.`;
      }
    }

    const saleDate = new Date().toISOString().slice(0, 10);
    const transactionTime = new Date().toISOString();
    const saleType = order.sale_type || 'Retail';
    const transactionId = createTransactionId();
    const sales = order.items.map((item, index) => ({
      id: createRecordId(`sale-${index}`),
      order_id: order.id,
      order_number: order.order_number,
      transaction_id: transactionId,
      sale_date: saleDate,
      transaction_time: transactionTime,
      customer_id: order.customer_id,
      variant_id: item.variant_id,
      quantity: Number(item.quantity),
      selling_price: Number(item.selling_price) || getVariantPrice(item.variant_id, saleType),
      sale_type: saleType,
      unit_cost: getVariantCost(item.variant_id),
      payment_method: paymentMethod,
      sales_channel: 'Online',
      notes: `Converted from order ${order.order_number}`,
      status: 'Completed'
    }));

    setData(prev => ({
      ...prev,
      sales: [...sales, ...prev.sales],
      orders: prev.orders.map(item => item.id === orderId ? { ...item, status: 'Completed' } : item)
    }));
    logActivity('Order Completed', `Completed ${order.order_number} with ${sales.length} item line(s), total ₱${order.total_amount}`);
    return true;
  };

  // Customers
  const addCustomer = (cust) => {
    const newCust = { ...cust, id: createRecordId('cust'), archived_at: null };
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
    const newSpon = { ...spon, id: createRecordId('spon'), archived_at: null };
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
      id: createRecordId('spitem'),
      unit_cost: cost
    };
    setData(prev => ({
      ...prev,
      sponsored_items: [newSp, ...prev.sponsored_items]
    }));
    logActivity('Sponsored Item Given', `Recorded ${newSp.quantity} giveaway pairs for sponsor, marketing cost: ₱${(cost * newSp.quantity).toFixed(2)}`);
    return newSp;
  };

  const recordSponsoredItems = (items) => {
    const giveawayId = createTransactionId();
    const transactionTime = new Date().toISOString();
    const quantityByVariant = items.reduce((totals, item) => {
      totals[item.variant_id] = (totals[item.variant_id] || 0) + Number(item.quantity || 0);
      return totals;
    }, {});
    for (const [variantId, quantity] of Object.entries(quantityByVariant)) {
      const available = getVariantStock(variantId);
      if (quantity > available) {
        const variant = data.variants.find(item => item.id === variantId);
        return {
          error: `Cannot give away ${quantity} pair(s) of size ${variant?.size || '?'} (${variant?.color || 'unknown'}); only ${available} are available.`
        };
      }
    }

    const newItems = items.map(item => ({
      ...item,
      giveaway_id: giveawayId,
      transaction_time: transactionTime,
      id: createRecordId('spitem'),
      unit_cost: getVariantCost(item.variant_id)
    }));
    setData(prev => ({
      ...prev,
      sponsored_items: [...newItems, ...prev.sponsored_items]
    }));
    const pairCount = newItems.reduce((total, item) => total + Number(item.quantity), 0);
    const totalCost = newItems.reduce((total, item) => total + item.unit_cost * Number(item.quantity), 0);
    logActivity('Sponsored Items Given', `Recorded ${pairCount} giveaway pair(s) for sponsor, marketing cost: ₱${totalCost.toFixed(2)}`);
    return { items: newItems };
  };

  // Expenses
  const addExpense = (exp) => {
    const newExp = { ...exp, id: createRecordId('opex'), archived_at: null };
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
    const newCap = { ...cap, id: createRecordId('cap'), archived_at: null };
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
    const newAdj = { ...adj, id: createRecordId('adj') };
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
      loading,
      loadError,
      syncError,
      retryDataSync,
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
      recordSponsoredItems,
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
      logActivity,
      clearActivityLog
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
