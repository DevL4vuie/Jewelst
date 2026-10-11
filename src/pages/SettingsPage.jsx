import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import StatusChip from '../components/ui/StatusChip';
import DataTable from '../components/shared/DataTable';
import { Settings, Save, History, Database, CheckCircle, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const { data, updateSettings, clearActivityLog } = useData();

  const [form, setForm] = useState({
    business_name: data.settings.business_name || "Jewel's Sandals",
    receipt_subtitle: data.settings.receipt_subtitle ?? 'Boutique Sandal Management',
    receipt_address: data.settings.receipt_address ?? 'Taguig City, Metro Manila',
    receipt_phone: data.settings.receipt_phone ?? '(02) 8888-SANDAL',
    receipt_thank_you: data.settings.receipt_thank_you ?? 'Thank you for shopping with us!',
    receipt_warranty_note: data.settings.receipt_warranty_note ?? 'Please keep this receipt for warranty/exchange.',
    currency: data.settings.currency || 'PHP',
    slow_mover_days: String(data.settings.slow_mover_days || 30),
    default_reorder_level: String(data.settings.default_reorder_level || 5),
    timezone: data.settings.timezone || 'Asia/Manila'
  });

  const [savedMsg, setSavedMsg] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    updateSettings({
      business_name: form.business_name,
      receipt_subtitle: form.receipt_subtitle,
      receipt_address: form.receipt_address,
      receipt_phone: form.receipt_phone,
      receipt_thank_you: form.receipt_thank_you,
      receipt_warranty_note: form.receipt_warranty_note,
      currency: form.currency,
      slow_mover_days: Number(form.slow_mover_days) || 30,
      default_reorder_level: Number(form.default_reorder_level) || 5,
      timezone: form.timezone
    });
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  const handleClearActivityLog = () => {
    if (data.activity_log.length === 0) return;
    if (window.confirm(`Clear all ${data.activity_log.length} activity log entries? This cannot be undone.`)) {
      clearActivityLog();
    }
  };

  const activityColumns = [
    {
      header: 'Timestamp',
      width: '180px',
      render: r => <span className="text-xs text-muted">{new Date(r.timestamp).toLocaleString()}</span>
    },
    { header: 'User Account', accessor: 'user', width: '150px', fontBold: true },
    {
      header: 'Action Taken',
      render: r => <StatusChip status="new" label={r.action} />
    },
    { header: 'Event Details', accessor: 'details' }
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="pos-title text-2xl" style={{ margin: 0 }}>System Configuration & Settings</h1>
          <p className="text-sm text-muted font-bold" style={{ margin: '0.2rem 0 0 0' }}>
            Store Profile, Currency, Thresholds & Activity Audit Log
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Settings Form */}
        <div style={{ gridColumn: 'span 1' }}>
          <Card tape="blue">
            <h2 className="pos-title text-lg mb-3">Business Parameters</h2>

            {savedMsg && (
              <div className="flex items-center gap-2 p-2 mb-3 text-xs font-bold" style={{ background: 'var(--mint)', border: '2px solid var(--ink)', borderRadius: '10px' }}>
                <CheckCircle size={16} />
                <span>Settings saved successfully!</span>
              </div>
            )}

            <form onSubmit={handleSave}>
              <Input
                label="Store / Brand Name"
                required
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              />

              <h3 className="pos-title text-sm mt-4 mb-2">Receipt Header</h3>
              <Input
                label="Business Description"
                value={form.receipt_subtitle}
                onChange={(e) => setForm({ ...form, receipt_subtitle: e.target.value })}
                placeholder="e.g. Boutique Sandal Management"
              />

              <Input
                label="Address / Location"
                value={form.receipt_address}
                onChange={(e) => setForm({ ...form, receipt_address: e.target.value })}
                placeholder="e.g. Taguig City, Metro Manila"
              />

              <Input
                label="Telephone / Contact"
                value={form.receipt_phone}
                onChange={(e) => setForm({ ...form, receipt_phone: e.target.value })}
                placeholder="e.g. (02) 8888-SANDAL"
              />

              <h3 className="pos-title text-sm mt-4 mb-2">Receipt Footer</h3>
              <Textarea
                label="Thank-you Message"
                value={form.receipt_thank_you}
                onChange={(e) => setForm({ ...form, receipt_thank_you: e.target.value })}
                placeholder="e.g. Thank you for shopping with us!"
              />

              <Textarea
                label="Warranty / Exchange Note"
                value={form.receipt_warranty_note}
                onChange={(e) => setForm({ ...form, receipt_warranty_note: e.target.value })}
                placeholder="e.g. Please keep this receipt for warranty/exchange."
              />

              <Input
                label="Currency Symbol / Code"
                required
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              />

              <Input
                label="Default Low Stock Threshold (Pairs)"
                type="number"
                required
                value={form.default_reorder_level}
                onChange={(e) => setForm({ ...form, default_reorder_level: e.target.value })}
              />

              <Input
                label="Slow Mover Threshold (Days without sale)"
                type="number"
                required
                value={form.slow_mover_days}
                onChange={(e) => setForm({ ...form, slow_mover_days: e.target.value })}
              />

              <Select
                label="System Timezone"
                required
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              >
                <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
              </Select>

              <Button type="submit" variant="primary" className="w-full mt-3">
                <Save size={16} />
                <span>Save System Settings</span>
              </Button>
            </form>
          </Card>
        </div>

        {/* Activity Log (2 cols) */}
        <div style={{ gridColumn: 'span 2' }}>
          <Card tape="pink">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <History size={18} />
                <h2 className="pos-title text-lg" style={{ margin: 0 }}>Activity Audit Log</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted font-bold">
                  {data.activity_log.length} logged system events
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={data.activity_log.length === 0}
                  onClick={handleClearActivityLog}
                >
                  <Trash2 size={14} />
                  <span>Clear Logs</span>
                </Button>
              </div>
            </div>

            <DataTable
              columns={activityColumns}
              data={data.activity_log}
              searchKey="action"
              searchPlaceholder="Search audit log..."
              exportFileName="Jewels_Audit_Log"
              exportSheetName="AuditLog"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
