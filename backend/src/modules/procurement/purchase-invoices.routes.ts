import { Router } from "express";
import { authenticate, authorize, validateBody, validateQuery } from "../../common/middleware";
import { purchaseInvoiceCreateSchema, purchaseInvoiceListSchema } from "./procurement.schemas";
import {
  createPurchaseInvoiceController,
  getPurchaseInvoiceController,
  listPurchaseInvoicesController,
  voidPurchaseInvoiceController
} from "./purchase-invoices.controller";

export const purchaseInvoiceRoutes = Router();
purchaseInvoiceRoutes.use(authenticate);
purchaseInvoiceRoutes.get("/", validateQuery(purchaseInvoiceListSchema), listPurchaseInvoicesController);
purchaseInvoiceRoutes.get("/:id", getPurchaseInvoiceController);
purchaseInvoiceRoutes.post("/", authorize("ADMIN", "PURCHASE_MANAGER"), validateBody(purchaseInvoiceCreateSchema), createPurchaseInvoiceController);
purchaseInvoiceRoutes.post("/:id/void", authorize("ADMIN", "PURCHASE_MANAGER"), voidPurchaseInvoiceController);
