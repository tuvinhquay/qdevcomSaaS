import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/default_settings";
import { db } from "@/services/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

function getSettingsDocRef(tenantId: string) {
  if (!db) {
    throw new Error("Firestore chua san sang. Kiem tra bien moi truong Firebase.");
  }

  return doc(db, "tenants", tenantId, "settings", "config");
}

export async function getSettings(tenantId: string): Promise<AppSettings> {
  const ref = getSettingsDocRef(tenantId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    await setDoc(ref, {
      ...DEFAULT_SETTINGS,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return DEFAULT_SETTINGS;
  }

  return {
    ...DEFAULT_SETTINGS,
    ...(snapshot.data() as Partial<AppSettings>),
  };
}

export async function updateSettings(tenantId: string, data: Partial<AppSettings>) {
  const ref = getSettingsDocRef(tenantId);

  await setDoc(
    ref,
    {
      ...data,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

export async function updateSettingField<K extends keyof AppSettings>(
  tenantId: string,
  key: K,
  value: AppSettings[K],
) {
  const ref = getSettingsDocRef(tenantId);

  await updateDoc(ref, {
    [key]: value,
    updatedAt: Date.now(),
  });
}
