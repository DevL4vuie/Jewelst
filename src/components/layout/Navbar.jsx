import React from 'react';
import { Menu, X, LogOut, ShoppingBag, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import Button from '../ui/Button';
import StatusChip from '../ui/StatusChip';

export default function Navbar({ onToggleSidebar, isSidebarOpen }) {
  const { user, logout } = useAuth();
  const { data } = useData();

  return (
    <header className="pos-card app-navbar" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, padding: '0.75rem 1rem', zIndex: 40 }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
          <button
            className="pos-btn pos-btn--sm mobile-menu-btn"
            style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%', flexShrink: 0 }}
            onClick={onToggleSidebar}
            aria-label="Toggle Navigation"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--pink)',
              border: '2px solid var(--ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.1rem',
              flexShrink: 0
            }}>
              👡
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="font-bold" style={{ lineHeight: 1.1, fontSize: 'clamp(0.85rem, 2.5vw, 1.125rem)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {data.settings.business_name}
              </div>
              <div className="text-xs text-muted hidden sm:block" style={{ fontWeight: 600 }}>Sandal Inventory & POS</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 app-navbar__user" style={{ flexShrink: 0 }}>
          {user && (
            <div className="flex items-center gap-2">
              <div className="hidden md:flex flex-col text-right">
                <span className="font-bold text-sm" style={{ whiteSpace: 'nowrap' }}>{user.full_name}</span>
                <span className="text-xs text-muted" style={{ whiteSpace: 'nowrap' }}>{user.email}</span>
              </div>
              <span className="app-navbar__role">
                <StatusChip status={user.role === 'Admin' ? 'completed' : 'new'} label={user.role} />
              </span>
              <Button size="sm" variant="default" onClick={logout} title="Log Out" className="app-navbar__logout">
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
