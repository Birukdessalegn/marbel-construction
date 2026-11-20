import { Router } from "express";
import { authenticate, validateQuery } from "../../common/middleware";
import { purchaseHistoryQuerySchema, supplierPerformanceQuerySchema } from "./procurement.schemas";
import { purchaseHistoryController, supplierPerformanceController } from "./reports.controller";

export const procurementReportRoutes = Router();
procurementReportRoutes.use(authenticate);
procurementReportRoutes.get("/purchase-history", validateQuery(purchaseHistoryQuerySchema), purchaseHistoryController);
procurementReportRoutes.get("/supplier-performance", validateQuery(supplierPerformanceQuerySchema), supplierPerformanceController);
