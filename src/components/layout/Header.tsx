"use client";

import { useAuth } from "@/core/auth/AuthProvider";
import { auth } from "@/services/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

function resolveUserName(email: string | null | undefined) {
  if (!email) return "User";
  const [name] = email.split("@");
  return name || "User";
}

export default function Header() {
  const router = useRouter();
  const { user, tenantId } = useAuth();

  const email = user?.email || null;
  const displayName = user?.displayName || resolveUserName(email);
  const avatarText = displayName.slice(0, 1).toUpperCase();

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-white/15 bg-slate-950/45 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="text-sm font-semibold tracking-tight text-slate-100">Q-DevCom SaaS</div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-white/10"
          >
            Logout
          </button>

          <div className="hidden text-right sm:block">
            <div className="text-xs text-slate-300">Signed in as</div>
            <div className="text-sm font-medium text-slate-100">{displayName}</div>
            {tenantId && <div className="text-[11px] text-slate-300">Tenant: {tenantId}</div>}
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700/80 text-sm font-semibold text-slate-100 ring-2 ring-slate-500/60">
            {avatarText}
          </div>
        </div>
      </div>
    </header>
  );
}
