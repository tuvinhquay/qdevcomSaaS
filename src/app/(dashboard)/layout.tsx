"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import { AuthProvider, useAuth } from "@/core/auth/AuthProvider";
import { type UserRole } from "@/core/firestore/firestoreClient";

const VALID_ROLES: UserRole[] = ["owner", "admin", "manager", "staff", "guest"];

function DashboardAccessGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading, currentUserRole } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <p className="text-sm">Checking access...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <p className="text-sm">Redirecting to login...</p>
      </div>
    );
  }

  if (!currentUserRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <p className="text-sm font-semibold">Access denied (role not found)</p>
      </div>
    );
  }

  if (!VALID_ROLES.includes(currentUserRole)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <p className="text-sm font-semibold">Access denied</p>
      </div>
    );
  }

  return <MainLayout>{children}</MainLayout>;
}

export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DashboardAccessGuard>{children}</DashboardAccessGuard>
    </AuthProvider>
  );
}
