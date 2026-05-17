import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, License, LicenseDuration, AuthState, GeneratedKey } from '@/types';
import { supabase } from '@/integrations/supabase/client';

const ADMIN_EMAIL = 'mohalethapelo93@gmail.com';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function callLicenseManager(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('license-manager', { body });
  if (error) return { success: false, error: error.message };
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    license: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const [generatedKeys, setGeneratedKeys] = useState<GeneratedKey[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('midnight_panda_user');
    const storedLicense = localStorage.getItem('midnight_panda_license');

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        const license = storedLicense ? JSON.parse(storedLicense) : null;
        setState({ user, license, isAuthenticated: true, isLoading: false });
      } catch {
        localStorage.removeItem('midnight_panda_user');
        localStorage.removeItem('midnight_panda_license');
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const refreshGeneratedKeys = useCallback(async () => {
    if (state.user?.email?.toLowerCase() !== ADMIN_EMAIL) return;
    const res = await callLicenseManager({ action: 'list', adminEmail: state.user.email });
    if (res?.success) {
      setGeneratedKeys(
        (res.keys as any[]).map(k => ({
          id: k.id,
          email: k.customer_email,
          key: k.license_key,
          duration: k.duration,
          createdAt: new Date(k.created_at),
          isActive: k.is_active,
        }))
      );
    }
  }, [state.user]);

  useEffect(() => { refreshGeneratedKeys(); }, [refreshGeneratedKeys]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    if (email && password.length >= 6) {
      const user: User = {
        id: 'user_' + Date.now(), email, name: email.split('@')[0],
        createdAt: new Date(), isAdmin: email.toLowerCase() === ADMIN_EMAIL,
      };
      localStorage.setItem('midnight_panda_user', JSON.stringify(user));
      setState(prev => ({ ...prev, user, isAuthenticated: true }));
      return true;
    }
    return false;
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    if (email && password.length >= 6 && name) {
      const user: User = {
        id: 'user_' + Date.now(), email, name,
        createdAt: new Date(), isAdmin: email.toLowerCase() === ADMIN_EMAIL,
      };
      localStorage.setItem('midnight_panda_user', JSON.stringify(user));
      setState(prev => ({ ...prev, user, isAuthenticated: true }));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('midnight_panda_user');
    localStorage.removeItem('midnight_panda_license');
    setState({ user: null, license: null, isAuthenticated: false, isLoading: false });
    setGeneratedKeys([]);
  }, []);

  const isAdmin = useCallback((): boolean => {
    return state.user?.email?.toLowerCase() === ADMIN_EMAIL;
  }, [state.user]);

  const getGeneratedKeys = useCallback((): GeneratedKey[] => generatedKeys, [generatedKeys]);

  const generateAndStoreKey = useCallback(async (email: string, duration: LicenseDuration): Promise<GeneratedKey | null> => {
    const res = await callLicenseManager({ action: 'create', email, duration, adminEmail: state.user?.email });
    if (!res?.success) return null;
    const k = res.key;
    const newKey: GeneratedKey = {
      id: k.id, email: k.customer_email, key: k.license_key,
      duration: k.duration, createdAt: new Date(k.created_at), isActive: k.is_active,
    };
    setGeneratedKeys(prev => [newKey, ...prev]);
    return newKey;
  }, [state.user]);

  const deactivateKey = useCallback(async (keyId: string) => {
    const res = await callLicenseManager({ action: 'deactivate', keyId, adminEmail: state.user?.email });
    if (res?.success) {
      setGeneratedKeys(prev => prev.map(k => k.id === keyId ? { ...k, isActive: false } : k));
    }
  }, [state.user]);

  const deleteKey = useCallback(async (keyId: string) => {
    const res = await callLicenseManager({ action: 'delete', keyId, adminEmail: state.user?.email });
    if (res?.success) {
      setGeneratedKeys(prev => prev.filter(k => k.id !== keyId));
    }
  }, [state.user]);

  const activateLicense = useCallback(async (key: string): Promise<boolean> => {
    const keyRegex = /^P-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!keyRegex.test(key.toUpperCase())) return false;

    const res = await callLicenseManager({ action: 'activate', key });
    if (!res?.success) return false;

    const license: License = {
      key: res.license.key,
      duration: res.license.duration,
      activatedAt: new Date(res.license.activatedAt),
      expiresAt: res.license.expiresAt ? new Date(res.license.expiresAt) : null,
      isActive: true,
    };
    localStorage.setItem('midnight_panda_license', JSON.stringify(license));
    setState(prev => ({ ...prev, license }));
    return true;
  }, []);

  const checkLicenseValidity = useCallback((): boolean => {
    if (!state.license) return false;
    if (!state.license.isActive) return false;
    if (state.license.duration === 'lifetime') return true;
    if (!state.license.expiresAt) return false;
    return new Date(state.license.expiresAt) > new Date();
  }, [state.license]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login, signup, logout,
        activateLicense, checkLicenseValidity,
        isAdmin, getGeneratedKeys, refreshGeneratedKeys,
        generateAndStoreKey, deactivateKey, deleteKey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
