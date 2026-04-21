"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, firebaseEnabled } from "@/services/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { bootstrapTenant } from "@/core/bootstrap/bootstrapTenant";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseEnabled && !!auth);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseEnabled || !auth) return;

    const unsub = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (!user) {
        setTenantId(null);
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        const bootstrapResult = await bootstrapTenant(user);
        setTenantId(bootstrapResult.companyId);
      } catch (error) {
        console.error("Tenant bootstrap failed", error);
        setTenantId(null);
      }

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
