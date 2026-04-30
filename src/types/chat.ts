export interface ChatMessage {
  id: string;
  companyId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  createdAt: number;
  updatedAt?: number;
  channel?: string;
}
