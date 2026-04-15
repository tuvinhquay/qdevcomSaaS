"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import {
  auth,
  firebaseEnabled,
  firebaseInitError,
  googleProvider,
} from "@/services/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const configError =
    firebaseInitError ?? (!firebaseEnabled ? "Firebase is not configured." : "");

  const parseError = (error: unknown) => {
    if (error instanceof Error) return error.message;
    return "Login failed. Please check your credentials and Firebase config.";
  };

  const onLoginSuccess = () => {
    router.push("/dashboard");
  };

  const runLogin = async (runner: () => Promise<void>) => {
    if (!firebaseEnabled || !auth) {
      setErrorMessage(configError || "Firebase is not configured.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await runner();
      onLoginSuccess();
    } catch (error) {
      setErrorMessage(parseError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const loginEmail = async () => {
    const authInstance = auth;
    if (!authInstance) {
      setErrorMessage(configError || "Firebase auth is not ready.");
      return;
    }

    await runLogin(async () => {
      await signInWithEmailAndPassword(authInstance, email, password);
    });
  };

  const loginGoogle = async () => {
    const authInstance = auth;
    const provider = googleProvider;
    if (!authInstance || !provider) {
      setErrorMessage(configError || "Google provider has not been initialized.");
      return;
    }

    await runLogin(async () => {
      await signInWithPopup(authInstance, provider);
    });
  };

  const loginAnonymous = async () => {
    const authInstance = auth;
    if (!authInstance) {
      setErrorMessage(configError || "Firebase auth is not ready.");
      return;
    }

    await runLogin(async () => {
      await signInAnonymously(authInstance);
    });
  };

  const statusRows = [
    "Login Google OK",
    "Login email OK",
    "Login anonymous OK",
    "User mới → auto tạo tenant",
    "Sau login → vào dashboard",
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
        src="/assets/videos/bieutuong1.mp4"
      />
      <div className="absolute inset-0 bg-slate-950/55" />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/20 bg-slate-950/45 p-6 text-slate-100 backdrop-blur-md">
          <div className="mb-6 flex items-center gap-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-slate-900/80 ring-1 ring-white/25">
              <Image
                src="/assets/images/appqdev.png"
                alt="Q-DevCom logo"
                fill
                sizes="64px"
                className="object-contain p-2"
                priority
              />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Q-DEVCOM V2</h1>
              <p className="text-sm text-slate-300">AUTH + MULTI-TENANT SYSTEM</p>
            </div>
          </div>

          <p className="mb-4 text-sm text-slate-200">
            Sau khi chạy <code>npm run dev</code>, kiểm tra nhanh checklist bên dưới:
          </p>

          <ul className="space-y-2">
            {statusRows.map((item) => (
              <li
                key={item}
                className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
              >
                ✓ {item}
              </li>
            ))}
          </ul>

          <p className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
            Ghi chú: tài khoản mới sẽ được tạo tenant tự động theo định danh user để
            phục vụ test luồng multi-tenant.
          </p>
        </section>

        <section className="rounded-2xl border border-white/25 bg-white/92 p-6 shadow-2xl">
          <div className="mx-auto mb-6 flex w-full max-w-sm items-center justify-center">
            <div className="relative h-20 w-20">
              <Image
                src="/assets/images/appqdev.png"
                alt="Q-DevCom app logo"
                fill
                sizes="80px"
                className="object-contain"
                priority
              />
            </div>
          </div>

          <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
          <input
            value={email}
            placeholder="you@company.com"
            className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-0 transition focus:border-slate-500"
            onChange={(event) => setEmail(event.target.value)}
          />

          <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
          <input
            value={password}
            type="password"
            placeholder="••••••••"
            className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-0 transition focus:border-slate-500"
            onChange={(event) => setPassword(event.target.value)}
          />

          <button
            onClick={loginEmail}
            disabled={!firebaseEnabled || isSubmitting}
            className="mb-3 w-full rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Login with Email
          </button>

          <button
            onClick={loginGoogle}
            disabled={!firebaseEnabled || isSubmitting}
            className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Login with Google
          </button>

          <button
            onClick={loginAnonymous}
            disabled={!firebaseEnabled || isSubmitting}
            className="w-full rounded-lg border border-slate-400 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Login Anonymous
          </button>

          {(errorMessage || configError) && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage || configError}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
