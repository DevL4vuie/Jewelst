import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusChip from '../components/ui/StatusChip';
import ThermalReceiptModal from '../components/shared/ThermalReceiptModal';
import { formatCurrency } from '../lib/calculationUtils';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Search,
  User,
  CreditCard,
  DollarSign
} from 'lucide-react';

export default function PosPage() {
  const { data, getVariantStock, getVariantCost, recordSale } = useData();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [salesChannel, setSalesChannel] = useState('In Person');
  const [saleType, setSaleType] = useState('Retail');
  const [notes, setNotes] = useState('');

  // Receipt modal state
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastSaleDetails, setLastSaleDetails] = useState(null);

  // Filter designs
  const activeDesigns = data.designs.filter(d => !d.archived_at);
  const filteredDesigns = activeDesigns.filter(d => {
    if (selectedCategory !== 'all' && d.category_id !== selectedCategory) return false;
    if (searchQuery && !d.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Selected design for variant picker modal
  const [activeDesignForPicker, setActiveDesignForPicker] = useState(null);

  const handleOpenVariantPicker = (design) => {
    setActiveDesignForPicker(design);
  };

  const handleAddToCart = (variant, design) => {
    const availableStock = getVariantStock(variant.id);
    if (availableStock <= 0) {
      alert(`Cannot add: Size ${variant.size} (${variant.color}) is out of stock.`);
      return;
    }

    const retailPrice = Number(variant.retail_price ?? variant.selling_price ?? 0);
    const resellerPrice = Number(variant.reseller_price ?? variant.selling_price ?? 0);
    const defaultPrice = saleType === 'Reseller' ? (resellerPrice || retailPrice) : (retailPrice || resellerPrice);

    const existingIndex = cart.findIndex(it => it.variantId === variant.id);
    if (existingIndex >= 0) {
      if (cart[existingIndex].quantity + 1 > availableStock) {
        alert(`Cannot add more: Only ${availableStock} pairs available in stock.`);
        return;
      }
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart(prev => [
        ...prev,
        {
          variantId: variant.id,
          designName: design.name,
          size: variant.size,
          color: variant.color,
          sellingPrice: defaultPrice,
          quantity: 1,
          photoUrl: design.photo_url,
          maxStock: availableStock,
          saleType
        }
      ]);
    }
    setActiveDesignForPicker(null);
  };

  const handleUpdateQty = (variantId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.variantId === variantId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > item.maxStock) {
          alert(`Cannot exceed available stock of ${item.maxStock} pairs.`);
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const handleRemoveFromCart = (variantId) => {
    setCart(prev => prev.filter(it => it.variantId !== variantId));
  };

  const cartTotal = cart.reduce((sum, it) => sum + (it.sellingPrice * it.quantity), 0);
  const totalItemCount = cart.reduce((sum, it) => sum + it.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Your cart is empty. Please select products to sell.');
      return;
    }

    let completedSales = [];

    // Atomically process each cart item as a sale
    for (const item of cart) {
      const variant = data.variants.find(v => v.id === item.variantId);
      const effectivePrice = Number(item.sellingPrice) || Number(variant?.retail_price ?? variant?.selling_price ?? 0) || 0;
      const sale = recordSale({
        sale_date: new Date().toISOString().slice(0, 10),
        customer_id: selectedCustomer || null,
        variant_id: item.variantId,
        quantity: item.quantity,
        selling_price: effectivePrice,
        sale_type: item.saleType || saleType,
        payment_method: paymentMethod,
        sales_channel: salesChannel,
        notes: notes || 'POS counter sale'
      });
      if (sale) completedSales.push(sale);
    }

    // Set details for receipt modal
    const summaryItem = cart[0];
    setLastSaleDetails({
      id: completedSales[0]?.id,
      sale_date: new Date().toLocaleDateString('en-PH'),
      productName: cart.length === 1 ? summaryItem.designName : `${summaryItem.designName} + ${cart.length - 1} more items`,
      variantInfo: cart.length === 1 ? `Size ${summaryItem.size}, ${summaryItem.color}` : `${totalItemCount} pairs total`,
      quantity: totalItemCount,
      selling_price: cartTotal / totalItemCount,
      payment_method: paymentMethod,
      sales_channel: salesChannel
    });

    setCart([]);
    setNotes('');
    setReceiptOpen(true);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="pos-title text-2xl" style={{ margin: 0 }}>Point of Sale Terminal</h1>
          <p className="text-sm text-muted font-bold" style={{ margin: '0.2rem 0 0 0' }}>
            Instant Sandal Checkout, Inventory Sync & Thermal Receipts
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Product Catalog & Tiles (2 cols) */}
        <div className="lg:col-span-2">
          {/* Category Filter Pills & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedCategory === 'all' ? 'primary' : 'default'}
                onClick={() => setSelectedCategory('all')}
              >
                All Footwear
              </Button>
              {data.categories.filter(c => !c.archived_at).map(cat => (
                <Button
                  key={cat.id}
                  size="sm"
                  variant={selectedCategory === cat.id ? 'primary' : 'default'}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.name}
                </Button>
              ))}
            </div>

            <div className="relative w-full" style={{ maxWidth: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '14px', color: 'rgba(29, 42, 87, 0.4)' }} />
              <input
                type="text"
                placeholder="Search sandals..."
                className="pos-input"
                style={{ paddingLeft: '2.2rem', minHeight: '40px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Product Tiles Grid with rotating pastel tints */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-4">
            {filteredDesigns.map((design) => {
              const variants = data.variants.filter(v => v.design_id === design.id && !v.archived_at);
              const totalStock = variants.reduce((sum, v) => sum + getVariantStock(v.id), 0);
              const minPrice = variants.length > 0 ? Math.min(...variants.map(v => Number(v.retail_price ?? v.selling_price ?? 0))) : 0;

              return (
                <div
                  key={design.id}
                  className="pos-tile"
                  onClick={() => handleOpenVariantPicker(design)}
                  title={`Click to pick size & color for ${design.name}`}
                >
                  {design.photo_url ? (
                    <img
                      src={design.photo_url}
                      alt={design.name}
                      style={{
                        width: '100%',
                        height: '110px',
                        objectFit: 'cover',
                        borderRadius: '16px',
                        border: '2px solid var(--ink)'
                      }}
                    />
                  ) : (
                    <div style={{ height: '110px', display: 'flex', alignItems: 'center', fontSize: '3rem' }}>
                      👡
                    </div>
                  )}

                  <div className="w-full text-center">
                    <div className="font-bold text-sm" style={{ lineHeight: 1.2 }}>{design.name}</div>
                    <div className="text-xs font-bold mt-1" style={{ color: 'var(--ink)' }}>
                      From {formatCurrency(minPrice)}
                    </div>
                    <div className="mt-1">
                      <StatusChip
                        status={totalStock > 0 ? 'completed' : 'danger'}
                        label={totalStock > 0 ? `${totalStock} in stock` : 'Sold out'}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Cart & Checkout Panel (1 col) */}
        <div>
          <Card tape="blue">
            <div className="flex items-center justify-between pb-3 mb-3" style={{ borderBottom: '2.5px solid var(--ink)' }}>
              <div className="flex items-center gap-2">
                <ShoppingCart size={20} />
                <h2 className="pos-title text-lg" style={{ margin: 0 }}>Active Cart</h2>
              </div>
              <span className="pos-chip pos-chip--mint font-bold">
                {totalItemCount} items
              </span>
            </div>

            {/* Cart Items List */}
            <div style={{ maxHeight: '260px', overflowY: 'auto', marginBottom: '1rem' }}>
              {cart.length === 0 ? (
                <div className="text-center py-6 text-muted font-bold text-sm">
                  Cart is currently empty.<br />Click on a sandal tile to add variants.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {cart.map((item) => (
                    <div
                      key={item.variantId}
                      className="flex items-center justify-between p-2"
                      style={{
                        background: 'var(--paper)',
                        border: '2px solid var(--ink)',
                        borderRadius: '12px'
                      }}
                    >
                      <div className="flex-1">
                        <div className="font-bold text-xs">{item.designName}</div>
                        <div className="text-xs text-muted">
                          Size {item.size} • {item.color}
                        </div>
                        <div className="text-xs font-bold" style={{ color: 'var(--ink)' }}>
                          {formatCurrency(item.sellingPrice)} each
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          className="pos-btn--icon"
                          style={{ width: '28px', height: '28px' }}
                          onClick={() => handleUpdateQty(item.variantId, -1)}
                        >
                          <Minus size={12} />
                        </Button>
                        <span className="font-bold text-sm px-1">{item.quantity}</span>
                        <Button
                          size="sm"
                          className="pos-btn--icon"
                          style={{ width: '28px', height: '28px' }}
                          onClick={() => handleUpdateQty(item.variantId, 1)}
                        >
                          <Plus size={12} />
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          className="pos-btn--icon"
                          style={{ width: '28px', height: '28px', marginLeft: '4px' }}
                          onClick={() => handleRemoveFromCart(item.variantId)}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Checkout Form Options */}
            <div style={{ borderTop: '2px dashed rgba(29, 42, 87, 0.25)', paddingTop: '0.75rem' }}>
              <div className="mb-2">
                <label className="pos-label">Customer (Optional)</label>
                <select
                  className="pos-select"
                  style={{ minHeight: '38px', fontSize: '0.85rem' }}
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                >
                  <option value="">Walk-in Customer (Anonymous)</option>
                  {data.customers.filter(c => !c.archived_at).map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone || 'No phone'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="pos-label">Sale Type</label>
                  <select
                    className="pos-select"
                    style={{ minHeight: '38px', fontSize: '0.85rem' }}
                    value={saleType}
                    onChange={(e) => setSaleType(e.target.value)}
                  >
                    <option value="Retail">Retail</option>
                    <option value="Reseller">Reseller</option>
                  </select>
                </div>
                <div>
                  <label className="pos-label">Channel</label>
                  <select
                    className="pos-select"
                    style={{ minHeight: '38px', fontSize: '0.85rem' }}
                    value={salesChannel}
                    onChange={(e) => setSalesChannel(e.target.value)}
                  >
                    <option value="In Person">In Person</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
              </div>

              <div className="mb-2">
                <label className="pos-label">Payment</label>
                <select
                  className="pos-select"
                  style={{ minHeight: '38px', fontSize: '0.85rem' }}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="GCash">GCash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Total & Checkout Button */}
              <div className="flex justify-between items-center py-2 mb-3" style={{ borderTop: '2px solid var(--ink)', borderBottom: '2px solid var(--ink)' }}>
                <span className="font-bold text-base">TOTAL DUE:</span>
                <span className="font-bold text-xl" style={{ color: 'var(--ink)' }}>
                  {formatCurrency(cartTotal)}
                </span>
              </div>

              <Button
                variant="primary"
                className="w-full text-base"
                style={{ minHeight: '50px' }}
                disabled={cart.length === 0}
                onClick={handleCheckout}
              >
                <CheckCircle size={20} />
                <span>Complete Transaction ({formatCurrency(cartTotal)})</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Variant Picker Modal */}
      {activeDesignForPicker && (
        <div className="pos-modal-overlay" onClick={() => setActiveDesignForPicker(null)}>
          <div className="pos-modal-dialog pos-tape" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <h2 className="pos-title text-lg mb-1">{activeDesignForPicker.name}</h2>
            <p className="text-xs text-muted mb-4 font-bold">Select size & color to add to cart</p>

            <div className="flex flex-col gap-2 mb-4">
              {data.variants
                .filter(v => v.design_id === activeDesignForPicker.id && !v.archived_at)
                .map((v) => {
                  const stock = getVariantStock(v.id);
                  return (
                    <div
                      key={v.id}
                      className="flex items-center justify-between p-3"
                      style={{
                        background: 'var(--paper)',
                        border: '2px solid var(--ink)',
                        borderRadius: '12px'
                      }}
                    >
                      <div>
                        <div className="font-bold text-sm">
                          Size {v.size} • Color: {v.color}
                        </div>
                        <div className="text-xs font-bold" style={{ color: 'var(--ink)' }}>
                          Retail: {formatCurrency(Number(v.retail_price ?? v.selling_price ?? 0))} • Reseller: {formatCurrency(Number(v.reseller_price ?? v.selling_price ?? 0))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusChip
                          status={stock > 0 ? 'completed' : 'danger'}
                          label={`${stock} in stock`}
                        />
                        <Button
                          size="sm"
                          variant="success"
                          disabled={stock <= 0}
                          onClick={() => handleAddToCart(v, activeDesignForPicker)}
                        >
                          Add to Cart
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setActiveDesignForPicker(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      <ThermalReceiptModal
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        saleDetails={lastSaleDetails}
        businessName={data.settings.business_name}
      />
    </div>
  );
}
