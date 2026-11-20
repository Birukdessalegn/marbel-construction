import { Router } from "express";
import { authenticate, authorize, validateBody, validateQuery } from "../../common/middleware";
import {
  supplierCreateSchema,
  supplierListSchema,
  supplierUpdateSchema
} from "./procurement.schemas";
import {
  createSupplierController,
  deactivateSupplierController,
  getSupplierController,
  listSuppliersController,
  updateSupplierController
} from "./suppliers.controller";

export const supplierRoutes = Router();
supplierRoutes.use(authenticate);
supplierRoutes.get("/", validateQuery(supplierListSchema), listSuppliersController);
supplierRoutes.get("/:id", getSupplierController);
supplierRoutes.post("/", authorize("ADMIN", "PURCHASE_MANAGER"), validateBody(supplierCreateSchema), createSupplierController);
supplierRoutes.patch("/:id", authorize("ADMIN", "PURCHASE_MANAGER"), validateBody(supplierUpdateSchema), updateSupplierController);
supplierRoutes.delete("/:id", authorize("ADMIN", "PURCHASE_MANAGER"), deactivateSupplierController);
