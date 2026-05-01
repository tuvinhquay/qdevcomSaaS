import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/services/firebase";

export type FriendRequestStatus = "pending" | "accepted" | "rejected" | "cancelled";

function assertDb() {
  if (!db) throw new Error("Firestore is not initialized.");
}

export async function sendFriendRequest(
  tenantId: string,
  senderId: string,
  receiverPersonalId: string,
): Promise<void> {
  assertDb();
  const membersRef = collection(db!, "companies", tenantId, "members");
  const targetQuery = query(membersRef, where("personalId", "==", receiverPersonalId));
  const targetSnap = await getDocs(targetQuery);
  if (targetSnap.empty) throw new Error("Khong tim thay user voi Personal ID nay.");

  const receiverId = targetSnap.docs[0].id;
  if (receiverId === senderId) throw new Error("Khong the tu ket ban chinh minh.");

  await addDoc(collection(db!, "tenants", tenantId, "friend_requests"), {
    senderId,
    receiverId,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export async function acceptRequest(tenantId: string, requestId: string): Promise<void> {
  assertDb();
  const requestRef = doc(db!, "tenants", tenantId, "friend_requests", requestId);
  const requestSnap = await getDoc(requestRef);
  if (!requestSnap.exists()) throw new Error("Friend request not found.");

  const data = requestSnap.data() as { senderId: string; receiverId: string };
  const senderRef = doc(db!, "companies", tenantId, "members", data.senderId);
  const receiverRef = doc(db!, "companies", tenantId, "members", data.receiverId);

  await Promise.all([
    updateDoc(requestRef, { status: "accepted" }),
    updateDoc(senderRef, { friendIds: arrayUnion(data.receiverId) }),
    updateDoc(receiverRef, { friendIds: arrayUnion(data.senderId) }),
  ]);
}

export async function rejectRequest(tenantId: string, requestId: string): Promise<void> {
  assertDb();
  await updateDoc(doc(db!, "tenants", tenantId, "friend_requests", requestId), {
    status: "rejected",
  });
}

export async function cancelRequest(tenantId: string, requestId: string): Promise<void> {
  assertDb();
  await updateDoc(doc(db!, "tenants", tenantId, "friend_requests", requestId), {
    status: "cancelled",
  });
}

export async function blockUser(
  tenantId: string,
  meUserId: string,
  targetUserId: string,
): Promise<void> {
  assertDb();
  const meRef = doc(db!, "companies", tenantId, "members", meUserId);
  await updateDoc(meRef, {
    blockedUserIds: arrayUnion(targetUserId),
    friendIds: arrayRemove(targetUserId),
  });
}

export async function unblockUser(
  tenantId: string,
  meUserId: string,
  targetUserId: string,
): Promise<void> {
  assertDb();
  const meRef = doc(db!, "companies", tenantId, "members", meUserId);
  await updateDoc(meRef, {
    blockedUserIds: arrayRemove(targetUserId),
  });
}
