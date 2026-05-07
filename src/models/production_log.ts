export interface ProductionLog {
  id?: string;

  tenantId: string;
  workOrderId: string;
  orderId: string;

  workerId: string;
  workerName: string;
  department: string;

  quantity: number;
  note?: string;

  createdAt: unknown;
}
