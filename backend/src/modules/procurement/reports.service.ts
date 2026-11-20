import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { purchaseHistoryQuerySchema, supplierPerformanceQuerySchema } from "./procurement.schemas";

type PurchaseHistoryQuery = z.infer<typeof purchaseHistoryQuerySchema>;
type SupplierPerformanceQuery = z.infer<typeof supplierPerformanceQuerySchema>;

export async function getPurchaseHistory(query: PurchaseHistoryQuery) {
  const where: Prisma.PurchaseOrderWhereInput = {
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.itemId ? { items: { some: { itemId: query.itemId } } } : {}),
    ...(query.dateFrom || query.dateTo ? {
      orderDate: {
        ...(query.dateFrom ? { gte: query.dateFrom } : {}),
        ...(query.dateTo ? { lte: query.dateTo } : {})
      }
    } : {})
  };
  const [data, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        items: { include: { item: true } },
        goodsReceipts: { include: { items: true }, orderBy: { receivedAt: "asc" } },
        landingCosts: { include: { allocations: true } }
      },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { orderDate: "desc" }
    }),
    prisma.purchaseOrder.count({ where })
  ]);
  return { data, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function getSupplierPerformance(query: SupplierPerformanceQuery) {
  const suppliers = await prisma.supplier.findMany({
    include: {
      purchaseOrders: {
        where: {
          ...(query.dateFrom || query.dateTo ? {
            orderDate: {
              ...(query.dateFrom ? { gte: query.dateFrom } : {}),
              ...(query.dateTo ? { lte: query.dateTo } : {})
            }
          } : {}),
          status: { in: ["RECEIVED", "CLOSED"] }
        },
        select: {
          id: true,
          expectedDate: true,
          goodsReceipts: {
            select: {
              receivedAt: true,
              items: { select: { quantity: true, qualityStatus: true } }
            }
          }
        }
      }
    },
    orderBy: { name: "asc" }
  });

  return suppliers.map((supplier) => {
    let completedOrders = 0;
    let onTimeOrders = 0;
    let receivedQuantity = 0;
    let quarantinedQuantity = 0;
    for (const order of supplier.purchaseOrders) {
      completedOrders += 1;
      const lastReceipt = order.goodsReceipts.reduce<Date | null>(
        (latest, receipt) => !latest || receipt.receivedAt > latest ? receipt.receivedAt : latest,
        null
      );
      if (order.expectedDate && lastReceipt && lastReceipt <= order.expectedDate) onTimeOrders += 1;
      for (const receipt of order.goodsReceipts) {
        for (const item of receipt.items) {
          const quantity = Number(item.quantity);
          receivedQuantity += quantity;
          if (item.qualityStatus === "QUARANTINE") quarantinedQuantity += quantity;
        }
      }
    }
    const ordersWithExpectedDate = supplier.purchaseOrders.filter((order) => order.expectedDate).length;
    return {
      id: supplier.id,
      name: supplier.name,
      status: supplier.status,
      rating: supplier.rating,
      completedOrders,
      onTimeDeliveryRate: ordersWithExpectedDate ? onTimeOrders / ordersWithExpectedDate : null,
      receivedQuantity,
      quarantinedQuantity,
      acceptedQuantity: receivedQuantity - quarantinedQuantity,
      qualityAcceptanceRate: receivedQuantity ? (receivedQuantity - quarantinedQuantity) / receivedQuantity : null
    };
  });
}
