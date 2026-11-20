import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../common/errors";
import { prisma } from "../../config/prisma";
import { purchaseInvoiceCreateSchema, purchaseInvoiceListSchema } from "./procurement.schemas";

type PurchaseInvoiceCreate = z.infer<typeof purchaseInvoiceCreateSchema>;
type PurchaseInvoiceList = z.infer<typeof purchaseInvoiceListSchema>;

export async function listPurchaseInvoices(query: PurchaseInvoiceList) {
  const where: Prisma.PurchaseInvoiceWhereInput = {
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
    ...(query.purchaseOrderId ? { purchaseOrderId: query.purchaseOrderId } : {}),
    ...(query.status ? { status: query.status } : {})
  };
  const [data, total] = await Promise.all([
    prisma.purchaseInvoice.findMany({
      where,
      include: { supplier: true, purchaseOrder: { select: { id: true, poNumber: true, currency: true } } },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { invoiceDate: "desc" }
    }),
    prisma.purchaseInvoice.count({ where })
  ]);
  return { data, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function getPurchaseInvoice(id: string) {
  const invoice = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: { supplier: true, purchaseOrder: true }
  });
  if (!invoice) throw new AppError(404, "NOT_FOUND", "Purchase invoice was not found");
  return invoice;
}

export async function createPurchaseInvoice(data: PurchaseInvoiceCreate) {
  const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
  if (!supplier) throw new AppError(404, "SUPPLIER_NOT_FOUND", "Supplier was not found");
  if (data.purchaseOrderId) {
    const order = await prisma.purchaseOrder.findUnique({ where: { id: data.purchaseOrderId } });
    if (!order) throw new AppError(404, "PURCHASE_ORDER_NOT_FOUND", "Purchase order was not found");
    if (order.supplierId !== supplier.id) throw new AppError(400, "SUPPLIER_MISMATCH", "Invoice supplier must match purchase order supplier");
    if (order.status === "CANCELLED") throw new AppError(409, "INVALID_STATUS", "An invoice cannot be linked to a cancelled purchase order");
    if (order.currency !== data.currency) throw new AppError(400, "CURRENCY_MISMATCH", "Invoice and purchase order currencies must match");
  }
  try {
    return await prisma.purchaseInvoice.create({
      data: { ...data, totalAmount: new Prisma.Decimal(data.totalAmount) },
      include: { supplier: true, purchaseOrder: true }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "DUPLICATE_INVOICE", "This supplier invoice number is already recorded");
    }
    throw error;
  }
}

export async function voidPurchaseInvoice(id: string) {
  const result = await prisma.purchaseInvoice.updateMany({
    where: { id, status: "RECORDED" },
    data: { status: "VOID" }
  });
  if (result.count !== 1) {
    const invoice = await prisma.purchaseInvoice.findUnique({ where: { id }, select: { id: true } });
    if (!invoice) throw new AppError(404, "NOT_FOUND", "Purchase invoice was not found");
    throw new AppError(409, "INVALID_STATUS", "Only recorded invoices can be voided");
  }
  return getPurchaseInvoice(id);
}
