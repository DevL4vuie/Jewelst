import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import StatusChip from '../components/ui/StatusChip';
import DataTable from '../components/shared/DataTable';
import { formatCurrency } from '../lib/calculationUtils';
import { Award, Gift, Plus, Users } from 'lucide-react';

export default function SponsorsPage() {
  const { data, getVariantStock, addSponsor, recordSponsoredItem } = useData();

  const [sponsorModalOpen, setSponsorModalOpen] = useState(false);
  const [giveawayModalOpen, setGiveawayModalOpen] = useState(false);

  // New Sponsor Form
  const [sponName, setSponName] = useState('');
  const [sponContact, setSponContact] = useState('');
  const [sponNotes, setSponNotes] = useState('');

  // New Giveaway Form
  const [giveawaySponsorId, setGiveawaySponsorId] = useState(data.sponsors[0]?.id || '');
  const [giveawayVariantId, setGiveawayVariantId] = useState(data.variants[0]?.id || '');
  const [giveawayQty, setGiveawayQty] = useState('1');
  const [giveawayDate, setGiveawayDate] = useState(new Date().toISOString().slice(0, 10));
  const [giveawayNotes, setGiveawayNotes] = useState('');

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
    recordSponsoredItem({
      given_date: giveawayDate,
      sponsor_id: giveawaySponsorId,
      variant_id: giveawayVariantId,
      quantity: Number(giveawayQty) || 1,
      notes: giveawayNotes
    });
    setGiveawayModalOpen(false);
    setGiveawayNotes('');
  };

  const sponsoredRows = data.sponsored_items.map(sp => {
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
      totalMarketingCost: totalCost
    };
  });

  const totalMarketingExp = sponsoredRows.reduce((sum, r) => sum + r.totalMarketingCost, 0);
  const totalPairsGiven = sponsoredRows.reduce((sum, r) => sum + Number(r.quantity), 0);

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
      header: 'Product Given',
      render: (r) => (
        <div>
          <div className="font-bold text-sm">{r.designName}</div>
          <div className="text-xs text-muted">Size {r.size} • {r.color}</div>
        </div>
      )
    },
    { header: 'Qty', accessor: 'quantity', align: 'center', width: '70px' },
    {
      header: 'Landed Unit Cost',
      align: 'right',
      render: (r) => formatCurrency(r.unit_cost)
    },
    {
      header: 'Marketing Cost Total',
      align: 'right',
      render: (r) => <strong style={{ color: 'var(--coral)' }}>{formatCurrency(r.totalMarketingCost)}</strong>
    },
    { header: 'Collab Campaign Notes', accessor: 'notes' }
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
          <Button variant="default" onClick={() => setSponsorModalOpen(true)}>
            <Users size={16} />
            <span>Add Partner</span>
          </Button>
          <Button variant="pink" onClick={() => setGiveawayModalOpen(true)}>
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
            {activeSponsors.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.contact || 'No contact'})</option>
            ))}
          </Select>

          <Select
            label="Sandal Variant Given"
            required
            value={giveawayVariantId}
            onChange={(e) => setGiveawayVariantId(e.target.value)}
          >
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

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity Given"
              type="number"
              min="1"
              required
              value={giveawayQty}
              onChange={(e) => setGiveawayQty(e.target.value)}
            />
            <Input
              label="Date Given"
              type="date"
              required
              value={giveawayDate}
              onChange={(e) => setGiveawayDate(e.target.value)}
            />
          </div>

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
    </div>
  );
}
