import React, { useEffect, useRef, useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import StatusChip from '../components/ui/StatusChip';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import DesignImage from '../components/shared/DesignImage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../lib/calculationUtils';
import {
  Package,
  Plus,
  Edit,
  Archive,
  Layers,
  Sparkles,
  ChevronRight,
  LoaderCircle
} from 'lucide-react';

const DESIGN_IMAGE_UPLOAD_ATTEMPTS = 3;

function isRetryableImageUploadError(error) {
  const status = Number(error?.statusCode || error?.status);
  return status === 408 || status === 429 || status >= 500 ||
    /failed to fetch|fetch failed|networkerror|network request failed|load failed/i.test(error?.message || '');
}

function wait(milliseconds) {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

export default function ProductsPage() {
  const { user } = useAuth();
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
    photo_url: '',
    photo_ref: '',
    photo_path: ''
  });
  const [designPhoto, setDesignPhoto] = useState(null);
  const [designPhotoPreview, setDesignPhotoPreview] = useState('');
  const [designSaveError, setDesignSaveError] = useState('');
  const [savingDesign, setSavingDesign] = useState(false);
  const [designSaveStage, setDesignSaveStage] = useState('');
  const [designSaveNotice, setDesignSaveNotice] = useState('');
  const designPhotoInputRef = useRef(null);

  // Variant modal state
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedDesignForVariant, setSelectedDesignForVariant] = useState(null);
  const [editingVariant, setEditingVariant] = useState(null);
  const [variantForm, setVariantForm] = useState({
    size: '',
    color: '',
    unit_cost: '',
    retail_price: '',
    reseller_price: '',
    reorder_level: ''
  });

  // Archive confirm dialog state
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [designToArchive, setDesignToArchive] = useState(null);
  const [variantToArchive, setVariantToArchive] = useState(null);

  const activeCategories = data.categories.filter(c => !c.archived_at);
  const activeDesigns = data.designs.filter(d => !d.archived_at);

  useEffect(() => {
    if (!designPhoto) {
      setDesignPhotoPreview('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(designPhoto);
    setDesignPhotoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [designPhoto]);

  const filteredDesigns = activeDesigns.filter(d => {
    if (selectedCategory !== 'all' && d.category_id !== selectedCategory) return false;
    if (searchQuery && !d.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleOpenAddDesign = () => {
    setDesignSaveNotice('');
    setEditingDesign(null);
    setDesignForm({
      name: '',
      category_id: '',
      description: '',
      photo_url: '',
      photo_ref: '',
      photo_path: ''
    });
    setDesignPhoto(null);
    setDesignSaveError('');
    setDesignSaveStage('');
    setDesignModalOpen(true);
  };

  const handleOpenEditDesign = (des) => {
    setDesignSaveNotice('');
    setEditingDesign(des);
    setDesignForm({
      name: des.name,
      category_id: des.category_id,
      description: des.description || '',
      photo_url: des.photo_url || '',
      photo_ref: des.photo_ref || '',
      photo_path: des.photo_path || ''
    });
    setDesignPhoto(null);
    setDesignSaveError('');
    setDesignSaveStage('');
    setDesignModalOpen(true);
  };

  const handleSaveDesign = async (e) => {
    e.preventDefault();
    setDesignSaveError('');
    if (!designForm.category_id) {
      setDesignSaveError('Select a category before saving the design.');
      return;
    }
    setSavingDesign(true);
    setDesignSaveStage(designPhoto ? 'Uploading image to shared storage…' : 'Saving design…');
    setDesignSaveNotice('');
    try {
      let payload = { ...designForm };
      if (designPhoto) {
        if (!supabase || !user?.id) {
          throw new Error('Sign in and configure Supabase before uploading a design image.');
        }
        const extensionByType = {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp',
          'image/gif': 'gif'
        };
        const extension = extensionByType[designPhoto.type];
        if (!extension) throw new Error('Use a JPG, PNG, WebP, or GIF image.');

        const uniqueId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const photoPath = `${user.id}/${uniqueId}.${extension}`;
        let uploaded = false;
        for (let attempt = 1; attempt <= DESIGN_IMAGE_UPLOAD_ATTEMPTS; attempt += 1) {
          try {
            const { error } = await supabase.storage
              .from('design-images')
              .upload(photoPath, designPhoto, {
                contentType: designPhoto.type,
                upsert: true
              });
            if (error) throw error;
            uploaded = true;
            break;
          } catch (error) {
            if (!isRetryableImageUploadError(error) || attempt === DESIGN_IMAGE_UPLOAD_ATTEMPTS) {
              throw error;
            }
            setDesignSaveStage(
              `Connection interrupted. Retrying image upload (${attempt + 1}/${DESIGN_IMAGE_UPLOAD_ATTEMPTS})…`
            );
            await wait(400 * (2 ** (attempt - 1)) + Math.random() * 300);
          }
        }
        if (!uploaded) throw new Error('The image upload did not complete. Please try again.');
        setDesignSaveStage('Image uploaded. Saving design details…');
        payload = { ...payload, photo_path: photoPath, photo_ref: '', photo_url: '' };
      }
      if (editingDesign) {
        updateDesign(editingDesign.id, payload);
      } else {
        addDesign(payload);
      }
      setDesignSaveNotice(designPhoto
        ? 'Image uploaded successfully. Design saved and syncing to the shared database.'
        : 'Design saved and syncing to the shared database.');
      setDesignModalOpen(false);
      setDesignPhoto(null);
    } catch (error) {
      console.error('Could not save design:', error);
      const detail = isRetryableImageUploadError(error)
        ? 'Could not reach Supabase Storage. Check the phone’s internet connection and confirm the deployed VITE_SUPABASE_URL points to the correct Supabase project.'
        : error.message || 'Please try again.';
      setDesignSaveError(`The design could not be saved. ${detail}`);
    } finally {
      setSavingDesign(false);
      setDesignSaveStage('');
    }
  };

  const handleOpenAddVariant = (design) => {
    setSelectedDesignForVariant(design);
    setEditingVariant(null);
    setVariantForm({
      size: '',
      color: '',
      unit_cost: '',
      retail_price: '',
      reseller_price: '',
      reorder_level: ''
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
      {designSaveNotice && (
        <div className="design-save-notice" role="status" aria-live="polite">
          {designSaveNotice}
          <button type="button" onClick={() => setDesignSaveNotice('')} aria-label="Dismiss message">×</button>
        </div>
      )}
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
                  {design.photo_path || design.photo_url || design.photo_ref ? (
                    <DesignImage
                      design={design}
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
                          setVariantToArchive(null);
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
                                  onClick={() => {
                                    setDesignToArchive(null);
                                    setVariantToArchive(v);
                                    setArchiveConfirmOpen(true);
                                  }}
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
        onClose={() => {
          if (!savingDesign) setDesignModalOpen(false);
        }}
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
            <option value="" disabled>Select a category</option>
            {activeCategories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>

          <div className="design-image-field">
            <label className="pos-label" htmlFor="design-photo">Design Image</label>
            <input
              id="design-photo"
              ref={designPhotoInputRef}
              className="design-image-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={savingDesign}
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                e.target.value = '';
                if (!file) return;
                if (!file.type.startsWith('image/')) {
                  setDesignSaveError('Choose a valid image file.');
                  e.target.value = '';
                  return;
                }
                if (file.size > 10 * 1024 * 1024) {
                  setDesignSaveError('The design image must be 10 MB or smaller.');
                  e.target.value = '';
                  return;
                }
                setDesignSaveError('');
                setDesignPhoto(file);
              }}
            />
            <div className="design-image-actions">
              <Button
                type="button"
                disabled={savingDesign}
                onClick={() => designPhotoInputRef.current?.click()}
              >
                {designPhotoPreview || designForm.photo_path || designForm.photo_ref || designForm.photo_url
                  ? 'Replace Image'
                  : 'Choose Image'}
              </Button>
              <span className="text-xs text-muted">
                Choose an image up to 10 MB. It uploads when you create or update the design and is shared by every variant.
              </span>
            </div>
            {designPhoto && !savingDesign && (
              <div className="design-upload-status" role="status" aria-live="polite">
                Image selected: {designPhoto.name}. It will upload when you save the design.
              </div>
            )}
            {(designPhotoPreview || designForm.photo_path || designForm.photo_ref || designForm.photo_url) && (
              <div className="design-image-preview">
                {designPhotoPreview ? (
                  <img src={designPhotoPreview} alt="Selected design" />
                ) : (
                  <DesignImage design={designForm} alt={designForm.name || 'Current design'} />
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={savingDesign}
                  onClick={() => {
                    if (designPhotoPreview) {
                      setDesignPhoto(null);
                    } else {
                      setDesignForm({ ...designForm, photo_ref: '', photo_url: '', photo_path: '' });
                    }
                  }}
                >
                  {designPhotoPreview ? 'Discard Replacement' : 'Remove Image'}
                </Button>
              </div>
            )}
          </div>

          {savingDesign && (
            <div className="design-upload-status" role="status" aria-live="polite">
              <LoaderCircle size={18} className="design-upload-spinner" />
              <span>{designSaveStage}</span>
            </div>
          )}

          {designSaveError && <div className="order-form-error" role="alert">{designSaveError}</div>}

          <Textarea
            label="Description"
            value={designForm.description}
            onChange={(e) => setDesignForm({ ...designForm, description: e.target.value })}
            placeholder="Material, strap style, sole height..."
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" onClick={() => setDesignModalOpen(false)} disabled={savingDesign}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={savingDesign}>
              {savingDesign
                ? designPhoto ? 'Uploading image…' : 'Saving…'
                : editingDesign ? 'Update Design' : 'Create Design'}
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
        onClose={() => {
          setArchiveConfirmOpen(false);
          setDesignToArchive(null);
          setVariantToArchive(null);
        }}
        onConfirm={() => {
          if (variantToArchive) archiveVariant(variantToArchive.id);
          else if (designToArchive) archiveDesign(designToArchive.id);
        }}
        title={variantToArchive ? 'Archive Product Variant?' : 'Archive Sandal Design?'}
        message={variantToArchive
          ? `Are you sure you want to archive size ${variantToArchive.size} (${variantToArchive.color})? It will be hidden from active lists but retained in historical records and can be restored from Archived Records.`
          : `Are you sure you want to archive "${designToArchive?.name}"? It will be hidden from active lists but kept in historical reports and can be restored from the Archived Records page.`}
        confirmText={variantToArchive ? 'Archive Variant' : 'Archive Design'}
        variant="danger"
      />
    </div>
  );
}
