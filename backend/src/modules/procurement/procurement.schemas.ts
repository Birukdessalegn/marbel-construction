import { z } from "zod";

const currencySchema = z.string().trim().length(3).transform((value) => value.toUpperCase());

export const supplierCreateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  contactName: z.string().trim().max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(500).optional(),
  paymentTerms: z.string().trim().max(200).optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE")
});

export const supplierUpdateSchema = supplierCreateSchema.partial();

export const supplierListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional()
});

const purchaseOrderItemSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unitOfMeasure: z.string().trim().min(1).max(32).default("unit"),
  unitPrice: z.coerce.number().nonnegative()
});

export const purchaseOrderCreateSchema = z.object({
  supplierId: z.string().uuid(),
  orderDate: z.coerce.date().optional(),
  expectedDate: z.coerce.date().optional(),
  currency: currencySchema.default("USD"),
  notes: z.string().trim().max(2000).optional(),
  items: z.array(purchaseOrderItemSchema).min(1)
}).superRefine((value, context) => {
  if (value.expectedDate && value.orderDate && value.expectedDate < value.orderDate) {
    context.addIssue({ code: "custom", path: ["expectedDate"], message: "Expected date cannot be before order date" });
  }
  const itemIds = value.items.map((item) => item.itemId);
  if (new Set(itemIds).size !== itemIds.length) {
    context.addIssue({ code: "custom", path: ["items"], message: "Each item may appear only once per purchase order" });
  }
});

export const purchaseOrderUpdateSchema = z.object({
  supplierId: z.string().uuid().optional(),
  orderDate: z.coerce.date().optional(),
  expectedDate: z.coerce.date().nullable().optional(),
  currency: currencySchema.optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  items: z.array(purchaseOrderItemSchema).min(1).optional()
}).superRefine((value, context) => {
  if (Object.keys(value).length === 0) {
    context.addIssue({ code: "custom", message: "Provide at least one field to update" });
  }
  if (value.expectedDate && value.orderDate && value.expectedDate < value.orderDate) {
    context.addIssue({ code: "custom", path: ["expectedDate"], message: "Expected date cannot be before order date" });
  }
});

export const purchaseOrderListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  supplierId: z.string().uuid().optional(),
  status: z.enum(["DRAFT", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CLOSED", "CANCELLED"]).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  itemId: z.string().uuid().optional()
}).refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
  path: ["dateTo"],
  message: "End date cannot be before start date"
});

export const goodsReceiptCreateSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  locationId: z.string().uuid(),
  receivedAt: z.coerce.date().optional(),
  note: z.string().trim().max(2000).optional(),
  items: z.array(z.object({
    purchaseOrderItemId: z.string().uuid(),
    quantity: z.coerce.number().positive(),
    areaSqm: z.coerce.number().nonnegative().default(0),
    qualityStatus: z.enum(["AVAILABLE", "QUARANTINE", "RESERVED", "SOLD"]).default("AVAILABLE"),
    note: z.string().trim().max(500).optional()
  })).min(1)
});

export const goodsReceiptListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  purchaseOrderId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
}).refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
  path: ["dateTo"],
  message: "End date cannot be before start date"
});

export const purchaseInvoiceCreateSchema = z.object({
  supplierId: z.string().uuid(),
  purchaseOrderId: z.string().uuid().optional(),
  invoiceNumber: z.string().trim().min(1).max(100),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  currency: currencySchema.default("USD"),
  totalAmount: z.coerce.number().positive(),
  notes: z.string().trim().max(2000).optional()
}).superRefine((value, context) => {
  if (value.dueDate && value.dueDate < value.invoiceDate) {
    context.addIssue({ code: "custom", path: ["dueDate"], message: "Due date cannot be before invoice date" });
  }
});

export const purchaseInvoiceListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  supplierId: z.string().uuid().optional(),
  purchaseOrderId: z.string().uuid().optional(),
  status: z.enum(["RECORDED", "VOID"]).optional()
});

const manualAllocationSchema = z.object({
  purchaseOrderItemId: z.string().uuid(),
  amount: z.coerce.number().nonnegative()
});

export const landingCostCreateSchema = z.object({
  category: z.enum(["FREIGHT", "CUSTOMS", "HANDLING", "OTHER"]),
  description: z.string().trim().max(500).optional(),
  amount: z.coerce.number().positive(),
  currency: currencySchema.default("USD"),
  allocationBasis: z.enum(["ITEM_VALUE", "QUANTITY", "WEIGHT", "MANUAL"]),
  allocations: z.array(manualAllocationSchema).optional()
}).superRefine((value, context) => {
  if (value.allocationBasis === "MANUAL" && (!value.allocations || value.allocations.length === 0)) {
    context.addIssue({ code: "custom", path: ["allocations"], message: "Manual allocation requires line allocations" });
  }
  if (value.allocationBasis !== "MANUAL" && value.allocations) {
    context.addIssue({ code: "custom", path: ["allocations"], message: "Allocations are accepted only for manual allocation" });
  }
});

export const purchaseHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  supplierId: z.string().uuid().optional(),
  itemId: z.string().uuid().optional(),
  status: z.enum(["DRAFT", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CLOSED", "CANCELLED"]).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
}).refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
  path: ["dateTo"],
  message: "End date cannot be before start date"
});

export const supplierPerformanceQuerySchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
}).refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
  path: ["dateTo"],
  message: "End date cannot be before start date"
});
