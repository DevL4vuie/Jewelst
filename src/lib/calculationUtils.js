export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return '₱' + num.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function calculateLandedCost(purchasePrice, totalBatchExpenses = 0, totalPairsInBatch = 1) {
  const price = Number(purchasePrice) || 0;
  const expenses = Number(totalBatchExpenses) || 0;
  const pairs = Number(totalPairsInBatch) || 1;
  const allocated = pairs > 0 ? expenses / pairs : 0;
  return Number((price + allocated).toFixed(2));
}

export function calculateNetProfit(grossProfit, sponsoredCost, opex) {
  return (Number(grossProfit) || 0) - (Number(sponsoredCost) || 0) - (Number(opex) || 0);
}

export function calculateROI(netProfit, totalCapitalInvested) {
  const cap = Number(totalCapitalInvested) || 0;
  if (cap <= 0) return 0;
  return Number(((Number(netProfit) || 0) / cap * 100).toFixed(1));
}

export function getPriceForSaleType(variant, saleType = 'Retail') {
  if (!variant) return 0;
  const type = String(saleType || 'Retail').toLowerCase();
  const candidate = type === 'reseller'
    ? Number(variant.reseller_price ?? variant.selling_price ?? variant.retail_price ?? 0)
    : Number(variant.retail_price ?? variant.selling_price ?? variant.reseller_price ?? 0);
  return Number.isFinite(candidate) ? candidate : 0;
}

export function calculateMarginPercent(sellingPrice, unitCost) {
  const price = Number(sellingPrice) || 0;
  const cost = Number(unitCost) || 0;
  if (price <= 0) return 0;
  return Number((((price - cost) / price) * 100).toFixed(1));
}

export function formatItemId(value) {
  if (!value) return 'INV-000';
  const str = String(value).trim();
  if (/^INV-\d+$/i.test(str)) return str;
  return `INV-${String(str).replace(/[^a-z0-9]/gi, '').slice(-6) || '000'}`.toUpperCase();
}

export function formatTransactionId(value) {
  if (!value) return 'TXN-0000';
  const str = String(value).trim();
  if (/^TXN-\d+$/i.test(str)) return str;
  return `TXN-${String(str).replace(/[^a-z0-9]/gi, '').slice(-6) || '0000'}`.toUpperCase();
}

export function createTransactionId() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomValues = new Uint8Array(11);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(randomValues);
  } else {
    randomValues.forEach((_, index) => {
      randomValues[index] = Math.floor(Math.random() * 256);
    });
  }
  const suffix = Array.from(randomValues, value => alphabet[value % alphabet.length]).join('');
  return `JEWELSET-${suffix}`;
}

export function formatJewelsTransactionId(value) {
  if (!value) return createTransactionId();
  const prefix = 'JEWELSET-';
  const source = String(value).trim().toUpperCase();
  if (source.startsWith(prefix) && source.length === 20) return source;
  const suffix = source.replace(/[^A-Z0-9]/g, '').slice(-11).padStart(11, '0');
  return `${prefix}${suffix}`;
}
