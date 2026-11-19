import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate, authorize, routeParam, validateBody, validateQuery } from "../../common/middleware";
import { AppError } from "../../common/errors";

export const warehouseRoutes = Router();
warehouseRoutes.use(authenticate);

const warehouseSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(2),
  address: z.string().optional()
});

const listSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional()
});

warehouseRoutes.post("/", authorize("ADMIN", "WAREHOUSE_MANAGER"), validateBody(warehouseSchema), async (req, res, next) => {
  try { res.status(201).json(await prisma.warehouse.create({ data: req.body })); }
  catch (error) { next(error); }
});

warehouseRoutes.get("/", validateQuery(listSchema), async (req, res, next) => {
  try {
    const q = res.locals.validatedQuery as z.infer<typeof listSchema>;
    const where: any = { isActive: true, ...(q.search ? { OR: [{ code: { contains: q.search, mode: "insensitive" } }, { name: { contains: q.search, mode: "insensitive" } }] } : {}) };
    const [data, total] = await Promise.all([
      prisma.warehouse.findMany({ where, include: { locations: true }, skip: (q.page - 1) * q.limit, take: q.limit, orderBy: { name: "asc" } }),
      prisma.warehouse.count({ where })
    ]);
    res.json({ data, pagination: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) } });
  } catch (error) { next(error); }
});

warehouseRoutes.get("/:id", async (req, res, next) => {
  try {
    const warehouse = await prisma.warehouse.findUnique({ where: { id: req.params.id }, include: { locations: true } });
    if (!warehouse) throw new AppError(404, "NOT_FOUND", "Warehouse was not found");
    res.json(warehouse);
  } catch (error) { next(error); }
});

warehouseRoutes.patch("/:id", authorize("ADMIN", "WAREHOUSE_MANAGER"), validateBody(warehouseSchema.partial()), async (req, res, next) => {
  try { res.json(await prisma.warehouse.update({ where: { id: routeParam(req.params.id) }, data: req.body })); }
  catch (error) { next(error); }
});

warehouseRoutes.delete("/:id", authorize("ADMIN"), async (req, res, next) => {
  try { await prisma.warehouse.update({ where: { id: routeParam(req.params.id) }, data: { isActive: false } }); res.status(204).send(); }
  catch (error) { next(error); }
});

export const locationRoutes = Router();
locationRoutes.use(authenticate);

const locationSchema = z.object({
  warehouseId: z.string().uuid(),
  code: z.string().min(1),
  name: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE")
});

locationRoutes.post("/", authorize("ADMIN", "WAREHOUSE_MANAGER"), validateBody(locationSchema), async (req, res, next) => {
  try { res.status(201).json(await prisma.location.create({ data: req.body })); }
  catch (error) { next(error); }
});

locationRoutes.get("/", validateQuery(z.object({
  warehouseId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
})), async (req, res, next) => {
  try {
    const q = res.locals.validatedQuery as { warehouseId?: string; page: number; limit: number };
    const where: any = q.warehouseId ? { warehouseId: q.warehouseId } : {};
    const [data, total] = await Promise.all([
      prisma.location.findMany({ where, include: { warehouse: true }, skip: (q.page - 1) * q.limit, take: q.limit, orderBy: { code: "asc" } }),
      prisma.location.count({ where })
    ]);
    res.json({ data, pagination: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) } });
  } catch (error) { next(error); }
});

locationRoutes.get("/warehouse/:warehouseId", async (req, res, next) => {
  try { res.json(await prisma.location.findMany({ where: { warehouseId: routeParam(req.params.warehouseId), status: "ACTIVE" }, orderBy: { code: "asc" } })); }
  catch (error) { next(error); }
});

locationRoutes.get("/:id", async (req, res, next) => {
  try {
    const location = await prisma.location.findUnique({ where: { id: req.params.id }, include: { warehouse: true, stock: true } });
    if (!location) throw new AppError(404, "NOT_FOUND", "Location was not found");
    res.json(location);
  } catch (error) { next(error); }
});

locationRoutes.patch("/:id", authorize("ADMIN", "WAREHOUSE_MANAGER"), validateBody(locationSchema.partial()), async (req, res, next) => {
  try { res.json(await prisma.location.update({ where: { id: routeParam(req.params.id) }, data: req.body })); }
  catch (error) { next(error); }
});

locationRoutes.delete("/:id", authorize("ADMIN"), async (req, res, next) => {
  try { await prisma.location.update({ where: { id: routeParam(req.params.id) }, data: { status: "INACTIVE" } }); res.status(204).send(); }
  catch (error) { next(error); }
});
