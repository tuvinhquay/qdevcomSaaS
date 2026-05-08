"use client";

import { useEffect } from "react";
import { runProductionIntelligence } from "@/intelligence/productionIntelligenceEngine";

export function useAutoRunIntelligence(tenantId?: string | null) {
  useEffect(() => {
    if (!tenantId) return;
    if (process.env.NEXT_PUBLIC_ENABLE_INTELLIGENCE !== "true") return;

    void runProductionIntelligence(tenantId).catch((error) => {
      console.error("runProductionIntelligence failed", error);
    });
  }, [tenantId]);
}
