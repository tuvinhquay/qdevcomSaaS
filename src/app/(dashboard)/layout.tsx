"use client";
import { useAuth } from "@/core/auth/AuthProvider";
import MainLayout from "@/components/layout/MainLayout";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading) return null;
  if (!user) return null;

  return <MainLayout>{children}</MainLayout>;
}