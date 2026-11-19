import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { authenticate, authorize, routeParam, validateBody, validateQuery } from "../../common/middleware";
import { AppError } from "../../common/errors";

export const itemRoutes = Router();

const itemSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(2),
  type: z.enum(["BLOCK", "SLAB", "TILE", "CUT_TO_SIZE", "RESIDUAL", "CONSUMABLE"]),
  uniqueBlockId: z.string().optional(),
  uniqueSlabId: z.string().optional(),
  quarryOrigin: z.string().optional(),
  color: z.string().optional(),
  veinPattern: z.string().optional(),
  qualityGrade: z.string().optional(),
  finish: z.string().optional(),
  thicknessMm: z.coerce.number().positive().optional(),
  lengthMm: z.coerce.number().positive().optional(),
  widthMm: z.coerce.number().positive().optional(),
  weightKg: z.coerce.number().positive().optional(),
  areaSqm: z.coerce.number().positive().optional(),
  recoveryPercent: z.coerce.number().min(0).max(100).optional(),
  qualityStatus: z.enum(["AVAILABLE", "QUARANTINE", "RESERVED", "SOLD"]).default("AVAILABLE"),
  parentId: z.string().uuid().optional()
});

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  type: z.string().optional(),
  qualityStatus: z.string().optional(),
  qualityGrade: z.string().optional(),
  finish: z.string().optional(),
  quarryOrigin: z.string().optional(),
  sortBy: z.enum(["name", "sku", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

itemRoutes.use(authenticate);

itemRoutes.post("/", authorize("ADMIN", "WAREHOUSE_MANAGER", "STORE_KEEPER"), validateBody(itemSchema), async (req, res, next) => {
  try {
    if (req.body.type === "BLOCK" && !req.body.uniqueBlockId) throw new AppError(400, "VALIDATION_ERROR", "uniqueBlockId is required for blocks");
    if (req.body.type === "SLAB" && !req.body.uniqueSlabId) throw new AppError(400, "VALIDATION_ERROR", "uniqueSlabId is required for slabs");
    if (req.body.parentId) {
      const parent = await prisma.item.findUnique({ where: { id: req.body.parentId } });
      if (!parent) throw new AppError(404, "PARENT_NOT_FOUND", "Parent item was not found");
    }
    const item = await prisma.item.create({ data: req.body });
    res.status(201).json(item);
  } catch (error) { next(error); }
});

itemRoutes.get("/", validateQuery(querySchema), async (req, res, next) => {
  try {
    const q = res.locals.validatedQuery as z.infer<typeof querySchema>;
    const where: any = { isActive: true };
    if (q.search) where.OR = [
      { name: { contains: q.search, mode: "insensitive" } },
      { sku: { contains: q.search, mode: "insensitive" } },
      { uniqueBlockId: { contains: q.search, mode: "insensitive" } },
      { uniqueSlabId: { contains: q.search, mode: "insensitive" } }
    ];
    for (const key of ["type", "qualityStatus", "qualityGrade", "finish", "quarryOrigin"] as const) {
      if (q[key]) (where as any)[key] = q[key];
    }
    const [data, total] = await Promise.all([
      prisma.item.findMany({
        where,
        include: { photos: true, balances: { include: { location: { include: { warehouse: true } } } } },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        orderBy: { [q.sortBy]: q.sortOrder }
      }),
      prisma.item.count({ where })
    ]);
    res.json({ data, pagination: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit), sortBy: q.sortBy, sortOrder: q.sortOrder } });
  } catch (error) { next(error); }
});

itemRoutes.get("/by-block/:uniqueBlockId", async (req, res, next) => {
  try {
    const item = await prisma.item.findUnique({ where: { uniqueBlockId: req.params.uniqueBlockId }, include: { children: true } });
    if (!item) throw new AppError(404, "NOT_FOUND", "Block was not found");
    res.json(item);
  } catch (error) { next(error); }
});

itemRoutes.get("/by-slab/:uniqueSlabId", async (req, res, next) => {
  try {
    const item = await prisma.item.findUnique({ where: { uniqueSlabId: req.params.uniqueSlabId }, include: { children: true } });
    if (!item) throw new AppError(404, "NOT_FOUND", "Slab was not found");
    res.json(item);
  } catch (error) { next(error); }
});

itemRoutes.get("/:id/traceability", async (req, res, next) => {
  try {
    const item = await prisma.item.findUnique({
      where: { id: req.params.id },
      include: { parent: true, children: true }
    });
    if (!item) throw new AppError(404, "NOT_FOUND", "Item was not found");
    res.json(item);
  } catch (error) { next(error); }
});

itemRoutes.get("/:id", async (req, res, next) => {
  try {
    const item = await prisma.item.findUnique({ where: { id: req.params.id }, include: { photos: true, parent: true, children: true, balances: true } });
    if (!item) throw new AppError(404, "NOT_FOUND", "Item was not found");
    res.json(item);
  } catch (error) { next(error); }
});

itemRoutes.patch("/:id", authorize("ADMIN", "WAREHOUSE_MANAGER"), validateBody(itemSchema.partial()), async (req, res, next) => {
  try {
    const item = await prisma.item.update({ where: { id: routeParam(req.params.id) }, data: req.body });
    res.json(item);
  } catch (error) { next(error); }
});

itemRoutes.delete("/:id", authorize("ADMIN"), async (req, res, next) => {
  try {
    await prisma.item.update({ where: { id: routeParam(req.params.id) }, data: { isActive: false } });
    res.status(204).send();
  } catch (error) { next(error); }
});

const uploadDir = path.resolve(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype));
  }
});

itemRoutes.post("/:id/photos", authorize("ADMIN", "WAREHOUSE_MANAGER", "STORE_KEEPER"), upload.single("photo"), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, "INVALID_FILE", "A JPEG, PNG, or WebP photo is required");
    const url = `/uploads/${req.file.filename}`;
    const photo = await prisma.itemPhoto.create({ data: { itemId: routeParam(req.params.id), url, caption: req.body.caption } });
    res.status(201).json(photo);
  } catch (error) { next(error); }
});

itemRoutes.delete("/:id/photos/:photoId", authorize("ADMIN", "WAREHOUSE_MANAGER"), async (req, res, next) => {
  try {
    const photo = await prisma.itemPhoto.findFirst({ where: { id: routeParam(req.params.photoId), itemId: routeParam(req.params.id) } });
    if (!photo) throw new AppError(404, "NOT_FOUND", "Photo was not found");
    await prisma.itemPhoto.delete({ where: { id: photo.id } });
    res.status(204).send();
  } catch (error) { next(error); }
});
