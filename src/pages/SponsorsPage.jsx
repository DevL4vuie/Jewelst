import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Input, Select, Textarea } from '../components/ui/Input';
import DataTable from '../components/shared/DataTable';
import ThermalReceiptModal from '../components/shared/ThermalReceiptModal';
import { formatCurrency } from '../lib/calculationUtils';
import { Archive, Gift, Plus, Printer, Users } from 'lucide-react';

export default function SponsorsPage() {
  const { data, getVariantStock, addSponsor, archiveSponsor, recordSponsoredItems } = useData();

  const [sponsorModalOpen, setSponsorModalOpen] = useState(false);
  const [giveawayModalOpen, setGiveawayModalOpen] = useState(false);
  const [sponsorToArchive, setSponsorToArchive] = useState(null);
  const [giveawayReceipt, setGiveawayReceipt] = useState(null);

  // New Sponsor Form
  const [sponName, setSponName] = useState('');
  const [sponContact, setSponContact] = useState('');
  const [sponNotes, setSponNotes] = useState('');

  // New Giveaway Form
  const [giveawaySponsorId, setGiveawaySponsorId] = useState('');
  const [giveawayItems, setGiveawayItems] = useState([{ variant_id: '', quantity: '' }]);
  const [giveawayDate, setGiveawayDate] = useState('');
  const [giveawayNotes, setGiveawayNotes] = useState('');
  const [giveawayError, setGiveawayError] = useState('');

  const activeSponsors = data.sponsors.filter(s => !s.archived_at);
  const activeVariants = data.variants.filter(v => !v.archived_at);

  const handleSaveSponsor = (e) => {
    e.preventDefault();
    addSponsor({
      name: sponName,
      contact: sponContact,
      notes: sponNotes
    });
    setSponsorModalOpen(false);
    setSponName('');
    setSponContact('');
    setSponNotes('');
  };

  const handleSaveGiveaway = (e) => {
    e.preventDefault();
    setGiveawayError('');
    if (!giveawaySponsorId || !giveawayDate || giveawayItems.length === 0 || giveawayItems.some(item => (
      !item.variant_id || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1
    ))) {
      setGiveawayError('Select a sponsor, date, and a valid variant and quantity for every sandal.');
      return;
    }
    const result = recordSponsoredItems(giveawayItems.map(item => ({
      given_date: giveawayDate,
      sponsor_id: giveawaySponsorId,
      variant_id: item.variant_id,
      quantity: Number(item.quantity),
      notes: giveawayNotes
    })));
    if (result.error) {
      setGiveawayError(result.error);
      return;
    }
    setGiveawayModalOpen(false);
    setGiveawaySponsorId('');
    setGiveawayItems([{ variant_id: '', quantity: '' }]);
    setGiveawayDate('');
    setGiveawayNotes('');
  };

  const updateGiveawayItem = (index, updates) => {
    setGiveawayItems(items => items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...updates } : item
    )));
  };

  const sponsoredLines = data.sponsored_items.map(sp => {
    const spon = data.sponsors.find(s => s.id === sp.sponsor_id);
    const v = data.variants.find(item => item.id === sp.variant_id);
    const des = v ? data.designs.find(d => d.id === v.design_id) : null;
    const totalCost = Number(sp.unit_cost) * Number(sp.quantity);

    return {
      ...sp,
      sponsorName: spon?.name || 'Sponsor',
      sponsorContact: spon?.contact || '-',
      designName: des?.name || 'Sandal',
      size: v?.size || '-',
      color: v?.color || '-',
      totalMarketingCost: totalCost,
      receiptItem: {
        productName: des?.name || 'Sandal',
        variantInfo: `Size ${v?.size || '-'}, ${v?.color || '-'}`,
        quantity: Number(sp.quantity) || 0,
        selling_price: Number(sp.unit_cost) || 0
      }
    };
  });

  const giveawayGroups = new Map();
  sponsoredLines.forEach(line => {
    const legacyKey = `legacy:${line.sponsor_id || 'unknown'}:${line.given_date || ''}:${line.notes || ''}`;
    const key = line.giveaway_id || legacyKey;
    const group = giveawayGroups.get(key) || [];
    group.push(line);
    giveawayGroups.set(key, group);
  });

  const sponsoredRows = Array.from(giveawayGroups.values()).map(lines => {
    const first = lines[0];
    const quantity = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
    const totalMarketingCost = lines.reduce((sum, line) => sum + line.totalMarketingCost, 0);
    const items = lines.map(line => line.receiptItem);
    return {
      ...first,
      id: first.giveaway_id || first.id,
      items,
      quantity,
      totalMarketingCost,
      productSummary: [...new Set(lines.map(line => line.designName))].join(', ')
    };
  });

  const totalMarketingExp = sponsoredRows.reduce((sum, r) => sum + r.totalMarketingCost, 0);
  const totalPairsGiven = sponsoredRows.reduce((sum, r) => sum + Number(r.quantity), 0);

  const handlePrintGiveawayReceipt = (giveaway) => {
    setGiveawayReceipt({
      id: giveaway.id,
      sale_date: giveaway.given_date,
      transaction_time: giveaway.transaction_time,
      transaction_id: giveaway.id,
      sponsorName: giveaway.sponsorName,
      notes: giveaway.notes,
      items: giveaway.items,
      totalAmount: giveaway.totalMarketingCost
    });
  };

  const columns = [
    { header: 'Date Given', accessor: 'given_date', width: '110px' },
    {
      header: 'Sponsor / Influencer',
      render: (r) => (
        <div>
          <div className="font-bold text-sm">{r.sponsorName}</div>
          <div className="text-xs text-muted">{r.sponsorContact}</div>
        </div>
      )
    },
    {
      header: 'Products Given',
      render: (r) => (
        <div className="flex flex-col gap-1">
          {r.items.map((item, index) => (
            <div key={`${item.productName}-${item.variantInfo}-${index}`}>
              <div className="font-bold text-sm">{item.productName}</div>
              <div className="text-xs text-muted">{item.variantInfo} • Qty {item.quantity}</div>
            </div>
          ))}
        </div>
      )
    },
    { header: 'Total Pairs', accessor: 'quantity', align: 'center', width: '90px' },
    {
      header: 'Marketing Cost Total',
      align: 'right',
      render: (r) => <strong style={{ color: 'var(--coral)' }}>{formatCurrency(r.totalMarketingCost)}</strong>
    },
    { header: 'Collab Campaign Notes', accessor: 'notes' },
    {
      header: 'Receipt',
      align: 'center',
      render: (r) => (
        <Button size="sm" onClick={() => handlePrintGiveawayReceipt(r)} title="Print Giveaway Receipt">
          <Printer size={14} />
          <span>Receipt</span>
        </Button>
      )
    }
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="pos-title text-2xl" style={{ margin: 0 }}>Sponsors & PR Giveaways</h1>
          <p className="text-sm text-muted font-bold" style={{ margin: '0.2rem 0 0 0' }}>
            Promotional Pairs, Influencer Collaborations & Marketing Expense Accounting
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={() => {
              setSponName('');
              setSponContact('');
              setSponNotes('');
              setSponsorModalOpen(true);
            }}
          >
            <Users size={16} />
            <span>Add Partner</span>
          </Button>
          <Button
            variant="pink"
            onClick={() => {
              setGiveawaySponsorId('');
              setGiveawayItems([{ variant_id: '', quantity: '' }]);
              setGiveawayDate('');
              setGiveawayNotes('');
              setGiveawayError('');
              setGiveawayModalOpen(true);
            }}
          >
            <Gift size={16} />
            <span>Record Promotional Giveaway</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card tape="pink">
          <div className="text-xs text-muted font-bold mb-1">TOTAL PROMOTIONAL PAIRS GIVEN</div>
          <div className="text-2xl font-bold">{totalPairsGiven} pairs</div>
          <div className="text-xs text-muted mt-1">Deducted from active stock</div>
        </Card>

        <Card variant="butter">
          <div className="text-xs text-muted font-bold mb-1">TOTAL MARKETING EXPENSE</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--coral)' }}>
            {formatCurrency(totalMarketingExp)}
          </div>
          <div className="text-xs text-muted mt-1">Calculated at landed purchase cost</div>
        </Card>

        <Card>
          <div className="text-xs text-muted font-bold mb-1">ACTIVE SPONSOR PARTNERS</div>
          <div className="text-2xl font-bold">{activeSponsors.length} influencers</div>
          <div className="text-xs text-muted mt-1">Promoting Jewel's Sandals</div>
        </Card>
      </div>

      <Card className="mb-6">
        <div className="font-bold text-sm mb-3">ACTIVE PARTNERS</div>
        {activeSponsors.length === 0 ? (
          <div className="text-muted font-bold text-sm py-2">No active partners. Add a partner to record giveaways.</div>
        ) : (
          <div className="pos-table-wrapper">
            <table className="pos-table">
              <thead>
                <tr>
                  <th>Partner</th>
                  <th>Contact</th>
                  <th>Partnership Notes</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeSponsors.map(sponsor => (
                  <tr key={sponsor.id}>
                    <td className="font-bold">{sponsor.name}</td>
                    <td>{sponsor.contact || '-'}</td>
                    <td>{sponsor.notes || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <Button
                        size="sm"
                        onClick={() => setSponsorToArchive(sponsor)}
                        aria-label={`Archive ${sponsor.name}`}
                      >
                        <Archive size={14} /> Archive
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <div className="font-bold text-sm mb-3">SPONSORED PRODUCT LOG</div>
        <DataTable
          columns={columns}
          data={sponsoredRows}
          searchKey="sponsorName"
          searchPlaceholder="Search giveaways by sponsor..."
          exportFileName="Jewels_Sponsored_PR_Items"
          exportSheetName="Sponsored"
        />
      </Card>

      {/* New Sponsor Modal */}
      <Modal
        isOpen={sponsorModalOpen}
        onClose={() => setSponsorModalOpen(false)}
        title="Register Sponsor / Influencer Partner"
        tape="blue"
      >
        <form onSubmit={handleSaveSponsor}>
          <Input
            label="Sponsor / Influencer Name"
            required
            value={sponName}
            onChange={(e) => setSponName(e.target.value)}
            placeholder="e.g. Chloe Style Vlogs"
          />

          <Input
            label="Social Handle / Contact Info"
            value={sponContact}
            onChange={(e) => setSponContact(e.target.value)}
            placeholder="@chloestyle on IG / TikTok"
          />

          <Textarea
            label="Partnership Notes"
            value={sponNotes}
            onChange={(e) => setSponNotes(e.target.value)}
            placeholder="Collaboration guidelines, follower count, deliverables..."
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setSponsorModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Partner</Button>
          </div>
        </form>
      </Modal>

      {/* New Giveaway Modal */}
      <Modal
        isOpen={giveawayModalOpen}
        onClose={() => setGiveawayModalOpen(false)}
        title="Record Free Sandal Giveaway / PR"
        tape="pink"
      >
        <form onSubmit={handleSaveGiveaway}>
          <div className="p-3 mb-3 font-bold text-xs" style={{ background: 'var(--butter-soft)', border: '2px solid var(--ink)', borderRadius: '12px' }}>
            Note: This reduces stock on hand and charges the landed cost of the sandals directly into marketing OPEX.
          </div>

          <Select
            label="Select Sponsor / Beneficiary"
            required
            value={giveawaySponsorId}
            onChange={(e) => setGiveawaySponsorId(e.target.value)}
          >
            <option value="" disabled>Select a sponsor</option>
            {activeSponsors.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.contact || 'No contact'})</option>
            ))}
          </Select>

          <section className="mb-3" style={{ background: 'var(--light-blue)', padding: '0.85rem', borderRadius: '12px', border: '2px solid var(--ink)' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-sm">SANDALS GIVEN</span>
              <Button
                type="button"
                size="sm"
                onClick={() => setGiveawayItems(items => [...items, { variant_id: '', quantity: '' }])}
              >
                <Plus size={14} /> Add Sandal
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {giveawayItems.map((item, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                  <Select
                    label={`Sandal Variant ${index + 1}`}
                    required
                    value={item.variant_id}
                    onChange={(e) => updateGiveawayItem(index, { variant_id: e.target.value })}
                  >
                    <option value="" disabled>Select a variant</option>
                    {activeVariants.map(v => {
                      const des = data.designs.find(d => d.id === v.design_id);
                      const stock = getVariantStock(v.id);
                      return (
                        <option key={v.id} value={v.id}>
                          {des?.name || 'Design'} - Size {v.size} ({v.color}) [{stock} available]
                        </option>
                      );
                    })}
                  </Select>
                  <div className="flex items-end gap-2">
                    <Input
                      label="Quantity Given"
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={item.quantity}
                      onChange={(e) => updateGiveawayItem(index, { quantity: e.target.value })}
                    />
                    {giveawayItems.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        className="mb-3"
                        aria-label={`Remove sandal ${index + 1}`}
                        onClick={() => setGiveawayItems(items => items.filter((_, itemIndex) => itemIndex !== index))}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date Given"
              type="date"
              required
              value={giveawayDate}
              onChange={(e) => setGiveawayDate(e.target.value)}
            />
          </div>

          {giveawayError && <div className="order-form-error mb-3" role="alert">{giveawayError}</div>}

          <Textarea
            label="Campaign / Collab Notes"
            value={giveawayNotes}
            onChange={(e) => setGiveawayNotes(e.target.value)}
            placeholder="e.g. Free pair given for TikTok unboxing reel"
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setGiveawayModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="pink">Record Giveaway</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(sponsorToArchive)}
        onClose={() => setSponsorToArchive(null)}
        onConfirm={() => {
          archiveSponsor(sponsorToArchive.id);
          setSponsorToArchive(null);
        }}
        title="Archive Partner?"
        message={`Are you sure you want to archive "${sponsorToArchive?.name}"? The partner will no longer be available for new giveaways, and can be restored from Archived Records. Existing giveaway history will be kept.`}
        confirmText="Archive Partner"
        variant="danger"
      />

      <ThermalReceiptModal
        isOpen={Boolean(giveawayReceipt)}
        onClose={() => setGiveawayReceipt(null)}
        saleDetails={giveawayReceipt}
        receiptType="giveaway"
        businessName={data.settings.business_name}
        businessDescription={data.settings.receipt_subtitle}
        businessAddress={data.settings.receipt_address}
        businessPhone={data.settings.receipt_phone}
        thankYouMessage={data.settings.receipt_thank_you}
        warrantyNote={data.settings.receipt_warranty_note}
      />
    </div>
  );
}
