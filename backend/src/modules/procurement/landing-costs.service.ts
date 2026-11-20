import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../common/errors";
import { prisma } from "../../config/prisma";
import { landingCostCreateSchema } from "./procurement.schemas";

type LandingCostCreate = z.infer<typeof landingCostCreateSchema>;

export function distributeAmount(amount: Prisma.Decimal, weights: Array<{ purchaseOrderItemId: string; weight: Prisma.Decimal }>) {
  const totalWeight = weights.reduce((sum, entry) => sum.plus(entry.weight), new Prisma.Decimal(0));
  if (totalWeight.isZero() || totalWeight.isNegative()) {
    throw new AppError(400, "INVALID_ALLOCATION", "The selected allocation basis has no usable values");
  }
  let allocated = new Prisma.Decimal(0);
  return weights.map((entry, index) => {
    const allocation = index === weights.length - 1
      ? amount.minus(allocated)
      : amount.mul(entry.weight).div(totalWeight).toDecimalPlaces(2);
    allocated = allocated.plus(allocation);
    return { purchaseOrderItemId: entry.purchaseOrderItemId, amount: allocation };
  });
}

export async function listLandingCosts(purchaseOrderId: string) {
  const order = await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId }, select: { id: true } });
  if (!order) throw new AppError(404, "NOT_FOUND", "Purchase order was not found");
  return prisma.landingCost.findMany({
    where: { purchaseOrderId },
    include: {
      allocations: { include: { purchaseOrderItem: { include: { item: true } } } }
    },
    orderBy: { createdAt: "asc" }
  });
}

export async function createLandingCost(purchaseOrderId: string, data: LandingCostCreate) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { items: { include: { item: true } } }
    });
    if (!order) throw new AppError(404, "NOT_FOUND", "Purchase order was not found");
    if (order.status === "CANCELLED") throw new AppError(409, "INVALID_STATUS", "Landing costs cannot be recorded on a cancelled order");
    if (order.currency !== data.currency) throw new AppError(400, "CURRENCY_MISMATCH", "Landing cost and purchase order currencies must match");
    if (!order.items.length) throw new AppError(409, "EMPTY_ORDER", "Landing costs require purchase order lines");

    const amount = new Prisma.Decimal(data.amount).toDecimalPlaces(2);
    let allocations: Array<{ purchaseOrderItemId: string; amount: Prisma.Decimal }>;
    if (data.allocationBasis === "MANUAL") {
      const submitted = data.allocations ?? [];
      const validIds = new Set(order.items.map((line) => line.id));
      if (submitted.some((entry) => !validIds.has(entry.purchaseOrderItemId))) {
        throw new AppError(400, "INVALID_ALLOCATION", "Every manual allocation must reference a line on this purchase order");
      }
      if (new Set(submitted.map((entry) => entry.purchaseOrderItemId)).size !== submitted.length) {
        throw new AppError(400, "INVALID_ALLOCATION", "A purchase order line may be allocated only once per landing cost");
      }
      allocations = submitted.map((entry) => ({
        purchaseOrderItemId: entry.purchaseOrderItemId,
        amount: new Prisma.Decimal(entry.amount).toDecimalPlaces(2)
      }));
      const allocatedTotal = allocations.reduce((sum, entry) => sum.plus(entry.amount), new Prisma.Decimal(0));
      if (!allocatedTotal.equals(amount)) throw new AppError(400, "INVALID_ALLOCATION", "Manual allocations must equal the landing cost amount");
    } else {
      const weights = order.items.map((line) => {
        let weight: Prisma.Decimal;
        if (data.allocationBasis === "ITEM_VALUE") {
          weight = new Prisma.Decimal(line.unitPrice).mul(line.quantity);
        } else if (data.allocationBasis === "QUANTITY") {
          weight = new Prisma.Decimal(line.quantity);
        } else {
          if (!line.item.weightKg || new Prisma.Decimal(line.item.weightKg).lessThanOrEqualTo(0)) {
            throw new AppError(400, "MISSING_ITEM_WEIGHT", "Weight allocation requires a positive weight for every ordered item");
          }
          weight = new Prisma.Decimal(line.item.weightKg).mul(line.quantity);
        }
        return { purchaseOrderItemId: line.id, weight };
      });
      allocations = distributeAmount(amount, weights);
    }

    return tx.landingCost.create({
      data: {
        purchaseOrderId,
        category: data.category,
        description: data.description,
        amount,
        currency: data.currency,
        allocationBasis: data.allocationBasis,
        allocations: { create: allocations }
      },
      include: {
        allocations: { include: { purchaseOrderItem: { include: { item: true } } } }
      }
    });
  });
}
