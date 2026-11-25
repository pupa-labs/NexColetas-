import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { INITIAL_TENANTS } from '../../shared/constants/index.ts';
import { TenantOption } from '../../shared/types/index.ts';

interface TenantAuthContextValue {
  activeTenant: TenantOption;
  tenants: TenantOption[];
  selectTenant: (tenantId: string) => void;
  firebaseUser: User | null;
  idToken: string | null;
  authLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const TenantAuthContext = createContext<TenantAuthContextValue>({
  activeTenant: INITIAL_TENANTS[1],
  tenants: INITIAL_TENANTS,
  selectTenant: () => {},
  firebaseUser: null,
  idToken: null,
  authLoading: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export const TenantAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activeTenant, setActiveTenant] = useState<TenantOption>(
    INITIAL_TENANTS[1] // Padrão: Empresa A — Hub Manhuaçu Centro (Isolado)
  );
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const token = await user.getIdToken();
          setIdToken(token);
          await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
        } catch {
          // Mantém sessão local
        }
      } else {
        setIdToken(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const selectTenant = (tenantKeyOrId: string) => {
    const found =
      INITIAL_TENANTS.find(
        (t) => `${t.tenantId}::${t.role}` === tenantKeyOrId
      ) || INITIAL_TENANTS.find((t) => t.tenantId === tenantKeyOrId);
    if (found) {
      setActiveTenant(found);
    }
  };

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleAuthProvider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setIdToken(null);
  };

  return (
    <TenantAuthContext.Provider
      value={{
        activeTenant,
        tenants: INITIAL_TENANTS,
        selectTenant,
        firebaseUser,
        idToken,
        authLoading,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </TenantAuthContext.Provider>
  );
};

export function useTenantAuth() {
  return useContext(TenantAuthContext);
}
