import { Prisma } from "@prisma/client";
import { AppError } from "../../common/errors";
import { prisma } from "../../config/prisma";
import { supplierCreateSchema, supplierListSchema, supplierUpdateSchema } from "./procurement.schemas";
import { z } from "zod";

type SupplierCreate = z.infer<typeof supplierCreateSchema>;
type SupplierUpdate = z.infer<typeof supplierUpdateSchema>;
type SupplierList = z.infer<typeof supplierListSchema>;

export async function listSuppliers(query: SupplierList) {
  const where: Prisma.SupplierWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.search ? { name: { contains: query.search, mode: "insensitive" } } : {})
  };
  const [data, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { name: "asc" }
    }),
    prisma.supplier.count({ where })
  ]);
  return { data, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function getSupplier(id: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { _count: { select: { purchaseOrders: true, invoices: true } } }
  });
  if (!supplier) throw new AppError(404, "NOT_FOUND", "Supplier was not found");
  return supplier;
}

export function createSupplier(data: SupplierCreate) {
  return prisma.supplier.create({ data });
}

export async function updateSupplier(id: string, data: SupplierUpdate) {
  await getSupplier(id);
  return prisma.supplier.update({ where: { id }, data });
}

export async function deactivateSupplier(id: string) {
  await getSupplier(id);
  return prisma.supplier.update({ where: { id }, data: { status: "INACTIVE" } });
}
