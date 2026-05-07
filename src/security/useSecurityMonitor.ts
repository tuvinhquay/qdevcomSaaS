"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  onSnapshot as onDocSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useSecurityMonitor() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [threatScore, setThreatScore] = useState(0);

  useEffect(() => {
    if (!db) return;

    const q = query(
      collection(db, "securityEvents"),
      orderBy("createdAt", "desc"),
      limit(20),
    );

    const unsubEvents = onSnapshot(q, (snap) => {
      const data: any[] = [];
      snap.forEach((item) => data.push({ id: item.id, ...item.data() }));
      setAlerts(data);
    });

    const unsubMeta = onDocSnapshot(
      doc(db, "securityMeta", "global"),
      (snap) => {
        if (snap.exists()) {
          setThreatScore(Number(snap.data().threatScore || 0));
        }
      },
    );

    return () => {
      unsubEvents();
      unsubMeta();
    };
  }, []);

  return { alerts, threatScore };
}
