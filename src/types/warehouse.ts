export interface WarehouseItem {
  id: string;
  companyId: string;
  name: string;
  SKU: string;
  quantity: number;
  location: string;
  status: "in_stock" | "reserved" | "out_of_stock";
  createdBy: string;
  assignedTo?: string;
  createdAt: number;
  updatedAt: number;
  notes?: string;
}
