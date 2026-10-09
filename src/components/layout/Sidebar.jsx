import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  Boxes,
  Truck,
  ShoppingCart,
  ShoppingBag,
  Users,
  Award,
  Receipt,
  PiggyBank,
  TrendingUp,
  BarChart3,
  Archive,
  UserCheck,
  Settings
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/pos', label: 'POS Terminal', icon: ShoppingCart },
  { path: '/products', label: 'Products & Designs', icon: Package },
  { path: '/categories', label: 'Categories', icon: Layers },
  { path: '/inventory', label: 'Inventory Stock', icon: Boxes },
  { path: '/purchases', label: 'Purchase Batches', icon: Truck },
  { path: '/sales', label: 'Sales History', icon: ShoppingBag },
  { path: '/orders', label: 'Customer Orders', icon: ShoppingBag },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/sponsors', label: 'Sponsors & PR', icon: Award },
  { path: '/expenses', label: 'Operating Expenses', icon: Receipt },
  { path: '/capital', label: 'Capital & ROI', icon: PiggyBank },
  { path: '/cash-flow', label: 'Cash Flow Ledger', icon: TrendingUp },
  { path: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
  { path: '/archived', label: 'Archived Records', icon: Archive },
  { path: '/users', label: 'Users & Roles', icon: UserCheck, adminOnly: true },
  { path: '/settings', label: 'System Settings', icon: Settings, adminOnly: true }
];

export default function Sidebar({ isOpen, onClose }) {
  const { isAdmin } = useAuth();

  return (
    <>
      {/* Mobile backdrop overlay */}
      <div
        className={`sidebar-backdrop ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />

      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '2.5px solid var(--ink)', background: 'var(--light-blue)' }}>
          <div className="font-bold text-sm" style={{ letterSpacing: '0.05em' }}>
            NAVIGATION
          </div>
        </div>

        <nav style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {NAV_ITEMS.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 p-2 font-bold text-sm ${isActive ? 'active-nav-link' : 'inactive-nav-link'}`
                }
                style={({ isActive }) => ({
                  borderRadius: '9999px',
                  padding: '0.6rem 1rem',
                  textDecoration: 'none',
                  color: isActive ? 'var(--paper)' : 'var(--ink)',
                  background: isActive ? 'var(--ink)' : 'transparent',
                  border: isActive ? '2px solid var(--ink)' : '2px solid transparent',
                  boxShadow: isActive ? '0 2px 0 var(--ink)' : 'none',
                  minHeight: '44px'
                })}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Scrapbook footer note */}
        <div style={{ padding: '1rem', borderTop: '2px dashed rgba(29, 42, 87, 0.25)', fontSize: '0.75rem', textAlign: 'center', opacity: 0.8 }}>
          <div className="font-bold">Jewel's Sandal POS v2.0</div>
          <div>Watercolor Gingham Edition</div>
        </div>
      </aside>
    </>
  );
}
