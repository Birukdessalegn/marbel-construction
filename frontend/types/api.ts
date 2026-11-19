export type Role = "ADMIN" | "WAREHOUSE_MANAGER" | "STORE_KEEPER" | "VIEWER";
export type QualityStatus = "AVAILABLE" | "QUARANTINE" | "RESERVED" | "SOLD";
export type ItemType = "BLOCK" | "SLAB" | "TILE" | "CUT_TO_SIZE" | "RESIDUAL" | "CONSUMABLE";

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
