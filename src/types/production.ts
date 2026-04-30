export type ProductionStatus =
  | "planned"
  | "in_progress"
  | "paused"
  | "completed"
  | "cancelled";

export interface ProductionOrder {
  id: string;
  companyId: string;

  workOrderId?: string;
  title: string;
  description?: string;

  quantity: number;
  producedQuantity: number;

  status: ProductionStatus;

  assignedTo?: string;
  createdBy: string;

  startDate?: number;
  dueDate?: number;

  createdAt: number;
  updatedAt: number;
}
