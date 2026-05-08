"use client";

import { db } from "@/services/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

type IntelligenceDoc = {
  healthScore?: { score?: number; status?: "good" | "warning" | "critical" };
  bottlenecks?: { bottlenecks?: string[]; severity?: "low" | "medium" | "high" };
  delayPrediction?: { delayRisk?: "low" | "medium" | "high"; confidence?: number };
  [key: string]: unknown;
};

export function useProductionIntelligence() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<IntelligenceDoc | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const ref = doc(db, "intelligence", "production", "global");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setData(snap.exists() ? (snap.data() as IntelligenceDoc) : null);
        setLoading(false);
      },
      () => setLoading(false),
    );

    return () => unsub();
  }, []);

  return {
    loading,
    data,
    healthScore: data?.healthScore,
    bottlenecks: data?.bottlenecks,
    delayRisk: data?.delayPrediction,
  };
}
