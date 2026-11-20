import { Router } from "express";
import { authenticate, authorize, validateBody, validateQuery } from "../../common/middleware";
import {
  purchaseOrderCreateSchema,
  purchaseOrderListSchema,
  purchaseOrderUpdateSchema
} from "./procurement.schemas";
import {
  approvePurchaseOrderController,
  cancelPurchaseOrderController,
  closePurchaseOrderController,
  createPurchaseOrderController,
  getPurchaseOrderController,
  listPurchaseOrdersController,
  updatePurchaseOrderController
} from "./purchase-orders.controller";

export const purchaseOrderRoutes = Router();
purchaseOrderRoutes.use(authenticate);
purchaseOrderRoutes.get("/", validateQuery(purchaseOrderListSchema), listPurchaseOrdersController);
purchaseOrderRoutes.get("/:id", getPurchaseOrderController);
purchaseOrderRoutes.post("/", authorize("ADMIN", "PURCHASE_MANAGER"), validateBody(purchaseOrderCreateSchema), createPurchaseOrderController);
purchaseOrderRoutes.patch("/:id", authorize("ADMIN", "PURCHASE_MANAGER"), validateBody(purchaseOrderUpdateSchema), updatePurchaseOrderController);
purchaseOrderRoutes.post("/:id/approve", authorize("ADMIN", "PURCHASE_MANAGER"), approvePurchaseOrderController);
purchaseOrderRoutes.post("/:id/cancel", authorize("ADMIN", "PURCHASE_MANAGER"), cancelPurchaseOrderController);
purchaseOrderRoutes.post("/:id/close", authorize("ADMIN", "PURCHASE_MANAGER"), closePurchaseOrderController);
