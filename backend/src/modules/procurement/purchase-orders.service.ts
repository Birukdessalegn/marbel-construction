import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../common/errors";
import { prisma } from "../../config/prisma";
import {
  purchaseOrderCreateSchema,
  purchaseOrderListSchema,
  purchaseOrderUpdateSchema
} from "./procurement.schemas";

type PurchaseOrderCreate = z.infer<typeof purchaseOrderCreateSchema>;
type PurchaseOrderUpdate = z.infer<typeof purchaseOrderUpdateSchema>;
type PurchaseOrderList = z.infer<typeof purchaseOrderListSchema>;

const orderDetails = {
  supplier: true,
  createdBy: { select: { id: true, name: true, email: true } },
  approvedBy: { select: { id: true, name: true, email: true } },
  items: {
    include: {
      item: true,
      landingCostAllocations: { include: { landingCost: true } }
    }
  },
  goodsReceipts: {
    include: {
      location: { include: { warehouse: true } },
      receivedBy: { select: { id: true, name: true } },
      items: { include: { purchaseOrderItem: { include: { item: true } }, stockTransaction: true } }
    },
    orderBy: { receivedAt: "desc" as const }
  },
  invoices: true,
  landingCosts: { include: { allocations: true } }
};

function documentNumber(prefix: string) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${prefix}-${date}-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

function totalForItems(items: PurchaseOrderCreate["items"]) {
  return items.reduce(
    (total, line) => total.plus(new Prisma.Decimal(line.quantity).mul(line.unitPrice)),
    new Prisma.Decimal(0)
  ).toDecimalPlaces(2);
}

async function assertSupplierAndItems(
  tx: Prisma.TransactionClient,
  supplierId: string,
  itemIds: string[]
) {
  const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier || supplier.status !== "ACTIVE") throw new AppError(404, "SUPPLIER_NOT_FOUND", "Active supplier was not found");
  const items = await tx.item.findMany({ where: { id: { in: itemIds }, isActive: true }, select: { id: true } });
  if (items.length !== new Set(itemIds).size) throw new AppError(400, "INVALID_ITEMS", "One or more active inventory items were not found");
}

export async function listPurchaseOrders(query: PurchaseOrderList) {
  const where: Prisma.PurchaseOrderWhereInput = {
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.dateFrom || query.dateTo ? {
      orderDate: {
        ...(query.dateFrom ? { gte: query.dateFrom } : {}),
        ...(query.dateTo ? { lte: query.dateTo } : {})
      }
    } : {}),
    ...(query.itemId ? { items: { some: { itemId: query.itemId } } } : {})
  };
  const [data, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: { supplier: true, items: { include: { item: true } } },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { orderDate: "desc" }
    }),
    prisma.purchaseOrder.count({ where })
  ]);
  return { data, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function getPurchaseOrder(id: string) {
  const order = await prisma.purchaseOrder.findUnique({ where: { id }, include: orderDetails });
  if (!order) throw new AppError(404, "NOT_FOUND", "Purchase order was not found");
  return {
    ...order,
    items: order.items.map((line) => {
      const allocatedLandingCost = line.landingCostAllocations.reduce(
        (total, allocation) => total.plus(allocation.amount),
        new Prisma.Decimal(0)
      );
      return {
        ...line,
        allocatedLandingCost,
        landedUnitCost: new Prisma.Decimal(line.unitPrice).plus(allocatedLandingCost.div(line.quantity))
      };
    })
  };
}

export async function createPurchaseOrder(data: PurchaseOrderCreate, createdById: string) {
  return prisma.$transaction(async (tx) => {
    await assertSupplierAndItems(tx, data.supplierId, data.items.map((line) => line.itemId));
    return tx.purchaseOrder.create({
      data: {
        poNumber: documentNumber("PO"),
        supplierId: data.supplierId,
        orderDate: data.orderDate,
        expectedDate: data.expectedDate,
        currency: data.currency,
        notes: data.notes,
        totalAmount: totalForItems(data.items),
        createdById,
        items: {
          create: data.items.map((line) => ({
            itemId: line.itemId,
            quantity: line.quantity,
            unitOfMeasure: line.unitOfMeasure,
            unitPrice: line.unitPrice
          }))
        }
      },
      include: { supplier: true, items: { include: { item: true } } }
    });
  });
}

export async function updateDraftPurchaseOrder(id: string, data: PurchaseOrderUpdate) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new AppError(404, "NOT_FOUND", "Purchase order was not found");
    if (order.status !== "DRAFT") throw new AppError(409, "INVALID_STATUS", "Only draft purchase orders can be edited");

    const supplierId = data.supplierId ?? order.supplierId;
    if (data.supplierId || data.items) {
      await assertSupplierAndItems(tx, supplierId, (data.items ?? order.items).map((line) => line.itemId));
    }
    const items = data.items;
    return tx.purchaseOrder.update({
      where: { id },
      data: {
        ...(data.supplierId ? { supplierId: data.supplierId } : {}),
        ...(data.orderDate ? { orderDate: data.orderDate } : {}),
        ...(data.expectedDate !== undefined ? { expectedDate: data.expectedDate } : {}),
        ...(data.currency ? { currency: data.currency } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(items ? {
          totalAmount: totalForItems(items),
          items: {
            deleteMany: {},
            create: items.map((line) => ({
              itemId: line.itemId,
              quantity: line.quantity,
              unitOfMeasure: line.unitOfMeasure,
              unitPrice: line.unitPrice
            }))
          }
        } : {})
      },
      include: { supplier: true, items: { include: { item: true } } }
    });
  });
}

export async function approvePurchaseOrder(id: string, approvedById: string) {
  const order = await prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true, supplier: true } });
  if (!order) throw new AppError(404, "NOT_FOUND", "Purchase order was not found");
  if (order.status !== "DRAFT") throw new AppError(409, "INVALID_STATUS", "Only draft purchase orders can be approved");
  if (!order.items.length) throw new AppError(409, "EMPTY_ORDER", "A purchase order must contain at least one line");
  if (order.supplier.status !== "ACTIVE") throw new AppError(409, "SUPPLIER_INACTIVE", "An inactive supplier cannot be ordered from");
  const result = await prisma.purchaseOrder.updateMany({
    where: { id, status: "DRAFT" },
    data: { status: "ORDERED", approvedById, approvedAt: new Date() }
  });
  if (result.count !== 1) throw new AppError(409, "INVALID_STATUS", "Purchase order status changed; reload and try again");
  return getPurchaseOrder(id);
}

export async function cancelPurchaseOrder(id: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new AppError(404, "NOT_FOUND", "Purchase order was not found");
    if (!["DRAFT", "ORDERED"].includes(order.status)) {
      throw new AppError(409, "INVALID_STATUS", "Only draft or ordered purchase orders can be cancelled");
    }
    if (order.items.some((line) => !new Prisma.Decimal(line.receivedQuantity).isZero())) {
      throw new AppError(409, "GOODS_ALREADY_RECEIVED", "A purchase order with received goods cannot be cancelled");
    }
    const result = await tx.purchaseOrder.updateMany({
      where: { id, status: order.status },
      data: { status: "CANCELLED" }
    });
    if (result.count !== 1) throw new AppError(409, "INVALID_STATUS", "Purchase order status changed; reload and try again");
    return tx.purchaseOrder.findUniqueOrThrow({ where: { id }, include: orderDetails });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function closePurchaseOrder(id: string) {
  const result = await prisma.purchaseOrder.updateMany({
    where: { id, status: "RECEIVED" },
    data: { status: "CLOSED" }
  });
  if (result.count !== 1) {
    const order = await prisma.purchaseOrder.findUnique({ where: { id }, select: { id: true } });
    if (!order) throw new AppError(404, "NOT_FOUND", "Purchase order was not found");
    throw new AppError(409, "INVALID_STATUS", "Only fully received purchase orders can be closed");
  }
  return getPurchaseOrder(id);
}
