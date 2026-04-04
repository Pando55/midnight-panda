import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, License, LicenseDuration, AuthState, GeneratedKey } from '@/types';

// Admin email - change this to your email
const ADMIN_EMAIL = 'mohalethapelo93@gmail.com';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  activateLicense: (key: string) => Promise<boolean>;
  checkLicenseValidity: () => boolean;
  isAdmin: () => boolean;
  getGeneratedKeys: () => GeneratedKey[];
  generateAndStoreKey: (email: string, duration: LicenseDuration) => GeneratedKey;
  deactivateKey: (keyId: string) => void;
  deleteKey: (keyId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const KEYS_STORAGE = 'midnight_panda_generated_keys';

function loadKeys(): GeneratedKey[] {
  try {
    const stored = localStorage.getItem(KEYS_STORAGE);
    if (stored) {
      return JSON.parse(stored).map((k: GeneratedKey) => ({
        ...k,
        createdAt: new Date(k.createdAt),
      }));
    }
  } catch {}
  return [];
}

function saveKeys(keys: GeneratedKey[]) {
  localStorage.setItem(KEYS_STORAGE, JSON.stringify(keys));
}

// Generate key in format P-XXXX-XXXX-XXXX
function createLicenseKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => {
    let s = '';
    for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  };
  return `P-${part()}-${part()}-${part()}`;
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
    setGeneratedKeys(loadKeys());

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

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    if (email && password.length >= 6) {
      const user: User = {
        id: 'user_' + Date.now(),
        email,
        name: email.split('@')[0],
        createdAt: new Date(),
        isAdmin: email.toLowerCase() === ADMIN_EMAIL,
      };
      localStorage.setItem('midnight_panda_user', JSON.stringify(user));
      setState(prev => ({ ...prev, user, isAuthenticated: true }));
      return true;
    }
    return false;
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    if (email && password.length >= 6 && name) {
      const user: User = {
        id: 'user_' + Date.now(),
        email,
        name,
        createdAt: new Date(),
        isAdmin: email.toLowerCase() === ADMIN_EMAIL,
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
  }, []);

  const isAdmin = useCallback((): boolean => {
    return state.user?.email?.toLowerCase() === ADMIN_EMAIL;
  }, [state.user]);

  const getGeneratedKeys = useCallback((): GeneratedKey[] => {
    return generatedKeys;
  }, [generatedKeys]);

  const generateAndStoreKey = useCallback((email: string, duration: LicenseDuration): GeneratedKey => {
    const newKey: GeneratedKey = {
      id: 'key_' + Date.now(),
      email,
      key: createLicenseKey(),
      duration,
      createdAt: new Date(),
      isActive: true,
    };
    const updated = [newKey, ...generatedKeys];
    setGeneratedKeys(updated);
    saveKeys(updated);
    return newKey;
  }, [generatedKeys]);

  const deactivateKey = useCallback((keyId: string) => {
    const updated = generatedKeys.map(k =>
      k.id === keyId ? { ...k, isActive: false } : k
    );
    setGeneratedKeys(updated);
    saveKeys(updated);
  }, [generatedKeys]);

  const deleteKey = useCallback((keyId: string) => {
    const updated = generatedKeys.filter(k => k.id !== keyId);
    setGeneratedKeys(updated);
    saveKeys(updated);
  }, [generatedKeys]);

  const activateLicense = useCallback(async (key: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 600));

    // Validate format: P-XXXX-XXXX-XXXX
    const keyRegex = /^P-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!keyRegex.test(key.toUpperCase())) {
      return false;
    }

    // Check against generated keys
    const allKeys = loadKeys();
    const matchedKey = allKeys.find(k => k.key === key.toUpperCase() && k.isActive);
    if (!matchedKey) {
      return false;
    }

    const duration = matchedKey.duration;
    const now = new Date();
    let expiresAt: Date | null = null;

    switch (duration) {
      case '3months': expiresAt = new Date(now.getTime() + 90 * 86400000); break;
      case '6months': expiresAt = new Date(now.getTime() + 180 * 86400000); break;
      case '12months': expiresAt = new Date(now.getTime() + 365 * 86400000); break;
      case 'lifetime': expiresAt = null; break;
    }

    const license: License = { key, duration, activatedAt: now, expiresAt, isActive: true };
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
        isAdmin, getGeneratedKeys, generateAndStoreKey, deactivateKey, deleteKey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
