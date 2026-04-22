"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, firebaseEnabled } from "@/services/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { bootstrapTenant } from "@/core/bootstrap/bootstrapTenant";
import { getUserRole } from "@/core/firestore/roles";
import { type UserRole } from "@/core/firestore/firestoreClient";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  tenantId: string | null;
  currentUserRole: UserRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  tenantId: null,
  currentUserRole: null,
  isOwner: false,
  isAdmin: false,
  isManager: false,
  isStaff: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseEnabled && !!auth);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    if (!firebaseEnabled || !auth) return;

    const unsub = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);

      if (!authUser) {
        setTenantId(null);
        setCurrentUserRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const bootstrapResult = await bootstrapTenant(authUser);
        const role = await getUserRole(bootstrapResult.companyId, authUser.uid);

        setTenantId(bootstrapResult.companyId);
        setCurrentUserRole(role);
      } catch (error) {
        console.error("Tenant bootstrap failed", error);
        setTenantId(null);
        setCurrentUserRole(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  const contextValue = useMemo<AuthContextType>(() => {
    return {
      user,
      loading,
      tenantId,
      currentUserRole,
      isOwner: currentUserRole === "owner",
      isAdmin: currentUserRole === "admin",
      isManager: currentUserRole === "manager",
      isStaff: currentUserRole === "staff",
    };
  }, [currentUserRole, loading, tenantId, user]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
