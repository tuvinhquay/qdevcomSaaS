"use client";

import { auth, db } from "@/services/firebase";
import { doc, getDoc, writeBatch } from "firebase/firestore";
import { getCurrentCompanyId } from "@/core/firestore/firestoreClient";

type SeedOptions = {
  overwrite?: boolean;
};

export type SeedResult = {
  tenantId: string;
  created: number;
  skipped: number;
  byCollection: Record<string, number>;
};

type SeedEntry = {
  path: string;
  collection: string;
  data: Record<string, unknown>;
};

function assertFirestoreReady() {
  if (!db) {
    throw new Error("Firestore is not initialized. Check Firebase env variables.");
  }
}

function nowMinusMinutes(minutes: number): number {
  return Date.now() - minutes * 60_000;
}

function docFromPath(path: string) {
  const segments = path.split("/");
  const [first, ...rest] = segments;

  if (!first || rest.length === 0 || segments.length % 2 !== 0) {
    throw new Error(`Invalid document path: ${path}`);
  }

  return doc(db!, first, ...rest);
}

function makeSeedEntries(tenantId: string, createdBy: string): SeedEntry[] {
  const now = Date.now();

  const users = [
    {
      id: "demo-u001",
      personalId: "qbb21455hhfv001",
      name: "Nguyen Van A",
      role: "staff",
      language: "vi",
      avatarUrl: "/assets/images/appqdev.png",
      friendIds: ["demo-u002", "demo-u003"],
      email: "demo.u001@qdev.local",
    },
    {
      id: "demo-u002",
      personalId: "qbb21455hhfv002",
      name: "Tran Thi B",
      role: "staff",
      language: "en",
      avatarUrl: "/assets/images/appqdev.png",
      friendIds: ["demo-u001"],
      email: "demo.u002@qdev.local",
    },
    {
      id: "demo-u003",
      personalId: "qbb21455hhfv003",
      name: "Le Van C",
      role: "manager",
      language: "ja",
      avatarUrl: "/assets/images/appqdev.png",
      friendIds: ["demo-u001"],
      email: "demo.u003@qdev.local",
    },
    {
      id: "demo-u004",
      personalId: "qbb21455hhfv004",
      name: "Pham Thi D",
      role: "staff",
      language: "ko",
      avatarUrl: "/assets/images/appqdev.png",
      friendIds: ["demo-u005"],
      email: "demo.u004@qdev.local",
    },
    {
      id: "demo-u005",
      personalId: "qbb21455hhfv005",
      name: "Nguyen Van E",
      role: "admin",
      language: "zh",
      avatarUrl: "/assets/images/appqdev.png",
      friendIds: ["demo-u004"],
      email: "demo.u005@qdev.local",
    },
    {
      id: "demo-u006",
      personalId: "qbb21455hhfv006",
      name: "Hoang Thi F",
      role: "staff",
      language: "vi",
      avatarUrl: "/assets/images/appqdev.png",
      friendIds: ["demo-u001"],
      email: "demo.u006@qdev.local",
    },
  ];

  const userEntries: SeedEntry[] = users.map((user) => ({
    path: `companies/${tenantId}/members/${user.id}`,
    collection: "members",
    data: {
      userId: user.id,
      personalId: user.personalId,
      displayName: user.name,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      language: user.language,
      friendIds: user.friendIds,
      email: user.email,
      tenantId,
      createdAt: now,
      updatedAt: now,
      isDemo: true,
    },
  }));

  const workOrders: SeedEntry[] = [
    {
      path: `companies/${tenantId}/workOrders/demo-wo-001`,
      collection: "workOrders",
      data: {
        id: "demo-wo-001",
        tenantId,
        title: "WO-001 Gia cong vo nhua",
        description: "Gia cong 5,000 vo nhua cho don hang thang nay.",
        status: "in_progress",
        assignedTo: "demo-u003",
        createdBy,
        createdAt: now,
        updatedAt: now,
        isDemo: true,
      },
    },
    {
      path: `companies/${tenantId}/workOrders/demo-wo-002`,
      collection: "workOrders",
      data: {
        id: "demo-wo-002",
        tenantId,
        title: "WO-002 Lap rap module A",
        description: "Lap rap 2,000 bo module A theo ban ve moi.",
        status: "pending",
        assignedTo: "demo-u001",
        createdBy,
        createdAt: now,
        updatedAt: now,
        isDemo: true,
      },
    },
    {
      path: `companies/${tenantId}/workOrders/demo-wo-003`,
      collection: "workOrders",
      data: {
        id: "demo-wo-003",
        tenantId,
        title: "WO-003 Dong goi lo B",
        description: "Dong goi thanh pham lo B de giao kho trung tam.",
        status: "completed",
        assignedTo: "demo-u002",
        createdBy,
        createdAt: nowMinusMinutes(180),
        updatedAt: nowMinusMinutes(30),
        isDemo: true,
      },
    },
    {
      path: `companies/${tenantId}/workOrders/demo-wo-004`,
      collection: "workOrders",
      data: {
        id: "demo-wo-004",
        tenantId,
        title: "WO-004 Kiem dinh chat luong",
        description: "Kiem tra chat luong 100% truoc khi xuat kho.",
        status: "in_progress",
        assignedTo: "demo-u006",
        createdBy,
        createdAt: nowMinusMinutes(90),
        updatedAt: now,
        isDemo: true,
      },
    },
  ];

  const productionOrders: SeedEntry[] = [
    {
      path: `companies/${tenantId}/productionOrders/demo-po-001`,
      collection: "productionOrders",
      data: {
        id: "demo-po-001",
        tenantId,
        companyId: tenantId,
        workOrderId: "demo-wo-001",
        title: "Len chuyen ep nhua A1",
        description: "Chay may ep nhua line A1.",
        quantity: 1500,
        producedQuantity: 1100,
        status: "in_progress",
        assignedTo: "demo-u001",
        createdBy,
        startDate: nowMinusMinutes(240),
        dueDate: now + 6 * 60 * 60 * 1000,
        createdAt: nowMinusMinutes(240),
        updatedAt: now,
        isDemo: true,
      },
    },
    {
      path: `companies/${tenantId}/productionOrders/demo-po-002`,
      collection: "productionOrders",
      data: {
        id: "demo-po-002",
        tenantId,
        companyId: tenantId,
        workOrderId: "demo-wo-002",
        title: "Lap rap module A ca 2",
        description: "To lap rap ca 2.",
        quantity: 2000,
        producedQuantity: 920,
        status: "in_progress",
        assignedTo: "demo-u002",
        createdBy,
        startDate: nowMinusMinutes(210),
        dueDate: now + 8 * 60 * 60 * 1000,
        createdAt: nowMinusMinutes(210),
        updatedAt: now,
        isDemo: true,
      },
    },
    {
      path: `companies/${tenantId}/productionOrders/demo-po-003`,
      collection: "productionOrders",
      data: {
        id: "demo-po-003",
        tenantId,
        companyId: tenantId,
        workOrderId: "demo-wo-003",
        title: "Dong goi lo B",
        description: "Hoan thanh va chuyen kho.",
        quantity: 800,
        producedQuantity: 800,
        status: "completed",
        assignedTo: "demo-u006",
        createdBy,
        startDate: nowMinusMinutes(480),
        dueDate: nowMinusMinutes(60),
        createdAt: nowMinusMinutes(480),
        updatedAt: nowMinusMinutes(50),
        isDemo: true,
      },
    },
    {
      path: `companies/${tenantId}/productionOrders/demo-po-004`,
      collection: "productionOrders",
      data: {
        id: "demo-po-004",
        tenantId,
        companyId: tenantId,
        workOrderId: "demo-wo-004",
        title: "Kiem dinh chat luong",
        description: "Dang xu ly danh gia loi.",
        quantity: 600,
        producedQuantity: 350,
        status: "in_progress",
        assignedTo: "demo-u004",
        createdBy,
        startDate: nowMinusMinutes(150),
        dueDate: nowMinusMinutes(20),
        createdAt: nowMinusMinutes(150),
        updatedAt: nowMinusMinutes(10),
        isDemo: true,
      },
    },
  ];

  const warehouseItems: SeedEntry[] = [
    {
      path: `companies/${tenantId}/warehouse/demo-wh-001`,
      collection: "warehouse",
      data: {
        id: "demo-wh-001",
        tenantId,
        companyId: tenantId,
        name: "Chi may cong nghiep",
        SKU: "WH-THREAD-001",
        quantity: 12,
        minStock: 50,
        location: "A1-01",
        status: "in_stock",
        createdBy,
        assignedTo: "demo-u005",
        createdAt: now,
        updatedAt: now,
        notes: "Vat tu can bo sung som.",
        isDemo: true,
      },
    },
    {
      path: `companies/${tenantId}/warehouse/demo-wh-002`,
      collection: "warehouse",
      data: {
        id: "demo-wh-002",
        tenantId,
        companyId: tenantId,
        name: "Hat nhua ABS",
        SKU: "WH-ABS-002",
        quantity: 420,
        minStock: 200,
        location: "B2-03",
        status: "in_stock",
        createdBy,
        assignedTo: "demo-u003",
        createdAt: nowMinusMinutes(300),
        updatedAt: nowMinusMinutes(20),
        notes: "Ton kho an toan.",
        isDemo: true,
      },
    },
    {
      path: `companies/${tenantId}/warehouse/demo-wh-003`,
      collection: "warehouse",
      data: {
        id: "demo-wh-003",
        tenantId,
        companyId: tenantId,
        name: "Bo cam bien QC",
        SKU: "WH-QC-003",
        quantity: 8,
        minStock: 20,
        location: "C1-02",
        status: "reserved",
        createdBy,
        assignedTo: "demo-u006",
        createdAt: nowMinusMinutes(420),
        updatedAt: nowMinusMinutes(30),
        notes: "Da reserve cho line kiem dinh.",
        isDemo: true,
      },
    },
    {
      path: `companies/${tenantId}/warehouse/demo-wh-004`,
      collection: "warehouse",
      data: {
        id: "demo-wh-004",
        tenantId,
        companyId: tenantId,
        name: "Khay dong goi",
        SKU: "WH-PACK-004",
        quantity: 160,
        minStock: 80,
        location: "D3-01",
        status: "in_stock",
        createdBy,
        assignedTo: "demo-u001",
        createdAt: nowMinusMinutes(180),
        updatedAt: nowMinusMinutes(15),
        notes: "Su dung cho ca sang.",
        isDemo: true,
      },
    },
    {
      path: `companies/${tenantId}/warehouse/demo-wh-005`,
      collection: "warehouse",
      data: {
        id: "demo-wh-005",
        tenantId,
        companyId: tenantId,
        name: "Tem QR dong goi",
        SKU: "WH-QR-005",
        quantity: 30,
        minStock: 120,
        location: "E1-04",
        status: "out_of_stock",
        createdBy,
        assignedTo: "demo-u002",
        createdAt: nowMinusMinutes(120),
        updatedAt: nowMinusMinutes(5),
        notes: "Can nhap bo sung trong ngay.",
        isDemo: true,
      },
    },
  ];

  const chatMessages: SeedEntry[] = [
    {
      path: `companies/${tenantId}/chat/demo-chat-001`,
      collection: "chat",
      data: {
        id: "demo-chat-001",
        tenantId,
        companyId: tenantId,
        senderId: "demo-u003",
        senderName: "Le Van C",
        senderAvatar: "/assets/images/appqdev.png",
        content: "Ca sang update tien do line A1 giup minh nhe.",
        channel: "production",
        createdAt: nowMinusMinutes(65),
        updatedAt: nowMinusMinutes(65),
        isDemo: true,
      },
    },
    {
      path: `companies/${tenantId}/chat/demo-chat-002`,
      collection: "chat",
      data: {
        id: "demo-chat-002",
        tenantId,
        companyId: tenantId,
        senderId: "demo-u001",
        senderName: "Nguyen Van A",
        senderAvatar: "/assets/images/appqdev.png",
        content: "Line A1 da dat 73%, du kien tang toc sau 15 phut.",
        channel: "production",
        createdAt: nowMinusMinutes(62),
        updatedAt: nowMinusMinutes(62),
        isDemo: true,
      },
    },
    {
      path: `companies/${tenantId}/chat/demo-chat-003`,
      collection: "chat",
      data: {
        id: "demo-chat-003",
        tenantId,
        companyId: tenantId,
        senderId: "demo-u005",
        senderName: "Nguyen Van E",
        senderAvatar: "/assets/images/appqdev.png",
        content: "Kho con thieu chi may, de nghi bo sung gap.",
        channel: "warehouse",
        createdAt: nowMinusMinutes(55),
        updatedAt: nowMinusMinutes(55),
        isDemo: true,
      },
    },
    {
      path: `companies/${tenantId}/chat/demo-chat-004`,
      collection: "chat",
      data: {
        id: "demo-chat-004",
        tenantId,
        companyId: tenantId,
        senderId: "demo-u002",
        senderName: "Tran Thi B",
        senderAvatar: "/assets/images/appqdev.png",
        content: "@q hom nay san luong bao nhieu?",
        channel: "general",
        createdAt: nowMinusMinutes(48),
        updatedAt: nowMinusMinutes(48),
        isDemo: true,
      },
    },
    {
      path: `companies/${tenantId}/chat/demo-chat-005`,
      collection: "chat",
      data: {
        id: "demo-chat-005",
        tenantId,
        companyId: tenantId,
        senderId: "demo-u004",
        senderName: "Pham Thi D",
        senderAvatar: "/assets/images/appqdev.png",
        content: "QC phat hien 2 lo can kiem tra lai.",
        channel: "ops",
        createdAt: nowMinusMinutes(44),
        updatedAt: nowMinusMinutes(44),
        isDemo: true,
      },
    },
    {
      path: `companies/${tenantId}/chat/demo-chat-006`,
      collection: "chat",
      data: {
        id: "demo-chat-006",
        tenantId,
        companyId: tenantId,
        senderId: "demo-u006",
        senderName: "Hoang Thi F",
        senderAvatar: "/assets/images/appqdev.png",
        content: "Da dong goi xong lo B, chuyen kho luc 16:30.",
        channel: "general",
        createdAt: nowMinusMinutes(38),
        updatedAt: nowMinusMinutes(38),
        isDemo: true,
      },
    },
    {
      path: `companies/${tenantId}/chat/demo-chat-007`,
      collection: "chat",
      data: {
        id: "demo-chat-007",
        tenantId,
        companyId: tenantId,
        senderId: "demo-u001",
        senderName: "Nguyen Van A",
        senderAvatar: "/assets/images/appqdev.png",
        content: "Minh co the ho tro them ca toi cho line A1.",
        channel: "production",
        createdAt: nowMinusMinutes(31),
        updatedAt: nowMinusMinutes(31),
        isDemo: true,
      },
    },
    {
      path: `companies/${tenantId}/chat/demo-chat-008`,
      collection: "chat",
      data: {
        id: "demo-chat-008",
        tenantId,
        companyId: tenantId,
        senderId: "demo-u003",
        senderName: "Le Van C",
        senderAvatar: "/assets/images/appqdev.png",
        content: "OK, doi kho cap them vat tu roi len ke hoach tiep.",
        channel: "production",
        createdAt: nowMinusMinutes(25),
        updatedAt: nowMinusMinutes(25),
        isDemo: true,
      },
    },
    {
      path: `companies/${tenantId}/chat/demo-chat-009`,
      collection: "chat",
      data: {
        id: "demo-chat-009",
        tenantId,
        companyId: tenantId,
        senderId: "demo-u005",
        senderName: "Nguyen Van E",
        senderAvatar: "/assets/images/appqdev.png",
        content: "Da tao yeu cau mua bo sung tem QR va chi may.",
        channel: "warehouse",
        createdAt: nowMinusMinutes(18),
        updatedAt: nowMinusMinutes(18),
        isDemo: true,
      },
    },
    {
      path: `companies/${tenantId}/chat/demo-chat-010`,
      collection: "chat",
      data: {
        id: "demo-chat-010",
        tenantId,
        companyId: tenantId,
        senderId: "demo-u002",
        senderName: "Tran Thi B",
        senderAvatar: "/assets/images/appqdev.png",
        content: "Canh bao: don WO-004 co nguy co tre deadline.",
        channel: "ops",
        createdAt: nowMinusMinutes(10),
        updatedAt: nowMinusMinutes(10),
        isDemo: true,
      },
    },
  ];

  return [...userEntries, ...workOrders, ...productionOrders, ...warehouseItems, ...chatMessages];
}

export async function seedSampleData(options: SeedOptions = {}): Promise<SeedResult> {
  assertFirestoreReady();

  const tenantId = await getCurrentCompanyId();
  const currentUid = auth?.currentUser?.uid;

  if (!tenantId || !currentUid) {
    throw new Error("Tenant or authenticated user is missing.");
  }

  const overwrite = options.overwrite ?? false;
  const seedEntries = makeSeedEntries(tenantId, currentUid);

  let created = 0;
  let skipped = 0;
  const byCollection: Record<string, number> = {};

  const commitChunks: Array<Array<{ path: string; data: Record<string, unknown> }>> = [];
  let currentChunk: Array<{ path: string; data: Record<string, unknown> }> = [];

  for (const entry of seedEntries) {
    const ref = docFromPath(entry.path);
    const existing = await getDoc(ref);
    const shouldWrite = overwrite || !existing.exists();

    if (!shouldWrite) {
      skipped += 1;
      continue;
    }

    currentChunk.push({ path: entry.path, data: entry.data });
    byCollection[entry.collection] = (byCollection[entry.collection] ?? 0) + 1;
    created += 1;

    if (currentChunk.length >= 450) {
      commitChunks.push(currentChunk);
      currentChunk = [];
    }
  }

  if (currentChunk.length > 0) {
    commitChunks.push(currentChunk);
  }

  for (const chunk of commitChunks) {
    const batch = writeBatch(db!);
    for (const item of chunk) {
      const ref = docFromPath(item.path);
      batch.set(ref, item.data, { merge: overwrite });
    }
    await batch.commit();
  }

  return {
    tenantId,
    created,
    skipped,
    byCollection,
  };
}
