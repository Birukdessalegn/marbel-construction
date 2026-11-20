import { Prisma } from "@prisma/client";
import { AppError } from "../src/common/errors";

jest.mock("../src/config/prisma", () => ({
  prisma: { $transaction: jest.fn() }
}));

import { prisma } from "../src/config/prisma";
import { createGoodsReceipt } from "../src/modules/procurement/goods-receipts.service";

const mockedPrisma = prisma as unknown as { $transaction: jest.Mock };

function setupReceipt(receivedQuantity: number, totalReceived: number) {
  const tx = {
    purchaseOrder: {
      findUnique: jest.fn().mockResolvedValue({
        id: "po-1",
        status: "ORDERED",
        items: [{
          id: "po-item-1",
          itemId: "item-1",
          quantity: new Prisma.Decimal(5),
          receivedQuantity: new Prisma.Decimal(receivedQuantity)
        }]
      }),
      update: jest.fn().mockResolvedValue({})
    },
    location: {
      findFirst: jest.fn().mockResolvedValue({ id: "location-1" }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "location-1" })
    },
    goodsReceipt: {
      create: jest.fn().mockResolvedValue({ id: "grn-1" }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "grn-1" })
    },
    purchaseOrderItem: {
      update: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([{
        quantity: new Prisma.Decimal(5),
        receivedQuantity: new Prisma.Decimal(totalReceived)
      }])
    },
    item: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "item-1" }) },
    stockBalance: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({})
    },
    stockTransaction: { create: jest.fn().mockResolvedValue({ id: "stock-tx-1" }) },
    goodsReceiptItem: { create: jest.fn().mockResolvedValue({}) }
  };
  mockedPrisma.$transaction.mockImplementation((work: (transaction: typeof tx) => Promise<unknown>) => work(tx));
  return tx;
}

describe("goods receipt service", () => {
  beforeEach(() => jest.clearAllMocks());

  it("posts receipt quantities to inventory and marks a fully received PO", async () => {
    const tx = setupReceipt(3, 5);
    await createGoodsReceipt({
      purchaseOrderId: "po-1",
      locationId: "location-1",
      items: [{
        purchaseOrderItemId: "po-item-1",
        quantity: 2,
        areaSqm: 4.5,
        qualityStatus: "AVAILABLE"
      }]
    }, "receiver-1");

    expect(tx.stockBalance.upsert).toHaveBeenCalled();
    expect(tx.stockTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: "RECEIPT", referenceType: "GOODS_RECEIPT", referenceId: "grn-1" })
    }));
    expect(tx.purchaseOrder.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: "RECEIVED" }
    }));
    expect(mockedPrisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  });

  it("rejects over-receipt before changing inventory", async () => {
    const tx = setupReceipt(4, 4);
    await expect(createGoodsReceipt({
      purchaseOrderId: "po-1",
      locationId: "location-1",
      items: [{
        purchaseOrderItemId: "po-item-1",
        quantity: 2,
        areaSqm: 0,
        qualityStatus: "QUARANTINE"
      }]
    }, "receiver-1")).rejects.toThrow(AppError);

    expect(tx.goodsReceipt.create).not.toHaveBeenCalled();
    expect(tx.stockBalance.upsert).not.toHaveBeenCalled();
  });

  it("marks an incomplete PO as partially received", async () => {
    const tx = setupReceipt(0, 2);
    await createGoodsReceipt({
      purchaseOrderId: "po-1",
      locationId: "location-1",
      items: [{
        purchaseOrderItemId: "po-item-1",
        quantity: 2,
        areaSqm: 0,
        qualityStatus: "AVAILABLE"
      }]
    }, "receiver-1");

    expect(tx.purchaseOrder.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: "PARTIALLY_RECEIVED" }
    }));
  });
});
