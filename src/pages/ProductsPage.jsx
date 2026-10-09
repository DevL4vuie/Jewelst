import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import StatusChip from '../components/ui/StatusChip';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { formatCurrency } from '../lib/calculationUtils';
import {
  Package,
  Plus,
  Edit,
  Archive,
  Layers,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export default function ProductsPage() {
  const {
    data,
    getVariantStock,
    getVariantCost,
    addDesign,
    updateDesign,
    archiveDesign,
    addVariant,
    updateVariant,
    archiveVariant
  } = useData();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Design modal state
  const [designModalOpen, setDesignModalOpen] = useState(false);
  const [editingDesign, setEditingDesign] = useState(null);
  const [designForm, setDesignForm] = useState({
    name: '',
    category_id: '',
    description: '',
    photo_url: ''
  });

  // Variant modal state
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedDesignForVariant, setSelectedDesignForVariant] = useState(null);
  const [editingVariant, setEditingVariant] = useState(null);
  const [variantForm, setVariantForm] = useState({
    size: '7',
    color: 'Tan',
    unit_cost: '250',
    retail_price: '650',
    reseller_price: '550',
    reorder_level: '5'
  });

  // Archive confirm dialog state
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [designToArchive, setDesignToArchive] = useState(null);

  const activeCategories = data.categories.filter(c => !c.archived_at);
  const activeDesigns = data.designs.filter(d => !d.archived_at);

  const filteredDesigns = activeDesigns.filter(d => {
    if (selectedCategory !== 'all' && d.category_id !== selectedCategory) return false;
    if (searchQuery && !d.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleOpenAddDesign = () => {
    setEditingDesign(null);
    setDesignForm({
      name: '',
      category_id: activeCategories[0]?.id || '',
      description: '',
      photo_url: ''
    });
    setDesignModalOpen(true);
  };

  const handleOpenEditDesign = (des) => {
    setEditingDesign(des);
    setDesignForm({
      name: des.name,
      category_id: des.category_id,
      description: des.description || '',
      photo_url: des.photo_url || ''
    });
    setDesignModalOpen(true);
  };

  const handleSaveDesign = (e) => {
    e.preventDefault();
    if (editingDesign) {
      updateDesign(editingDesign.id, designForm);
    } else {
      addDesign(designForm);
    }
    setDesignModalOpen(false);
  };

  const handleOpenAddVariant = (design) => {
    setSelectedDesignForVariant(design);
    setEditingVariant(null);
    setVariantForm({
      size: '7',
      color: 'Tan',
      unit_cost: '250',
      retail_price: '650',
      reseller_price: '550',
      reorder_level: '5'
    });
    setVariantModalOpen(true);
  };

  const handleSaveVariant = (e) => {
    e.preventDefault();
    const payload = {
      size: variantForm.size,
      color: variantForm.color,
      unit_cost: Number(variantForm.unit_cost) || 0,
      retail_price: Number(variantForm.retail_price) || 0,
      reseller_price: Number(variantForm.reseller_price) || 0,
      reorder_level: Number(variantForm.reorder_level) || 5
    };
    if (editingVariant) {
      updateVariant(editingVariant.id, payload);
    } else {
      addVariant({
        design_id: selectedDesignForVariant.id,
        ...payload
      });
    }
    setVariantModalOpen(false);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="pos-title text-2xl" style={{ margin: 0 }}>Sandal Designs & Variants</h1>
          <p className="text-sm text-muted font-bold" style={{ margin: '0.2rem 0 0 0' }}>
            Catalog, Sizes, Colors, Selling Prices & Variant Inventory
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenAddDesign}>
          <Plus size={18} />
          <span>Add New Design</span>
        </Button>
      </div>

      {/* Filter and Category Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={selectedCategory === 'all' ? 'primary' : 'default'}
            onClick={() => setSelectedCategory('all')}
          >
            All Categories ({activeDesigns.length})
          </Button>
          {activeCategories.map(cat => (
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

        <input
          type="text"
          placeholder="Filter designs..."
          className="pos-input w-full"
          style={{ maxWidth: '280px', minHeight: '40px' }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Designs List */}
      <div className="flex flex-col gap-6">
        {filteredDesigns.map((design) => {
          const cat = data.categories.find(c => c.id === design.category_id);
          const variants = data.variants.filter(v => v.design_id === design.id && !v.archived_at);
          const totalStock = variants.reduce((sum, v) => sum + getVariantStock(v.id), 0);

          return (
            <Card key={design.id} tape="blue">
              <div className="flex flex-col md:flex-row gap-4 items-start">
                {/* Product Photo */}
                <div style={{ width: '120px', height: '120px', flexShrink: 0, position: 'relative' }}>
                  {design.photo_url ? (
                    <img
                      src={design.photo_url}
                      alt={design.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '16px',
                        border: '2px solid var(--ink)'
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '16px',
                        border: '2px solid var(--ink)',
                        background: 'var(--butter-soft)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '3rem'
                      }}
                    >
                      👡
                    </div>
                  )}
                </div>

                {/* Details & Variants */}
                <div className="flex-1 w-full">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="pos-title text-xl" style={{ margin: 0 }}>{design.name}</h2>
                        <StatusChip status="new" label={cat?.name || 'Category'} />
                      </div>
                      <p className="text-sm text-muted mt-1 font-bold">
                        {design.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="default" onClick={() => handleOpenEditDesign(design)}>
                        <Edit size={14} />
                        <span>Edit</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setDesignToArchive(design);
                          setArchiveConfirmOpen(true);
                        }}
                      >
                        <Archive size={14} />
                        <span>Archive</span>
                      </Button>
                    </div>
                  </div>

                  {/* Variants Section */}
                  <div style={{ background: 'var(--light-blue)', padding: '0.85rem', borderRadius: '14px', border: '2px solid var(--ink)', marginTop: '0.75rem' }}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-xs">
                        VARIANTS & SIZES ({variants.length} options • {totalStock} pairs total stock)
                      </span>
                      <Button size="sm" variant="success" onClick={() => handleOpenAddVariant(design)}>
                        <Plus size={14} />
                        <span>Add Variant</span>
                      </Button>
                    </div>

                    {variants.length === 0 ? (
                      <div className="text-xs text-muted font-bold py-2">
                        No active variants. Click "Add Variant" to configure sizes and colors.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {variants.map(v => {
                          const stock = getVariantStock(v.id);
                          const cost = getVariantCost(v.id);
                          const retailPrice = Number(v.retail_price ?? v.selling_price ?? 0);
                          const resellerPrice = Number(v.reseller_price ?? v.selling_price ?? 0);
                          const margin = retailPrice > 0 ? (((retailPrice - cost) / retailPrice) * 100).toFixed(0) : 0;

                          return (
                            <div
                              key={v.id}
                              style={{
                                background: 'var(--paper)',
                                border: '2px solid var(--ink)',
                                borderRadius: '10px',
                                padding: '0.5rem 0.75rem'
                              }}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-sm">Size {v.size} • {v.color}</span>
                                <StatusChip
                                  status={stock > v.reorder_level ? 'completed' : stock > 0 ? 'pending' : 'danger'}
                                  label={`${stock} left`}
                                />
                              </div>
                              <div className="flex flex-col gap-1 text-xs text-muted">
                                <span>Retail: <strong style={{ color: 'var(--ink)' }}>{formatCurrency(retailPrice)}</strong></span>
                                <span>Reseller: <strong style={{ color: 'var(--ink)' }}>{formatCurrency(resellerPrice)}</strong></span>
                                <span>Cost: {formatCurrency(cost)} ({margin}% margin)</span>
                              </div>
                              <div className="flex justify-end gap-1 mt-2">
                                <Button
                                  size="sm"
                                  className="pos-btn--sm"
                                  style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem' }}
                                  onClick={() => {
                                    setSelectedDesignForVariant(design);
                                    setEditingVariant(v);
                                    setVariantForm({
                                      size: v.size,
                                      color: v.color,
                                      unit_cost: String(v.unit_cost ?? ''),
                                      retail_price: String(v.retail_price ?? v.selling_price ?? ''),
                                      reseller_price: String(v.reseller_price ?? v.selling_price ?? ''),
                                      reorder_level: String(v.reorder_level)
                                    });
                                    setVariantModalOpen(true);
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem' }}
                                  onClick={() => archiveVariant(v.id)}
                                >
                                  Archive
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add / Edit Design Modal */}
      <Modal
        isOpen={designModalOpen}
        onClose={() => setDesignModalOpen(false)}
        title={editingDesign ? 'Edit Sandal Design' : 'Add New Sandal Design'}
        tape="pink"
      >
        <form onSubmit={handleSaveDesign}>
          <Input
            label="Design Name"
            required
            value={designForm.name}
            onChange={(e) => setDesignForm({ ...designForm, name: e.target.value })}
            placeholder="e.g. Solstice Sun Wedge"
          />

          <Select
            label="Category"
            required
            value={designForm.category_id}
            onChange={(e) => setDesignForm({ ...designForm, category_id: e.target.value })}
          >
            {activeCategories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>

          <Input
            label="Photo URL (Unsplash or image link)"
            value={designForm.photo_url}
            onChange={(e) => setDesignForm({ ...designForm, photo_url: e.target.value })}
            placeholder="https://..."
          />

          <Textarea
            label="Description"
            value={designForm.description}
            onChange={(e) => setDesignForm({ ...designForm, description: e.target.value })}
            placeholder="Material, strap style, sole height..."
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setDesignModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">
              {editingDesign ? 'Update Design' : 'Create Design'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Variant Modal */}
      <Modal
        isOpen={variantModalOpen}
        onClose={() => setVariantModalOpen(false)}
        title={editingVariant ? 'Edit Variant' : `Add Variant to ${selectedDesignForVariant?.name || ''}`}
        tape="blue"
      >
        <form onSubmit={handleSaveVariant}>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Size (e.g. 5, 6, 7, 8, 9)"
              required
              value={variantForm.size}
              onChange={(e) => setVariantForm({ ...variantForm, size: e.target.value })}
            />
            <Input
              label="Color (e.g. Blush Pink, Tan)"
              required
              value={variantForm.color}
              onChange={(e) => setVariantForm({ ...variantForm, color: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Unit Cost (₱)"
              type="number"
              value={variantForm.unit_cost}
              onChange={(e) => setVariantForm({ ...variantForm, unit_cost: e.target.value })}
            />
            <Input
              label="Reorder Alert Level"
              type="number"
              required
              value={variantForm.reorder_level}
              onChange={(e) => setVariantForm({ ...variantForm, reorder_level: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <Input
              label="Retail Price (₱)"
              type="number"
              required
              value={variantForm.retail_price}
              onChange={(e) => setVariantForm({ ...variantForm, retail_price: e.target.value })}
            />
            <Input
              label="Reseller Price (₱)"
              type="number"
              value={variantForm.reseller_price}
              onChange={(e) => setVariantForm({ ...variantForm, reseller_price: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setVariantModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="success">
              {editingVariant ? 'Update Variant' : 'Save Variant'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={archiveConfirmOpen}
        onClose={() => setArchiveConfirmOpen(false)}
        onConfirm={() => {
          if (designToArchive) archiveDesign(designToArchive.id);
        }}
        title="Archive Sandal Design?"
        message={`Are you sure you want to archive "${designToArchive?.name}"? It will be hidden from active lists but kept in historical reports and can be restored from the Archived Records page.`}
        confirmText="Archive Design"
        variant="danger"
      />
    </div>
  );
}
