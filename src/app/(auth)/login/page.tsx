"use client";

import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { auth, googleProvider } from "@/services/firebase";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const loginEmail = async () => {
    setError("");

    if (!validateEmail(email)) {
      setError("Email không hợp lệ. Vui lòng nhập đúng định dạng.");
      return;
    }

    if (!password.trim()) {
      setError("Mật khẩu không được để trống.");
      return;
    }

    try {
      setIsSubmitting(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        return;
      }
      setError("Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const loginGoogle = async () => {
    setError("");
    try {
      setIsSubmitting(true);
      await signInWithPopup(auth, googleProvider);
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        return;
      }
      setError("Đăng nhập Google thất bại. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <video
        autoPlay
        muted
        loop
        className="absolute w-full h-full object-cover"
        src="/assets/videos/bieutuong1.mp4"
      />

      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
        <div className="bg-white p-10 rounded-2xl shadow-xl w-[380px]">
          <Image
            src="/assets/images/appqdev.png"
            alt="QDevCom logo"
            width={64}
            height={64}
            className="h-16 w-16 mx-auto mb-6"
            priority
          />

          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            className="w-full border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 p-3 mb-3 rounded outline-none focus:ring-2 focus:ring-slate-300"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            className="w-full border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 p-3 mb-4 rounded outline-none focus:ring-2 focus:ring-slate-300"
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
          )}

          <button
            onClick={loginEmail}
            disabled={isSubmitting}
            className="w-full bg-black text-white p-3 rounded mb-3 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Đang đăng nhập..." : "Login"}
          </button>

          <button
            onClick={loginGoogle}
            disabled={isSubmitting}
            className="w-full border border-slate-300 bg-white text-slate-900 p-3 rounded disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Login with Google
          </button>
        </div>
      </div>
    </div>
  );
}
