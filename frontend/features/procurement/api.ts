import { api } from "@/lib/api";
import type {
  GoodsReceipt,
  LandingCost,
  Pagination,
  PurchaseInvoice,
  PurchaseOrder,
  PurchaseOrderStatus,
  Supplier,
  SupplierPerformance
} from "@/types/api";

export interface PageResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface SupplierInput {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
  rating?: number;
  status?: "ACTIVE" | "INACTIVE";
}

export interface PurchaseOrderLineInput {
  itemId: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
}

export interface PurchaseOrderInput {
  supplierId: string;
  orderDate?: string;
  expectedDate?: string;
  currency: string;
  notes?: string;
  items: PurchaseOrderLineInput[];
}

export interface GoodsReceiptInput {
  purchaseOrderId: string;
  locationId: string;
  receivedAt?: string;
  note?: string;
  items: Array<{
    purchaseOrderItemId: string;
    quantity: number;
    areaSqm: number;
    qualityStatus: "AVAILABLE" | "QUARANTINE" | "RESERVED" | "SOLD";
    note?: string;
  }>;
}

export interface PurchaseInvoiceInput {
  supplierId: string;
  purchaseOrderId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  currency: string;
  totalAmount: number;
  notes?: string;
}

export interface LandingCostInput {
  category: "FREIGHT" | "CUSTOMS" | "HANDLING" | "OTHER";
  description?: string;
  amount: number;
  currency: string;
  allocationBasis: "ITEM_VALUE" | "QUANTITY" | "WEIGHT" | "MANUAL";
  allocations?: Array<{ purchaseOrderItemId: string; amount: number }>;
}

type ListParams = Record<string, string | number | undefined>;

function normalizeDateParams(params: ListParams) {
  const dateTo = params.dateTo;
  return {
    ...params,
    ...(typeof dateTo === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)
      ? { dateTo: `${dateTo}T23:59:59.999Z` }
      : {})
  };
}

export async function fetchSuppliers(params: ListParams = {}) {
  const { data } = await api.get<PageResponse<Supplier>>("/suppliers", { params });
  return data;
}

export async function fetchSupplier(id: string) {
  const { data } = await api.get<Supplier>(`/suppliers/${id}`);
  return data;
}

export async function createSupplier(payload: SupplierInput) {
  const { data } = await api.post<Supplier>("/suppliers", payload);
  return data;
}

export async function updateSupplier(id: string, payload: Partial<SupplierInput>) {
  const { data } = await api.patch<Supplier>(`/suppliers/${id}`, payload);
  return data;
}

export async function deactivateSupplier(id: string) {
  await api.delete(`/suppliers/${id}`);
}

export async function fetchPurchaseOrders(params: ListParams = {}) {
  const { data } = await api.get<PageResponse<PurchaseOrder>>("/purchase-orders", { params: normalizeDateParams(params) });
  return data;
}

export async function fetchPurchaseOrder(id: string) {
  const { data } = await api.get<PurchaseOrder>(`/purchase-orders/${id}`);
  return data;
}

export async function createPurchaseOrder(payload: PurchaseOrderInput) {
  const { data } = await api.post<PurchaseOrder>("/purchase-orders", payload);
  return data;
}

export async function updatePurchaseOrder(id: string, payload: Partial<PurchaseOrderInput>) {
  const { data } = await api.patch<PurchaseOrder>(`/purchase-orders/${id}`, payload);
  return data;
}

export async function approvePurchaseOrder(id: string) {
  const { data } = await api.post<PurchaseOrder>(`/purchase-orders/${id}/approve`);
  return data;
}

export async function cancelPurchaseOrder(id: string) {
  const { data } = await api.post<PurchaseOrder>(`/purchase-orders/${id}/cancel`);
  return data;
}

export async function closePurchaseOrder(id: string) {
  const { data } = await api.post<PurchaseOrder>(`/purchase-orders/${id}/close`);
  return data;
}

export async function fetchGoodsReceipts(params: ListParams = {}) {
  const { data } = await api.get<PageResponse<GoodsReceipt>>("/goods-receipts", { params: normalizeDateParams(params) });
  return data;
}

export async function fetchGoodsReceipt(id: string) {
  const { data } = await api.get<GoodsReceipt>(`/goods-receipts/${id}`);
  return data;
}

export async function createGoodsReceipt(payload: GoodsReceiptInput) {
  const { data } = await api.post<GoodsReceipt>("/goods-receipts", payload);
  return data;
}

export async function fetchPurchaseInvoices(params: ListParams = {}) {
  const { data } = await api.get<PageResponse<PurchaseInvoice>>("/purchase-invoices", { params });
  return data;
}

export async function createPurchaseInvoice(payload: PurchaseInvoiceInput) {
  const { data } = await api.post<PurchaseInvoice>("/purchase-invoices", payload);
  return data;
}

export async function voidPurchaseInvoice(id: string) {
  const { data } = await api.post<PurchaseInvoice>(`/purchase-invoices/${id}/void`);
  return data;
}

export async function fetchLandingCosts(purchaseOrderId: string) {
  const { data } = await api.get<LandingCost[]>(`/purchase-orders/${purchaseOrderId}/landing-costs`);
  return data;
}

export async function createLandingCost(purchaseOrderId: string, payload: LandingCostInput) {
  const { data } = await api.post<LandingCost>(`/purchase-orders/${purchaseOrderId}/landing-costs`, payload);
  return data;
}

export async function fetchPurchaseHistory(params: ListParams = {}) {
  const { data } = await api.get<PageResponse<PurchaseOrder>>("/reports/purchase-history", { params: normalizeDateParams(params) });
  return data;
}

export async function fetchSupplierPerformance(params: ListParams = {}) {
  const { data } = await api.get<SupplierPerformance[]>("/reports/supplier-performance", { params: normalizeDateParams(params) });
  return data;
}

export async function fetchOpenPurchaseOrders() {
  const statuses: PurchaseOrderStatus[] = ["ORDERED", "PARTIALLY_RECEIVED"];
  const firstPages = await Promise.all(statuses.map((status) => fetchPurchaseOrders({ status, page: 1, limit: 100 })));
  const results = await Promise.all(firstPages.map(async (firstPage, index) => {
    const status = statuses[index];
    const nextPages = await Promise.all(Array.from(
      { length: Math.max(0, firstPage.pagination.totalPages - 1) },
      (_, pageIndex) => fetchPurchaseOrders({ status, page: pageIndex + 2, limit: 100 })
    ));
    return [firstPage, ...nextPages].flatMap((page) => page.data);
  }));
  return results.flat().sort((a, b) => Date.parse(b.orderDate) - Date.parse(a.orderDate));
}
