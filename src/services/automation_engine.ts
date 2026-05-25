import { db } from "@/services/firebase";
import { createNotification, type NotificationRole } from "@/services/notification_service";
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";

type RuleKey =
  | "LOW_STOCK_ALERT"
  | "WORK_ORDER_DELAY_RISK"
  | "HIGH_THREAT_SCORE"
  | "LOW_PRODUCTION_HEALTH";

type RuleDoc = {
  key: RuleKey;
  enabled: boolean;
  config: Record<string, unknown>;
  updatedAt?: unknown;
  lastNotifiedAt?: number;
};

const DEFAULT_TARGET_ROLES: NotificationRole[] = ["owner", "admin", "manager"];

function ensureDb() {
  if (!db) {
    throw new Error("Firestore is not initialized. Check Firebase env variables.");
  }
  return db;
}

async function getOrCreateRule(tenantId: string, key: RuleKey): Promise<RuleDoc> {
  const firestore = ensureDb();
  const ref = doc(firestore, "tenants", tenantId, "automation_rules", key);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data() as RuleDoc;
  }

  const created: RuleDoc = { key, enabled: true, config: {} };
  await setDoc(ref, { ...created, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
  return created;
}

async function shouldNotifyNow(tenantId: string, key: RuleKey, cooldownMs = 5 * 60 * 1000) {
  const firestore = ensureDb();
  const ref = doc(firestore, "tenants", tenantId, "automation_rules", key);
  const snap = await getDoc(ref);
  const now = Date.now();

  if (!snap.exists()) return true;
  const data = snap.data() as RuleDoc;
  if (!data.enabled) return false;
  if (!data.lastNotifiedAt) return true;
  return now - data.lastNotifiedAt >= cooldownMs;
}

async function touchNotifiedAt(tenantId: string, key: RuleKey) {
  const firestore = ensureDb();
  const ref = doc(firestore, "tenants", tenantId, "automation_rules", key);
  await setDoc(
    ref,
    {
      key,
      enabled: true,
      updatedAt: serverTimestamp(),
      lastNotifiedAt: Date.now(),
    },
    { merge: true },
  );
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function runAutomationChecks(tenantId: string) {
  const firestore = ensureDb();

  const [settingsSnap, warehouseSnap, workOrdersSnap, securityMetaSnap, productionIntelSnap] = await Promise.all([
    getDoc(doc(firestore, "tenants", tenantId, "settings", "config")),
    getDocs(collection(firestore, "tenants", tenantId, "warehouse_items")),
    getDocs(collection(firestore, "tenants", tenantId, "work_orders")),
    getDoc(doc(firestore, "securityMeta", "global")),
    getDoc(doc(firestore, "intelligence", "production", "global")),
  ]);

  const minStock =
    toNumber((settingsSnap.data() as { warehouse?: { minStock?: number } } | undefined)?.warehouse?.minStock) || 50;

  await Promise.all([
    getOrCreateRule(tenantId, "LOW_STOCK_ALERT"),
    getOrCreateRule(tenantId, "WORK_ORDER_DELAY_RISK"),
    getOrCreateRule(tenantId, "HIGH_THREAT_SCORE"),
    getOrCreateRule(tenantId, "LOW_PRODUCTION_HEALTH"),
  ]);

  const lowStockItems = warehouseSnap.docs.filter((item) => {
    const data = item.data() as { quantityRemaining?: number };
    return toNumber(data.quantityRemaining) < minStock;
  });

  if (lowStockItems.length > 0 && (await shouldNotifyNow(tenantId, "LOW_STOCK_ALERT"))) {
    await createNotification(tenantId, {
      type: "warning",
      title: "Sắp hết nguyên liệu",
      message: `Có ${lowStockItems.length} vật tư dưới ngưỡng tối thiểu (${minStock}).`,
      module: "warehouse",
      targetRoles: DEFAULT_TARGET_ROLES,
    });
    await touchNotifiedAt(tenantId, "LOW_STOCK_ALERT");
  }

  const now = Date.now();
  const delayedOrders = workOrdersSnap.docs.filter((item) => {
    const data = item.data() as { dueDate?: number; status?: string; targetQuantity?: number; completedQuantity?: number };
    const target = toNumber(data.targetQuantity);
    const completed = toNumber(data.completedQuantity);
    const progress = target > 0 ? completed / target : 0;
    const dueDate = toNumber(data.dueDate);
    return dueDate > 0 && dueDate < now && data.status !== "completed" && progress < 1;
  });

  if (delayedOrders.length > 0 && (await shouldNotifyNow(tenantId, "WORK_ORDER_DELAY_RISK"))) {
    await createNotification(tenantId, {
      type: "warning",
      title: "Work order có nguy cơ trễ deadline",
      message: `Có ${delayedOrders.length} work order đang chậm tiến độ.`,
      module: "production",
      targetRoles: DEFAULT_TARGET_ROLES,
    });
    await touchNotifiedAt(tenantId, "WORK_ORDER_DELAY_RISK");
  }

  const threatScore = toNumber((securityMetaSnap.data() as { threatScore?: number } | undefined)?.threatScore);
  if (threatScore > 70 && (await shouldNotifyNow(tenantId, "HIGH_THREAT_SCORE"))) {
    await createNotification(tenantId, {
      type: "error",
      title: "Hệ thống phát hiện nguy cơ bảo mật",
      message: `Threat score hiện tại là ${threatScore}.`,
      module: "security",
      targetRoles: DEFAULT_TARGET_ROLES,
    });
    await touchNotifiedAt(tenantId, "HIGH_THREAT_SCORE");
  }

  const healthScore = toNumber(
    (productionIntelSnap.data() as { healthScore?: { score?: number } } | undefined)?.healthScore?.score,
  );
  if (healthScore > 0 && healthScore < 60 && (await shouldNotifyNow(tenantId, "LOW_PRODUCTION_HEALTH"))) {
    await createNotification(tenantId, {
      type: "warning",
      title: "Hiệu suất sản xuất đang giảm",
      message: `Production health score hiện tại là ${Math.round(healthScore)}.`,
      module: "production",
      targetRoles: DEFAULT_TARGET_ROLES,
    });
    await touchNotifiedAt(tenantId, "LOW_PRODUCTION_HEALTH");
  }
}
