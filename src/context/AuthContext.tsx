import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, License, LicenseDuration, AuthState, GeneratedKey } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  activateLicense: (key: string) => Promise<boolean>;
  checkLicenseValidity: () => boolean;
  isAdmin: () => boolean;
  getGeneratedKeys: () => GeneratedKey[];
  refreshGeneratedKeys: () => Promise<void>;
  generateAndStoreKey: (email: string, duration: LicenseDuration) => Promise<GeneratedKey | null>;
  deactivateKey: (keyId: string) => Promise<void>;
  deleteKey: (keyId: string) => Promise<void>;
  lastError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function callLicenseManager(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('license-manager', { body });
  if (error) {
    let msg = error.message;
    try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* ignore */ }
    return { success: false, error: msg };
  }
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, license: null, isAuthenticated: false, isLoading: true });
  const [admin, setAdmin] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<GeneratedKey[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const res = await callLicenseManager({ action: 'status' });
    if (res?.success) {
      const l = res.license;
      setAdmin(!!res.isAdmin);
      setState(prev => ({
        ...prev,
        license: l ? { key: l.key, duration: l.duration, activatedAt: new Date(l.activatedAt), expiresAt: l.expiresAt ? new Date(l.expiresAt) : null, isActive: l.isActive } : null,
      }));
    }
  }, []);

  useEffect(() => {
    localStorage.removeItem('midnight_panda_user');
    localStorage.removeItem('midnight_panda_license');
    const apply = (session: any) => {
      const su = session?.user;
      if (!su) {
        setState({ user: null, license: null, isAuthenticated: false, isLoading: false });
        setAdmin(false);
        return;
      }
      const user: User = { id: su.id, email: su.email ?? '', name: su.user_metadata?.name ?? (su.email ?? '').split('@')[0], createdAt: new Date(su.created_at) };
      setState(prev => ({ ...prev, user, isAuthenticated: true, isLoading: false }));
      setTimeout(() => { loadStatus(); }, 0);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => apply(session));
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    return () => sub.subscription.unsubscribe();
  }, [loadStatus]);

  const refreshGeneratedKeys = useCallback(async () => {
    if (!admin) return;
    const res = await callLicenseManager({ action: 'list' });
    if (res?.success) {
      setGeneratedKeys((res.keys as any[]).map(k => ({ id: k.id, email: k.customer_email, key: k.license_key, duration: k.duration, createdAt: new Date(k.created_at), isActive: k.is_active })));
    }
  }, [admin]);
  useEffect(() => { refreshGeneratedKeys(); }, [refreshGeneratedKeys]);

  const login = useCallback(async (email: string, password: string) => {
    setLastError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setLastError(error.message); return false; }
    return true;
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    setLastError(null);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(), password, options: { emailRedirectTo: window.location.origin, data: { name } },
    });
    if (error) { setLastError(error.message); return false; }
    if (!data.session) setLastError('Check your email and tap the confirmation link, then sign in.');
    return true;
  }, []);

  const logout = useCallback(() => {
    supabase.auth.signOut();
    setGeneratedKeys([]);
  }, []);

  const isAdmin = useCallback(() => admin, [admin]);
  const getGeneratedKeys = useCallback(() => generatedKeys, [generatedKeys]);

  const generateAndStoreKey = useCallback(async (email: string, duration: LicenseDuration) => {
    const res = await callLicenseManager({ action: 'create', email, duration });
    if (!res?.success) { setLastError(res?.error ?? 'Failed'); return null; }
    const k = res.key;
    const newKey: GeneratedKey = { id: k.id, email: k.customer_email, key: k.license_key, duration: k.duration, createdAt: new Date(k.created_at), isActive: k.is_active };
    setGeneratedKeys(prev => [newKey, ...prev]);
    return newKey;
  }, []);

  const deactivateKey = useCallback(async (keyId: string) => {
    const res = await callLicenseManager({ action: 'deactivate', keyId });
    if (res?.success) setGeneratedKeys(prev => prev.map(k => k.id === keyId ? { ...k, isActive: false } : k));
  }, []);
  const deleteKey = deactivateKey;

  const activateLicense = useCallback(async (key: string) => {
    setLastError(null);
    const res = await callLicenseManager({ action: 'activate', key });
    if (!res?.success) { setLastError(res?.error ?? 'Activation failed'); return false; }
    const l = res.license;
    const license: License = { key: l.key, duration: l.duration, activatedAt: new Date(l.activatedAt), expiresAt: l.expiresAt ? new Date(l.expiresAt) : null, isActive: true };
    setState(prev => ({ ...prev, license }));
    return true;
  }, []);

  const checkLicenseValidity = useCallback(() => {
    const l = state.license;
    if (!l || !l.isActive) return false;
    if (!l.expiresAt) return l.duration === 'lifetime';
    return new Date(l.expiresAt) > new Date();
  }, [state.license]);

  return (
    <AuthContext.Provider value={{ ...state, login, signup, logout, activateLicense, checkLicenseValidity, isAdmin, getGeneratedKeys, refreshGeneratedKeys, generateAndStoreKey, deactivateKey, deleteKey, lastError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
