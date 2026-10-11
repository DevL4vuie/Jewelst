import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import AppLayout from './components/layout/AppLayout';
import Button from './components/ui/Button';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PosPage from './pages/PosPage';
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import InventoryPage from './pages/InventoryPage';
import PurchasesPage from './pages/PurchasesPage';
import SalesPage from './pages/SalesPage';
import OrdersPage from './pages/OrdersPage';
import CustomersPage from './pages/CustomersPage';
import SponsorsPage from './pages/SponsorsPage';
import ExpensesPage from './pages/ExpensesPage';
import CapitalPage from './pages/CapitalPage';
import CashFlowPage from './pages/CashFlowPage';
import ReportsPage from './pages/ReportsPage';
import ArchivedPage from './pages/ArchivedPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isAdmin, loading } = useAuth();
  const { loading: dataLoading, loadError, retryDataSync } = useData();
  if (loading) {
    return (
      <div className="pos-bg flex items-center justify-center" style={{ minHeight: '100vh', padding: '1rem' }}>
        <p role="status" aria-live="polite" className="font-bold">Restoring your session...</p>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (dataLoading) {
    return (
      <div className="pos-bg flex items-center justify-center" style={{ minHeight: '100vh', padding: '1rem' }}>
        <p role="status" aria-live="polite" className="font-bold">Loading shared business data from Supabase...</p>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="pos-bg flex flex-col items-center justify-center gap-3" style={{ minHeight: '100vh', padding: '1rem' }}>
        <p role="alert" className="font-bold">{loadError}</p>
        <Button variant="primary" onClick={retryDataSync}>Retry Connection</Button>
      </div>
    );
  }
  if (adminOnly && !isAdmin) {
    return <Navigate to="/pos" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="pos" element={<PosPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="purchases" element={<PurchasesPage />} />
              <Route path="sales" element={<SalesPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="sponsors" element={<SponsorsPage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="capital" element={<CapitalPage />} />
              <Route path="cash-flow" element={<CashFlowPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="archived" element={<ArchivedPage />} />
              <Route path="users" element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute adminOnly><SettingsPage /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}
