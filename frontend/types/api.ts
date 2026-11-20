export type Role = "ADMIN" | "PURCHASE_MANAGER" | "WAREHOUSE_MANAGER" | "STORE_KEEPER" | "VIEWER";
export type QualityStatus = "AVAILABLE" | "QUARANTINE" | "RESERVED" | "SOLD";
export type ItemType = "BLOCK" | "SLAB" | "TILE" | "CUT_TO_SIZE" | "RESIDUAL" | "CONSUMABLE";
export type SupplierStatus = "ACTIVE" | "INACTIVE";
export type PurchaseOrderStatus = "DRAFT" | "ORDERED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CLOSED" | "CANCELLED";
export type PurchaseInvoiceStatus = "RECORDED" | "VOID";
export type LandingCostCategory = "FREIGHT" | "CUSTOMS" | "HANDLING" | "OTHER";
export type LandingCostAllocationBasis = "ITEM_VALUE" | "QUANTITY" | "WEIGHT" | "MANUAL";
export type DecimalValue = number | string;

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address?: string;
  isActive: boolean;
  locations?: Location[];
}

export interface Location {
  id: string;
  warehouseId: string;
  code: string;
  name?: string;
  status: "ACTIVE" | "INACTIVE";
  warehouse?: Warehouse;
}

export interface ItemPhoto {
  id: string;
  itemId: string;
  url: string;
  caption?: string;
  sortOrder: number;
}

export interface StockBalance {
  id: string;
  itemId: string;
  locationId: string;
  qualityStatus: QualityStatus;
  quantity: number | string;
  areaSqm: number | string;
  item?: Item;
  location?: Location & { warehouse?: Warehouse };
}

export interface Item {
  id: string;
  sku: string;
  name: string;
  type: ItemType;
  uniqueBlockId?: string;
  uniqueSlabId?: string;
  quarryOrigin?: string;
  color?: string;
  veinPattern?: string;
  qualityGrade?: string;
  finish?: string;
  thicknessMm?: number | string;
  lengthMm?: number | string;
  widthMm?: number | string;
  weightKg?: number | string;
  areaSqm?: number | string;
  recoveryPercent?: number | string;
  qualityStatus: QualityStatus;
  parentId?: string;
  parent?: Item;
  children?: Item[];
  photos?: ItemPhoto[];
  balances?: StockBalance[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockTransaction {
  id: string;
  transactionNo: string;
  type: "RECEIPT" | "ISSUE" | "TRANSFER" | "ADJUSTMENT" | "STOCK_COUNT";
  itemId: string;
  qualityStatus: QualityStatus;
  quantity: number | string;
  areaSqm: number | string;
  referenceType?: string;
  referenceId?: string;
  note?: string;
  createdAt: string;
  item?: Item;
  fromLocation?: Location;
  toLocation?: Location;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  paymentTerms?: string | null;
  rating?: DecimalValue | null;
  status: SupplierStatus;
  createdAt: string;
  updatedAt: string;
  _count?: { purchaseOrders: number; invoices: number };
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  itemId: string;
  quantity: DecimalValue;
  unitOfMeasure: string;
  unitPrice: DecimalValue;
  receivedQuantity: DecimalValue;
  item?: Item;
  allocatedLandingCost?: DecimalValue;
  landedUnitCost?: DecimalValue;
  landingCostAllocations?: LandingCostAllocation[];
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  orderDate: string;
  expectedDate?: string | null;
  status: PurchaseOrderStatus;
  currency: string;
  totalAmount: DecimalValue;
  notes?: string | null;
  createdById: string;
  approvedById?: string | null;
  approvedAt?: string | null;
  supplier?: Supplier;
  items: PurchaseOrderItem[];
  goodsReceipts?: GoodsReceipt[];
  invoices?: PurchaseInvoice[];
  landingCosts?: LandingCost[];
  createdAt: string;
  updatedAt: string;
}

export interface GoodsReceiptItem {
  id: string;
  goodsReceiptId: string;
  purchaseOrderItemId: string;
  stockTransactionId: string;
  quantity: DecimalValue;
  areaSqm: DecimalValue;
  qualityStatus: QualityStatus;
  note?: string | null;
  purchaseOrderItem?: PurchaseOrderItem;
  stockTransaction?: StockTransaction;
}

export interface GoodsReceipt {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  locationId: string;
  receivedById: string;
  receivedAt: string;
  note?: string | null;
  purchaseOrder?: Pick<PurchaseOrder, "id" | "poNumber" | "supplierId"> & { supplier?: Supplier };
  location?: Location;
  receivedBy?: { id: string; name: string; email?: string };
  items: GoodsReceiptItem[];
}

export interface PurchaseInvoice {
  id: string;
  supplierId: string;
  purchaseOrderId?: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  currency: string;
  totalAmount: DecimalValue;
  status: PurchaseInvoiceStatus;
  notes?: string | null;
  supplier?: Supplier;
  purchaseOrder?: Pick<PurchaseOrder, "id" | "poNumber"> & Partial<Pick<PurchaseOrder, "currency">>;
}

export interface LandingCostAllocation {
  id: string;
  landingCostId: string;
  purchaseOrderItemId: string;
  amount: DecimalValue;
  purchaseOrderItem?: PurchaseOrderItem;
}

export interface LandingCost {
  id: string;
  purchaseOrderId: string;
  category: LandingCostCategory;
  description?: string | null;
  amount: DecimalValue;
  currency: string;
  allocationBasis: LandingCostAllocationBasis;
  allocations: LandingCostAllocation[];
  createdAt: string;
}

export interface SupplierPerformance {
  id: string;
  name: string;
  status: SupplierStatus;
  rating?: DecimalValue | null;
  completedOrders: number;
  onTimeDeliveryRate: number | null;
  receivedQuantity: number;
  quarantinedQuantity: number;
  acceptedQuantity: number;
  qualityAcceptanceRate: number | null;
}
