import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusChip from '../components/ui/StatusChip';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { formatCurrency } from '../lib/calculationUtils';
import { Archive, RotateCcw, Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function ArchivedPage() {
  const {
    data,
    restoreCategory,
    deleteCategory,
    restoreDesign,
    deleteDesign,
    restoreVariant,
    deleteVariant,
    restoreCustomer,
    deleteCustomer,
    restoreSponsor,
    deleteSponsor,
    restoreExpense,
    deleteExpense,
    restoreCapitalEntry,
    deleteCapitalEntry
  } = useData();

  const [activeTab, setActiveTab] = useState('designs'); // 'designs' | 'variants' | 'categories' | 'customers' | 'sponsors' | 'expenses' | 'capital'

  // Delete confirm state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteActionFn, setDeleteActionFn] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const archivedCategories = data.categories.filter(c => c.archived_at);
  const archivedDesigns = data.designs.filter(d => d.archived_at);
  const archivedVariants = data.variants.filter(v => v.archived_at);
  const archivedCustomers = data.customers.filter(c => c.archived_at);
  const archivedSponsors = data.sponsors.filter(s => s.archived_at);
  const archivedExpenses = data.expenses.filter(e => e.archived_at);
  const archivedCapital = data.capital_entries.filter(c => c.archived_at);

  const requestPermanentDelete = (item, deleteFn) => {
    setDeleteError('');
    setItemToDelete(item);
    setDeleteActionFn(() => deleteFn);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteActionFn) return false;
    setDeleteError('');
    try {
      const result = await deleteActionFn();
      return result !== false;
    } catch (error) {
      console.error('Could not permanently delete archived record:', error);
      setDeleteError(error.message || 'The record could not be permanently deleted. Please try again.');
      return false;
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="pos-title text-2xl" style={{ margin: 0 }}>Archived Records & Recycling</h1>
          <p className="text-sm text-muted font-bold" style={{ margin: '0.2rem 0 0 0' }}>
            Safely Restore Archived Data or Perform Controlled Permanent Deletion
          </p>
        </div>
      </div>

      {/* Safety Notice Card */}
      <Card variant="butter" className="mb-6">
        <div className="flex items-start gap-3">
          <ShieldAlert size={22} style={{ color: 'var(--coral)', flexShrink: 0, marginTop: '2px' }} />
          <div className="text-xs font-bold">
            Data Safety Policy: Active records cannot be accidentally deleted. Once archived, records can be restored at any time, or permanently deleted if they have no dependent sales, purchases, or foreign-key relations.
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={activeTab === 'designs' ? 'primary' : 'default'}
          onClick={() => setActiveTab('designs')}
        >
          <span>Designs ({archivedDesigns.length})</span>
        </Button>
        <Button
          variant={activeTab === 'variants' ? 'primary' : 'default'}
          onClick={() => setActiveTab('variants')}
        >
          <span>Variants ({archivedVariants.length})</span>
        </Button>
        <Button
          variant={activeTab === 'categories' ? 'primary' : 'default'}
          onClick={() => setActiveTab('categories')}
        >
          <span>Categories ({archivedCategories.length})</span>
        </Button>
        <Button
          variant={activeTab === 'customers' ? 'primary' : 'default'}
          onClick={() => setActiveTab('customers')}
        >
          <span>Customers ({archivedCustomers.length})</span>
        </Button>
        <Button
          variant={activeTab === 'sponsors' ? 'primary' : 'default'}
          onClick={() => setActiveTab('sponsors')}
        >
          <span>Sponsors ({archivedSponsors.length})</span>
        </Button>
        <Button
          variant={activeTab === 'expenses' ? 'primary' : 'default'}
          onClick={() => setActiveTab('expenses')}
        >
          <span>Expenses ({archivedExpenses.length})</span>
        </Button>
        <Button
          variant={activeTab === 'capital' ? 'primary' : 'default'}
          onClick={() => setActiveTab('capital')}
        >
          <span>Capital ({archivedCapital.length})</span>
        </Button>
      </div>

      {/* Tab Contents */}
      <Card tape="pink">
        {activeTab === 'designs' && (
          <div>
            <h2 className="pos-title text-base mb-3">Archived Sandal Designs</h2>
            {archivedDesigns.length === 0 ? (
              <div className="text-muted font-bold text-sm py-4">No archived designs found.</div>
            ) : (
              <div className="pos-table-wrapper">
                <table className="pos-table">
                  <thead>
                    <tr>
                      <th>Design Name</th>
                      <th>Archived Date</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedDesigns.map(d => (
                      <tr key={d.id}>
                        <td className="font-bold">{d.name}</td>
                        <td className="text-xs text-muted">{new Date(d.archived_at).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="flex justify-center gap-2">
                            <Button size="sm" variant="success" onClick={() => restoreDesign(d.id)}>
                              <RotateCcw size={14} /> Restore
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => requestPermanentDelete(d, () => deleteDesign(d.id))}>
                              <Trash2 size={14} /> Permanent Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'variants' && (
          <div>
            <h2 className="pos-title text-base mb-3">Archived Sandal Variants</h2>
            {archivedVariants.length === 0 ? (
              <div className="text-muted font-bold text-sm py-4">No archived variants found.</div>
            ) : (
              <div className="pos-table-wrapper">
                <table className="pos-table">
                  <thead>
                    <tr>
                      <th>Size & Color</th>
                      <th>Selling Price</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedVariants.map(v => (
                      <tr key={v.id}>
                        <td className="font-bold">Size {v.size} • {v.color}</td>
                        <td>{formatCurrency(v.selling_price)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="flex justify-center gap-2">
                            <Button size="sm" variant="success" onClick={() => restoreVariant(v.id)}>
                              <RotateCcw size={14} /> Restore
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => requestPermanentDelete(v, () => deleteVariant(v.id))}>
                              <Trash2 size={14} /> Permanent Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'categories' && (
          <div>
            <h2 className="pos-title text-base mb-3">Archived Categories</h2>
            {archivedCategories.length === 0 ? (
              <div className="text-muted font-bold text-sm py-4">No archived categories found.</div>
            ) : (
              <div className="pos-table-wrapper">
                <table className="pos-table">
                  <thead>
                    <tr>
                      <th>Category Name</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedCategories.map(c => (
                      <tr key={c.id}>
                        <td className="font-bold">{c.name}</td>
                        <td className="text-xs text-muted">{c.description}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="flex justify-center gap-2">
                            <Button size="sm" variant="success" onClick={() => restoreCategory(c.id)}>
                              <RotateCcw size={14} /> Restore
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => requestPermanentDelete(c, () => deleteCategory(c.id))}>
                              <Trash2 size={14} /> Permanent Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'customers' && (
          <div>
            <h2 className="pos-title text-base mb-3">Archived Customers</h2>
            {archivedCustomers.length === 0 ? (
              <div className="text-muted font-bold text-sm py-4">No archived customers found.</div>
            ) : (
              <div className="pos-table-wrapper">
                <table className="pos-table">
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Phone</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedCustomers.map(c => (
                      <tr key={c.id}>
                        <td className="font-bold">{c.name}</td>
                        <td>{c.phone || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="flex justify-center gap-2">
                            <Button size="sm" variant="success" onClick={() => restoreCustomer(c.id)}>
                              <RotateCcw size={14} /> Restore
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => requestPermanentDelete(c, () => deleteCustomer(c.id))}>
                              <Trash2 size={14} /> Permanent Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sponsors' && (
          <div>
            <h2 className="pos-title text-base mb-3">Archived Sponsors & Influencers</h2>
            {archivedSponsors.length === 0 ? (
              <div className="text-muted font-bold text-sm py-4">No archived sponsors found.</div>
            ) : (
              <div className="pos-table-wrapper">
                <table className="pos-table">
                  <thead>
                    <tr>
                      <th>Sponsor Name</th>
                      <th>Contact</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedSponsors.map(s => (
                      <tr key={s.id}>
                        <td className="font-bold">{s.name}</td>
                        <td>{s.contact || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="flex justify-center gap-2">
                            <Button size="sm" variant="success" onClick={() => restoreSponsor(s.id)}>
                              <RotateCcw size={14} /> Restore
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => requestPermanentDelete(s, () => deleteSponsor(s.id))}>
                              <Trash2 size={14} /> Permanent Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'expenses' && (
          <div>
            <h2 className="pos-title text-base mb-3">Archived Operating Expenses</h2>
            {archivedExpenses.length === 0 ? (
              <div className="text-muted font-bold text-sm py-4">No archived expenses found.</div>
            ) : (
              <div className="pos-table-wrapper">
                <table className="pos-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedExpenses.map(e => (
                      <tr key={e.id}>
                        <td><StatusChip status="new" label={e.category} /></td>
                        <td className="text-sm">{e.description}</td>
                        <td className="font-bold">{formatCurrency(e.amount)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="flex justify-center gap-2">
                            <Button size="sm" variant="success" onClick={() => restoreExpense(e.id)}>
                              <RotateCcw size={14} /> Restore
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => requestPermanentDelete(e, () => deleteExpense(e.id))}>
                              <Trash2 size={14} /> Permanent Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'capital' && (
          <div>
            <h2 className="pos-title text-base mb-3">Archived Capital Entries</h2>
            {archivedCapital.length === 0 ? (
              <div className="text-muted font-bold text-sm py-4">No archived capital entries found.</div>
            ) : (
              <div className="pos-table-wrapper">
                <table className="pos-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Notes</th>
                      <th>Amount</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedCapital.map(c => (
                      <tr key={c.id}>
                        <td><StatusChip status={c.entry_type === 'Capital In' ? 'completed' : 'danger'} label={c.entry_type} /></td>
                        <td className="text-sm">{c.notes}</td>
                        <td className="font-bold">{formatCurrency(c.amount)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="flex justify-center gap-2">
                            <Button size="sm" variant="success" onClick={() => restoreCapitalEntry(c.id)}>
                              <RotateCcw size={14} /> Restore
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => requestPermanentDelete(c, () => deleteCapitalEntry(c.id))}>
                              <Trash2 size={14} /> Permanent Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        errorMessage={deleteError}
        title="Permanent Record Deletion"
        message="This record will be permanently deleted. This action cannot be undone. Continue?"
        confirmText="Permanently Delete"
        variant="danger"
      />
    </div>
  );
}
