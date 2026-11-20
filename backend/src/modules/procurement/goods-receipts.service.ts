import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../common/errors";
import { prisma } from "../../config/prisma";
import { recordStockReceipt } from "../inventory/inventory.service";
import { goodsReceiptCreateSchema, goodsReceiptListSchema } from "./procurement.schemas";

type GoodsReceiptCreate = z.infer<typeof goodsReceiptCreateSchema>;
type GoodsReceiptList = z.infer<typeof goodsReceiptListSchema>;

function grnNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `GRN-${date}-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

const receiptDetails = {
  purchaseOrder: { include: { supplier: true } },
  location: { include: { warehouse: true } },
  receivedBy: { select: { id: true, name: true, email: true } },
  items: {
    include: {
      purchaseOrderItem: { include: { item: true } },
      stockTransaction: true
    }
  }
};

export async function listGoodsReceipts(query: GoodsReceiptList) {
  const where: Prisma.GoodsReceiptWhereInput = {
    ...(query.purchaseOrderId ? { purchaseOrderId: query.purchaseOrderId } : {}),
    ...(query.locationId ? { locationId: query.locationId } : {}),
    ...(query.dateFrom || query.dateTo ? {
      receivedAt: {
        ...(query.dateFrom ? { gte: query.dateFrom } : {}),
        ...(query.dateTo ? { lte: query.dateTo } : {})
      }
    } : {})
  };
  const [data, total] = await Promise.all([
    prisma.goodsReceipt.findMany({
      where,
      include: receiptDetails,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { receivedAt: "desc" }
    }),
    prisma.goodsReceipt.count({ where })
  ]);
  return { data, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function getGoodsReceipt(id: string) {
  const receipt = await prisma.goodsReceipt.findUnique({ where: { id }, include: receiptDetails });
  if (!receipt) throw new AppError(404, "NOT_FOUND", "Goods receipt was not found");
  return receipt;
}

export async function createGoodsReceipt(data: GoodsReceiptCreate, receivedById: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({
        where: { id: data.purchaseOrderId },
        include: { items: true }
      });
      if (!order) throw new AppError(404, "NOT_FOUND", "Purchase order was not found");
      if (!["ORDERED", "PARTIALLY_RECEIVED"].includes(order.status)) {
        throw new AppError(409, "INVALID_STATUS", "Goods can be received only against an ordered purchase order");
      }

      const location = await tx.location.findFirst({
        where: { id: data.locationId, status: "ACTIVE", warehouse: { isActive: true } }
      });
      if (!location) throw new AppError(404, "LOCATION_NOT_FOUND", "Active inventory location was not found");

      const orderItems = new Map(order.items.map((line) => [line.id, line]));
      const quantities = new Map<string, Prisma.Decimal>();
      for (const line of data.items) {
        const orderItem = orderItems.get(line.purchaseOrderItemId);
        if (!orderItem) throw new AppError(400, "INVALID_ORDER_ITEM", "A receipt line does not belong to this purchase order");
        const total = (quantities.get(line.purchaseOrderItemId) ?? new Prisma.Decimal(0)).plus(line.quantity);
        const remaining = new Prisma.Decimal(orderItem.quantity).minus(orderItem.receivedQuantity);
        if (total.greaterThan(remaining)) {
          throw new AppError(409, "OVER_RECEIPT", `Receipt quantity exceeds the remaining amount for ${orderItem.itemId}`);
        }
        quantities.set(line.purchaseOrderItemId, total);
      }

      const receipt = await tx.goodsReceipt.create({
        data: {
          grnNumber: grnNumber(),
          purchaseOrderId: order.id,
          locationId: location.id,
          receivedById,
          receivedAt: data.receivedAt,
          note: data.note
        }
      });

      for (const [purchaseOrderItemId, quantity] of quantities) {
        await tx.purchaseOrderItem.update({
          where: { id: purchaseOrderItemId },
          data: { receivedQuantity: { increment: quantity } }
        });
      }

      for (const line of data.items) {
        const orderItem = orderItems.get(line.purchaseOrderItemId)!;
        const transaction = await recordStockReceipt(tx, {
          itemId: orderItem.itemId,
          locationId: location.id,
          quantity: line.quantity,
          areaSqm: line.areaSqm,
          qualityStatus: line.qualityStatus,
          actorId: receivedById,
          referenceType: "GOODS_RECEIPT",
          referenceId: receipt.id,
          note: line.note ?? data.note
        });
        await tx.goodsReceiptItem.create({
          data: {
            goodsReceiptId: receipt.id,
            purchaseOrderItemId: orderItem.id,
            stockTransactionId: transaction.id,
            quantity: line.quantity,
            areaSqm: line.areaSqm,
            qualityStatus: line.qualityStatus,
            note: line.note
          }
        });
      }

      const updatedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: order.id } });
      const allReceived = updatedItems.every((line) => new Prisma.Decimal(line.receivedQuantity).greaterThanOrEqualTo(line.quantity));
      const nextStatus = allReceived ? "RECEIVED" : "PARTIALLY_RECEIVED";
      await tx.purchaseOrder.update({ where: { id: order.id }, data: { status: nextStatus } });
      return tx.goodsReceipt.findUniqueOrThrow({ where: { id: receipt.id }, include: receiptDetails });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new AppError(409, "CONCURRENT_RECEIPT", "The purchase order changed during receipt; reload it and retry");
    }
    throw error;
  }
}
