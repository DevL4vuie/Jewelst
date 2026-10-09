# Jewel's Sandals - Web-Based Sandal Inventory, Capital, Expense, Sales, and ROI Management System

A full-stack, mobile-first inventory and POS system designed specifically for a boutique sandal business. Features comprehensive landed cost computations, real-time variant stock tracking, capital recovery and ROI dashboards, sponsor/PR giveaway accounting, and a playful **"Watercolor Gingham Scrapbook"** user interface.

---

## 🎨 Theme & Aesthetic Design System

- **Watercolor Gingham Background:** Soft blue (`#7fa3dc`) and cream (`#fffaf0`) painted checkerboard background using pure CSS layering (`.pos-bg`).
- **Paper & Sticker Cards:** Solid cream paper cards (`.pos-card`) with a 2.5px navy border (`#1d2a57`), rounded corners, and a hard 3px drop shadow (no blur).
- **Washi Tape Accents:** Translucent washi tape strips (`.pos-tape` and `.pos-tape--pink`) on cards and dialogs.
- **Pill Buttons & Rotating Tiles:** 44px min-height buttons with physical 3px press translation, and product tiles rotating across cream, butter yellow, light blue, and soft pink backgrounds.
- **Typography:** Strictly **Nunito** (400, 600, 800) font weights with `font-style: normal` across all elements.

---

## 🚀 Key Modules & Capabilities

1. **Dashboard:**
   - 10 key metric summary cards: Sales, COGS, Gross Profit, OPEX, Sponsored PR Cost, Net Profit, ROI (%), Cash on Hand, Capital Tied Up in Stock, Units Sold.
   - Month & Year period selectors.
   - Visual cash-flow and revenue allocation charts.
   - Low-stock warnings and slow-mover audits (30+ days no sales).
   - Best sellers and quick action shortcuts.

2. **Point of Sale (POS Terminal):**
   - Category filtering & instant search.
   - Size & color variant picker modal with real-time stock availability check.
   - Active cart management with quantity controls.
   - Payment methods: Cash, GCash, Bank Transfer.
   - Channels: In Person vs. Online.
   - Instant printable thermal receipt preview (72/78mm format).
   - Atomic inventory reduction and historical unit cost locking.

3. **Products & Categories:**
   - Multi-tier hierarchy: Categories → Designs → Variants (Size & Color).
   - Photo image previews, description, selling prices, and reorder levels.

4. **Inventory Management:**
   - Real-time stock computation: `Purchased - Sold - Sponsored ± Adjustments`.
   - Weighted average landed cost tracking and total inventory valuation.
   - Stock adjustments with audit reason tracking (Damaged, Lost, Recount, Found, Correction).
   - One-click Excel export (`.xlsx`).

5. **Restock Purchase Batches:**
   - Multi-item batch entry with base purchase prices.
   - Batch expenses allocation (Shipping, packaging, tags, freight).
   - Automatic Landed Cost per pair: `Base Price + (Total Expenses / Total Pairs)`.

6. **Sales & Orders:**
   - Complete historical sales ledger with profit per sale and void reversals.
   - Customer reservations and pre-order tracking with status transitions (Pending, Confirmed, Preparing, Ready, Completed, Cancelled).
   - One-click order finalization to paid sale.

7. **Sponsors & PR Giveaways:**
   - Influencer collaboration tracking.
   - Free giveaway item recording that reduces stock and logs the landed cost as a marketing expense.

8. **Operating Expenses (OPEX):**
   - Categorized expenses: Rent, Utilities, Advertising, Transportation, Packaging, Supplies, Internet, Other.
   - Category breakdown and net profit integration.

9. **Capital & ROI:**
   - Owner capital additions and withdrawals.
   - Capital recovery % and Return on Investment (ROI): `Net Profit / Net Capital Invested * 100`.

10. **Cash Flow Ledger:**
    - Unified chronological inflows and outflows across Cash, GCash, and Bank Transfer accounts.
    - Running balance calculation.

11. **Reports & SheetJS Excel Export:**
    - Profit by Design matrix, Daily sales, Best sellers, Slow movers.
    - Standard `.xlsx` exports for Inventory, Sales, Expenses, Capital, Cash Flow, and Orders.

12. **Archived Records & Data Safety:**
    - Record Lifecycle: `Active -> Edit -> Archive -> Restore or Permanent Delete`.
    - Hard delete restrictions on active and relationship-dependent records with confirmation dialog.

13. **Role-Based Access & Settings:**
    - Admin (Owner) vs. Cashier and Staff roles.
    - Configurable business parameters (currency, reorder level, slow mover threshold) and activity audit log.

---

## 🛠️ Tech Stack

- **Frontend:** React 18 (JSX), Vite 5, React Router v6
- **Database & Auth:** Supabase (PostgreSQL), Supabase Auth
- **Excel Export:** SheetJS (`xlsx`)
- **Icons:** Lucide React
- **Deployment:** Vercel

---

## 💻 Getting Started Locally

1. Clone repository:
   ```bash
   git clone <repo-url>
   cd Jewelst
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup environment variables:
   Copy `.env.example` to `.env` and configure your Supabase project keys:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Run development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```
