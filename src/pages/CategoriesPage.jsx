import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input, Textarea } from '../components/ui/Input';
import StatusChip from '../components/ui/StatusChip';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Layers, Plus, Edit, Archive } from 'lucide-react';

export default function CategoriesPage() {
  const { data, addCategory, updateCategory, archiveCategory } = useData();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [catToArchive, setCatToArchive] = useState(null);

  const activeCategories = data.categories.filter(c => !c.archived_at);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setForm({ name: '', description: '' });
    setModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCategory(c);
    setForm({ name: c.name, description: c.description || '' });
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingCategory) {
      updateCategory(editingCategory.id, form);
    } else {
      addCategory(form);
    }
    setModalOpen(false);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="pos-title text-2xl" style={{ margin: 0 }}>Footwear Categories</h1>
          <p className="text-sm text-muted font-bold" style={{ margin: '0.2rem 0 0 0' }}>
            Organize sandal designs by style, sole type, and heel height
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd}>
          <Plus size={18} />
          <span>Add New Category</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {activeCategories.map((cat, idx) => {
          const designsInCat = data.designs.filter(d => d.category_id === cat.id && !d.archived_at);

          return (
            <Card key={cat.id} tape={idx % 2 === 0 ? 'blue' : 'pink'}>
              <div className="flex justify-between items-start mb-2">
                <h2 className="pos-title text-lg" style={{ margin: 0 }}>{cat.name}</h2>
                <StatusChip status="completed" label={`${designsInCat.length} designs`} />
              </div>

              <p className="text-sm text-muted font-bold mb-4" style={{ minHeight: '38px' }}>
                {cat.description || 'No description provided.'}
              </p>

              <div className="flex justify-end gap-2" style={{ borderTop: '2px dashed rgba(29, 42, 87, 0.2)', paddingTop: '0.75rem' }}>
                <Button size="sm" variant="default" onClick={() => handleOpenEdit(cat)}>
                  <Edit size={14} />
                  <span>Edit</span>
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    setCatToArchive(cat);
                    setConfirmOpen(true);
                  }}
                >
                  <Archive size={14} />
                  <span>Archive</span>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create Footwear Category'}
        tape="pink"
      >
        <form onSubmit={handleSave}>
          <Input
            label="Category Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Platform, Slides, Wedges..."
          />

          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description of footwear style..."
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">
              {editingCategory ? 'Update Category' : 'Save Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Archive Confirm */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          if (catToArchive) archiveCategory(catToArchive.id);
        }}
        title="Archive Category?"
        message={`Are you sure you want to archive category "${catToArchive?.name}"? You can restore it later from the Archived Records page.`}
        confirmText="Archive Category"
        variant="danger"
      />
    </div>
  );
}
