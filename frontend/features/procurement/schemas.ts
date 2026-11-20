import { z } from "zod";

const optionalEmail = z.string().trim().email("Enter a valid email address").or(z.literal(""));

export const supplierFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  contactName: z.string().trim().optional(),
  email: optionalEmail,
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  paymentTerms: z.string().trim().optional(),
  rating: z.union([z.literal(""), z.coerce.number().min(1).max(5)]),
  status: z.enum(["ACTIVE", "INACTIVE"])
});

export const purchaseOrderFormSchema = z.object({
  supplierId: z.string().min(1, "Select a supplier"),
  orderDate: z.string().min(1, "Order date is required"),
  expectedDate: z.string().optional(),
  currency: z.string().trim().length(3, "Enter a 3-letter currency code"),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().min(1, "Select an inventory item"),
    quantity: z.coerce.number().positive("Quantity must be greater than zero"),
    unitOfMeasure: z.string().trim().min(1, "Enter a unit"),
    unitPrice: z.coerce.number().nonnegative("Unit price cannot be negative")
  })).min(1, "Add at least one item")
}).superRefine((value, context) => {
  if (value.expectedDate && value.expectedDate < value.orderDate) {
    context.addIssue({ code: "custom", path: ["expectedDate"], message: "Expected delivery cannot be before the order date" });
  }
  const ids = value.items.map((item) => item.itemId).filter(Boolean);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", path: ["items"], message: "An item can appear only once per purchase order" });
  }
});

export const goodsReceiptFormSchema = z.object({
  locationId: z.string().min(1, "Select a destination location"),
  note: z.string().optional(),
  items: z.array(z.object({
    purchaseOrderItemId: z.string().min(1),
    quantity: z.coerce.number().positive("Received quantity must be greater than zero"),
    areaSqm: z.coerce.number().nonnegative("Area cannot be negative"),
    qualityStatus: z.enum(["AVAILABLE", "QUARANTINE", "RESERVED", "SOLD"]),
    note: z.string().optional()
  })).min(1, "Enter at least one received line")
});

export const purchaseInvoiceFormSchema = z.object({
  invoiceNumber: z.string().trim().min(1, "Invoice number is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().optional(),
  currency: z.string().trim().length(3, "Enter a 3-letter currency code"),
  totalAmount: z.coerce.number().positive("Invoice total must be greater than zero"),
  notes: z.string().optional()
}).superRefine((value, context) => {
  if (value.dueDate && value.dueDate < value.invoiceDate) {
    context.addIssue({ code: "custom", path: ["dueDate"], message: "Due date cannot be before invoice date" });
  }
});

export const landingCostFormSchema = z.object({
  category: z.enum(["FREIGHT", "CUSTOMS", "HANDLING", "OTHER"]),
  description: z.string().optional(),
  amount: z.coerce.number().positive("Cost must be greater than zero"),
  currency: z.string().trim().length(3, "Enter a 3-letter currency code"),
  allocationBasis: z.enum(["ITEM_VALUE", "QUANTITY", "WEIGHT", "MANUAL"]),
  allocations: z.array(z.object({
    purchaseOrderItemId: z.string(),
    amount: z.coerce.number().nonnegative()
  })).optional()
});
