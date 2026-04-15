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

  const runLogin = async (runner: () => Promise<void>) => {
    if (!firebaseEnabled || !auth) {
      setErrorMessage(configError || "Firebase is not configured.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await runner();
      router.push("/dashboard");
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

  const quickChecks = ["Login Google", "Login email", "Login anonymous"];

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
      <div className="absolute inset-0 bg-slate-950/56" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8">
        <section className="w-full max-w-md rounded-3xl border border-white/45 bg-white/18 p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-4">
            <div className="relative h-20 w-20 rounded-2xl border border-white/45 bg-white/28 p-2 shadow-[0_10px_24px_rgba(0,0,0,0.3)]">
              <Image
                src="/assets/images/appqdev.png"
                alt="Q-DevCom app logo"
                fill
                sizes="80px"
                className="object-contain p-2"
                priority
              />
            </div>

            <div>
              <h1 className="text-3xl font-extrabold tracking-wide [text-shadow:0_1px_0_rgba(255,255,255,0.85),0_8px_20px_rgba(0,0,0,0.45)]">
                Q-DEVCOM V2
              </h1>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/85">
                Auth Login Portal
              </p>
            </div>
          </div>

          <label className="mb-1.5 block text-sm font-semibold text-white/95">Email</label>
          <input
            value={email}
            placeholder="you@company.com"
            className="mb-3 w-full rounded-xl border border-white/50 bg-white/24 px-3 py-2 text-slate-100 placeholder:text-white/70 outline-none transition focus:border-white/85"
            onChange={(event) => setEmail(event.target.value)}
          />

          <label className="mb-1.5 block text-sm font-semibold text-white/95">Password</label>
          <input
            value={password}
            type="password"
            placeholder="••••••••"
            className="mb-4 w-full rounded-xl border border-white/50 bg-white/24 px-3 py-2 text-slate-100 placeholder:text-white/70 outline-none transition focus:border-white/85"
            onChange={(event) => setPassword(event.target.value)}
          />

          <button
            onClick={loginEmail}
            disabled={!firebaseEnabled || isSubmitting}
            className="mb-2.5 w-full rounded-xl border border-white/65 bg-white/22 px-3 py-2 text-sm font-bold tracking-wide text-white [text-shadow:0_1px_0_rgba(255,255,255,0.85),0_6px_14px_rgba(0,0,0,0.45)] transition hover:bg-white/32 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Login with Email
          </button>

          <button
            onClick={loginGoogle}
            disabled={!firebaseEnabled || isSubmitting}
            className="mb-2.5 w-full rounded-xl border border-white/65 bg-white/22 px-3 py-2 text-sm font-bold tracking-wide text-white [text-shadow:0_1px_0_rgba(255,255,255,0.85),0_6px_14px_rgba(0,0,0,0.45)] transition hover:bg-white/32 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Login with Google
          </button>

          <button
            onClick={loginAnonymous}
            disabled={!firebaseEnabled || isSubmitting}
            className="w-full rounded-xl border border-white/65 bg-white/22 px-3 py-2 text-sm font-bold tracking-wide text-white [text-shadow:0_1px_0_rgba(255,255,255,0.85),0_6px_14px_rgba(0,0,0,0.45)] transition hover:bg-white/32 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Login Anonymous
          </button>

          <div className="mt-5 space-y-1.5 rounded-2xl border border-white/40 bg-white/12 p-3">
            {quickChecks.map((item) => (
              <p
                key={item}
                className="text-sm font-semibold text-white [text-shadow:0_1px_0_rgba(255,255,255,0.82),0_8px_16px_rgba(0,0,0,0.5)]"
              >
                - {item}
              </p>
            ))}
            <p className="mt-2 rounded-xl border border-amber-200/60 bg-amber-100/20 px-2 py-1.5 text-xs font-semibold text-amber-50 [text-shadow:0_1px_0_rgba(255,255,255,0.7),0_6px_12px_rgba(0,0,0,0.45)]">
              CẢNH BÁO: phần đăng nhập nhanh không có lưu trữ dữ liệu thật. Mục đích
              chỉ để tham quan giao diện app.
            </p>
          </div>

          {(errorMessage || configError) && (
            <p className="mt-4 rounded-xl border border-red-200/70 bg-red-500/20 px-3 py-2 text-sm text-red-100">
              {errorMessage || configError}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
