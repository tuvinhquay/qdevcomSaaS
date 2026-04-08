"use client";

import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { auth, googleProvider } from "@/services/firebase";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginEmail = async () => {
    await signInWithEmailAndPassword(auth, email, password);
    router.push("/dashboard");
  };

  const loginGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
    router.push("/dashboard");
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
          <img src="/assets/images/appqdev.png" className="h-16 mx-auto mb-6" />

          <input
            placeholder="Email"
            className="w-full border p-3 mb-3 rounded"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full border p-3 mb-4 rounded"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={loginEmail}
            className="w-full bg-black text-white p-3 rounded mb-3"
          >
            Login
          </button>

          <button onClick={loginGoogle} className="w-full border p-3 rounded">
            Login with Google
          </button>
        </div>
      </div>
    </div>
  );
}
