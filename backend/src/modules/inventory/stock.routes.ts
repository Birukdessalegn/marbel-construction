import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { authenticate, authorize, validateBody, validateQuery } from "../../common/middleware";
import { AppError } from "../../common/errors";

export const stockRoutes = Router();
stockRoutes.use(authenticate);

const statusSchema = z.enum(["AVAILABLE", "QUARANTINE", "RESERVED", "SOLD"]);
const movementSchema = z.object({
  itemId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  fromLocationId: z.string().uuid().optional(),
  toLocationId: z.string().uuid().optional(),
  quantity: z.coerce.number().positive(),
  areaSqm: z.coerce.number().nonnegative().default(0),
  qualityStatus: statusSchema.default("AVAILABLE"),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  note: z.string().optional()
});

const adjustSchema = movementSchema.extend({ quantity: z.coerce.number(), note: z.string().min(3) });

async function setBalance(
  tx: Prisma.TransactionClient,
  itemId: string,
  locationId: string,
  qualityStatus: z.infer<typeof statusSchema>,
  quantityDelta: number,
  areaDelta: number
) {
  const existing = await tx.stockBalance.findUnique({
    where: { itemId_locationId_qualityStatus: { itemId, locationId, qualityStatus } }
  });
  const quantity = new Prisma.Decimal(existing ? existing.quantity : 0).plus(quantityDelta);
  const areaSqm = new Prisma.Decimal(existing ? existing.areaSqm : 0).plus(areaDelta);
  if (quantity.isNegative() || areaSqm.isNegative()) throw new AppError(409, "INSUFFICIENT_STOCK", "Operation would create negative stock");
  return tx.stockBalance.upsert({
    where: { itemId_locationId_qualityStatus: { itemId, locationId, qualityStatus } },
    create: { itemId, locationId, qualityStatus, quantity, areaSqm },
    update: { quantity, areaSqm }
  });
}

async function nextTransactionNo(tx: Prisma.TransactionClient, type: string) {
  const prefix = type.slice(0, 3).toUpperCase();
  const count = await tx.stockTransaction.count();
  return `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(count + 1).padStart(6, "0")}`;
}

stockRoutes.post("/receive", authorize("ADMIN", "WAREHOUSE_MANAGER", "STORE_KEEPER"), validateBody(movementSchema), async (req, res, next) => {
  try {
    if (!req.body.locationId) throw new AppError(400, "VALIDATION_ERROR", "locationId is required");
    const transaction = await prisma.$transaction(async (tx) => {
      await tx.item.findUniqueOrThrow({ where: { id: req.body.itemId } });
      await tx.location.findUniqueOrThrow({ where: { id: req.body.locationId } });
      await setBalance(tx, req.body.itemId, req.body.locationId, req.body.qualityStatus, req.body.quantity, req.body.areaSqm);
      return tx.stockTransaction.create({ data: {
        transactionNo: await nextTransactionNo(tx, "RECEIPT"),
        type: "RECEIPT", itemId: req.body.itemId, toLocationId: req.body.locationId,
        qualityStatus: req.body.qualityStatus, quantity: req.body.quantity, areaSqm: req.body.areaSqm,
        referenceType: req.body.referenceType, referenceId: req.body.referenceId, note: req.body.note, actorId: req.user!.id
      } });
    });
    res.status(201).json(transaction);
  } catch (error) { next(error); }
});

stockRoutes.post("/issue", authorize("ADMIN", "WAREHOUSE_MANAGER", "STORE_KEEPER"), validateBody(movementSchema), async (req, res, next) => {
  try {
    if (!req.body.locationId) throw new AppError(400, "VALIDATION_ERROR", "locationId is required");
    const transaction = await prisma.$transaction(async (tx) => {
      await setBalance(tx, req.body.itemId, req.body.locationId, req.body.qualityStatus, -req.body.quantity, -req.body.areaSqm);
      return tx.stockTransaction.create({ data: {
        transactionNo: await nextTransactionNo(tx, "ISSUE"), type: "ISSUE",
        itemId: req.body.itemId, fromLocationId: req.body.locationId,
        qualityStatus: req.body.qualityStatus, quantity: req.body.quantity, areaSqm: req.body.areaSqm,
        referenceType: req.body.referenceType, referenceId: req.body.referenceId, note: req.body.note, actorId: req.user!.id
      } });
    });
    res.status(201).json(transaction);
  } catch (error) { next(error); }
});

stockRoutes.post("/transfer", authorize("ADMIN", "WAREHOUSE_MANAGER", "STORE_KEEPER"), validateBody(movementSchema), async (req, res, next) => {
  try {
    if (!req.body.fromLocationId || !req.body.toLocationId) throw new AppError(400, "VALIDATION_ERROR", "Both locations are required");
    if (req.body.fromLocationId === req.body.toLocationId) throw new AppError(400, "VALIDATION_ERROR", "Source and destination must differ");
    const transaction = await prisma.$transaction(async (tx) => {
      await setBalance(tx, req.body.itemId, req.body.fromLocationId, req.body.qualityStatus, -req.body.quantity, -req.body.areaSqm);
      await setBalance(tx, req.body.itemId, req.body.toLocationId, req.body.qualityStatus, req.body.quantity, req.body.areaSqm);
      return tx.stockTransaction.create({ data: {
        transactionNo: await nextTransactionNo(tx, "TRANSFER"), type: "TRANSFER",
        itemId: req.body.itemId, fromLocationId: req.body.fromLocationId, toLocationId: req.body.toLocationId,
        qualityStatus: req.body.qualityStatus, quantity: req.body.quantity, areaSqm: req.body.areaSqm,
        referenceType: req.body.referenceType, referenceId: req.body.referenceId, note: req.body.note, actorId: req.user!.id
      } });
    });
    res.status(201).json(transaction);
  } catch (error) { next(error); }
});

stockRoutes.post("/adjust", authorize("ADMIN", "WAREHOUSE_MANAGER"), validateBody(adjustSchema), async (req, res, next) => {
  try {
    if (!req.body.locationId) throw new AppError(400, "VALIDATION_ERROR", "locationId is required");
    const transaction = await prisma.$transaction(async (tx) => {
      await setBalance(tx, req.body.itemId, req.body.locationId, req.body.qualityStatus, req.body.quantity, req.body.areaSqm);
      return tx.stockTransaction.create({ data: {
        transactionNo: await nextTransactionNo(tx, "ADJUSTMENT"), type: "ADJUSTMENT",
        itemId: req.body.itemId, toLocationId: req.body.locationId,
        qualityStatus: req.body.qualityStatus, quantity: req.body.quantity, areaSqm: req.body.areaSqm,
        referenceType: req.body.referenceType, referenceId: req.body.referenceId, note: req.body.note, actorId: req.user!.id
      } });
    });
    res.status(201).json(transaction);
  } catch (error) { next(error); }
});

stockRoutes.post("/count", authorize("ADMIN", "WAREHOUSE_MANAGER", "STORE_KEEPER"), validateBody(movementSchema.extend({ quantity: z.coerce.number().nonnegative(), note: z.string().optional() })), async (req, res, next) => {
  try {
    if (!req.body.locationId) throw new AppError(400, "VALIDATION_ERROR", "locationId is required");
    const transaction = await prisma.$transaction(async (tx) => {
      const existing = await tx.stockBalance.findUnique({ where: { itemId_locationId_qualityStatus: { itemId: req.body.itemId, locationId: req.body.locationId, qualityStatus: req.body.qualityStatus } } });
      const current = existing ? Number(existing.quantity) : 0;
      const delta = req.body.quantity - current;
      await setBalance(tx, req.body.itemId, req.body.locationId, req.body.qualityStatus, delta, req.body.areaSqm - Number(existing?.areaSqm ?? 0));
      return tx.stockTransaction.create({ data: {
        transactionNo: await nextTransactionNo(tx, "STOCK_COUNT"), type: "STOCK_COUNT",
        itemId: req.body.itemId, toLocationId: req.body.locationId,
        qualityStatus: req.body.qualityStatus, quantity: delta, areaSqm: req.body.areaSqm,
        referenceType: "STOCK_COUNT", referenceId: req.body.referenceId, note: req.body.note, actorId: req.user!.id
      } });
    });
    res.status(201).json(transaction);
  } catch (error) { next(error); }
});

stockRoutes.get("/balances", validateQuery(z.object({
  page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().positive().max(100).default(20),
  itemId: z.string().uuid().optional(), locationId: z.string().uuid().optional(), qualityStatus: statusSchema.optional()
})), async (req, res, next) => {
  try {
    const q = res.locals.validatedQuery as { page: number; limit: number; itemId?: string; locationId?: string; qualityStatus?: z.infer<typeof statusSchema> };
    const where: any = { ...(q.itemId ? { itemId: q.itemId } : {}), ...(q.locationId ? { locationId: q.locationId } : {}), ...(q.qualityStatus ? { qualityStatus: q.qualityStatus } : {}) };
    const [data, total] = await Promise.all([
      prisma.stockBalance.findMany({ where, include: { item: true, location: { include: { warehouse: true } } }, skip: (q.page - 1) * q.limit, take: q.limit }),
      prisma.stockBalance.count({ where })
    ]);
    res.json({ data, pagination: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) } });
  } catch (error) { next(error); }
});

stockRoutes.get("/balances/:itemId", async (req, res, next) => {
  try { res.json(await prisma.stockBalance.findMany({ where: { itemId: req.params.itemId }, include: { location: { include: { warehouse: true } } } })); }
  catch (error) { next(error); }
});

stockRoutes.get("/locations/:locationId", async (req, res, next) => {
  try { res.json(await prisma.stockBalance.findMany({ where: { locationId: req.params.locationId }, include: { item: true } })); }
  catch (error) { next(error); }
});

stockRoutes.get("/transactions", validateQuery(z.object({
  page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().positive().max(100).default(20),
  itemId: z.string().uuid().optional(), type: z.enum(["RECEIPT", "ISSUE", "TRANSFER", "ADJUSTMENT", "STOCK_COUNT"]).optional()
})), async (req, res, next) => {
  try {
    const q = res.locals.validatedQuery as { page: number; limit: number; itemId?: string; type?: string };
    const where: any = { ...(q.itemId ? { itemId: q.itemId } : {}), ...(q.type ? { type: q.type } : {}) };
    const [data, total] = await Promise.all([
      prisma.stockTransaction.findMany({ where, include: { item: true, actor: { select: { id: true, name: true } } }, skip: (q.page - 1) * q.limit, take: q.limit, orderBy: { createdAt: "desc" } }),
      prisma.stockTransaction.count({ where })
    ]);
    res.json({ data, pagination: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) } });
  } catch (error) { next(error); }
});

stockRoutes.get("/transactions/:id", async (req, res, next) => {
  try {
    const transaction = await prisma.stockTransaction.findUnique({ where: { id: req.params.id }, include: { item: true, actor: { select: { id: true, name: true } }, fromLocation: true, toLocation: true } });
    if (!transaction) throw new AppError(404, "NOT_FOUND", "Transaction was not found");
    res.json(transaction);
  } catch (error) { next(error); }
});

stockRoutes.get("/summary", async (_req, res, next) => {
  try {
    const [balances, transactions] = await Promise.all([
      prisma.stockBalance.aggregate({
        _sum: { quantity: true, areaSqm: true },
        _count: { _all: true }
      }),
      prisma.stockTransaction.groupBy({
        by: ["type"],
        _count: { _all: true }
      })
    ]);
    res.json({
      balanceRows: balances._count._all,
      quantity: balances._sum.quantity,
      areaSqm: balances._sum.areaSqm,
      transactionsByType: transactions
    });
  } catch (error) { next(error); }
});
