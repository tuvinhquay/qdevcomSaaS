import { db } from "@/lib/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

export async function updateThreatScore(score: number) {
  if (!db) return;

  await setDoc(
    doc(db, "securityMeta", "global"),
    {
      threatScore: score,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
