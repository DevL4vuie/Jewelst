import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

const mapAuthUser = (authUser) => ({
  id: authUser.id,
  email: authUser.email,
  full_name: authUser.user_metadata?.full_name || authUser.email,
  role: authUser.user_metadata?.role || 'Admin'
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, check for an existing Supabase session
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session?.user) {
        setUser(mapAuthUser(session.user));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!active) return;
        if (error) {
          console.error('Failed to restore authentication session:', error);
        }
        setUser(session?.user ? mapAuthUser(session.user) : null);
        setLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        console.error('Failed to restore authentication session:', error);
        setLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    if (!supabase) {
      return { success: false, error: 'Authentication service is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        return { success: false, error: error.message };
      }
      if (data?.user) {
        setLoading(false);
        return { success: true };
      }
      setLoading(false);
      return { success: false, error: 'Login failed. Please try again.' };
    } catch (err) {
      setLoading(false);
      return { success: false, error: err.message || 'An unexpected error occurred.' };
    }
  };

  const logout = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Logout error:', e);
      }
    }
    setUser(null);
  };

  const isAdmin = user?.role === 'Admin';
  const isCashier = user?.role === 'Cashier';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isCashier, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
