import { Router } from "express";
import { authenticate, authorize, validateBody } from "../../common/middleware";
import { landingCostCreateSchema } from "./procurement.schemas";
import { createLandingCostController, listLandingCostsController } from "./landing-costs.controller";

export const landingCostRoutes = Router();
landingCostRoutes.use(authenticate);
landingCostRoutes.get("/purchase-orders/:purchaseOrderId/landing-costs", listLandingCostsController);
landingCostRoutes.post(
  "/purchase-orders/:purchaseOrderId/landing-costs",
  authorize("ADMIN", "PURCHASE_MANAGER"),
  validateBody(landingCostCreateSchema),
  createLandingCostController
);
