"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, firebaseEnabled } from "@/services/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  tenantId: string | null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  tenantId: null,
});

const TENANT_STORE_KEY = "qdevcom.tenants.v1";

function upsertTenantId(user: User): string {
  const identityKey = user.email?.toLowerCase() || user.uid;

  if (typeof window === "undefined") {
    return `tenant_${user.uid.slice(0, 8)}`;
  }

  const raw = window.localStorage.getItem(TENANT_STORE_KEY);
  let store: Record<string, string> = {};

  if (raw) {
    try {
      store = JSON.parse(raw) as Record<string, string>;
    } catch {
      store = {};
    }
  }

  if (!store[identityKey]) {
    const seed = user.uid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
    store[identityKey] = `tenant_${seed || "default"}`;
    window.localStorage.setItem(TENANT_STORE_KEY, JSON.stringify(store));
  }

  return store[identityKey];
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseEnabled && !!auth);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseEnabled || !auth) return;

    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setTenantId(user ? upsertTenantId(user) : null);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, tenantId }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
