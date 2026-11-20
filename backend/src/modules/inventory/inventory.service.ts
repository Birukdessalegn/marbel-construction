import { randomUUID } from "node:crypto";
import { Prisma, QualityStatus } from "@prisma/client";
import { AppError } from "../../common/errors";

export async function setBalance(
  tx: Prisma.TransactionClient,
  itemId: string,
  locationId: string,
  qualityStatus: QualityStatus,
  quantityDelta: number,
  areaDelta: number
) {
  const existing = await tx.stockBalance.findUnique({
    where: { itemId_locationId_qualityStatus: { itemId, locationId, qualityStatus } }
  });
  const quantity = new Prisma.Decimal(existing ? existing.quantity : 0).plus(quantityDelta);
  const areaSqm = new Prisma.Decimal(existing ? existing.areaSqm : 0).plus(areaDelta);
  if (quantity.isNegative() || areaSqm.isNegative()) {
    throw new AppError(409, "INSUFFICIENT_STOCK", "Operation would create negative stock");
  }
  return tx.stockBalance.upsert({
    where: { itemId_locationId_qualityStatus: { itemId, locationId, qualityStatus } },
    create: { itemId, locationId, qualityStatus, quantity, areaSqm },
    update: { quantity, areaSqm }
  });
}

export function nextTransactionNo(type: string) {
  const prefix = type.slice(0, 3).toUpperCase();
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${prefix}-${date}-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

export async function recordStockReceipt(
  tx: Prisma.TransactionClient,
  input: {
    itemId: string;
    locationId: string;
    quantity: number;
    areaSqm: number;
    qualityStatus: QualityStatus;
    actorId: string;
    referenceType?: string;
    referenceId?: string;
    note?: string;
  }
) {
  await tx.item.findUniqueOrThrow({ where: { id: input.itemId } });
  await tx.location.findUniqueOrThrow({ where: { id: input.locationId } });
  await setBalance(tx, input.itemId, input.locationId, input.qualityStatus, input.quantity, input.areaSqm);
  return tx.stockTransaction.create({
    data: {
      transactionNo: nextTransactionNo("RECEIPT"),
      type: "RECEIPT",
      itemId: input.itemId,
      toLocationId: input.locationId,
      qualityStatus: input.qualityStatus,
      quantity: input.quantity,
      areaSqm: input.areaSqm,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      note: input.note,
      actorId: input.actorId
    }
  });
}
