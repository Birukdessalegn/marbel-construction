import { RequestHandler } from "express";
import { getPurchaseHistory, getSupplierPerformance } from "./reports.service";

export const purchaseHistoryController: RequestHandler = async (_req, res) => {
  res.json(await getPurchaseHistory(res.locals.validatedQuery));
};

export const supplierPerformanceController: RequestHandler = async (_req, res) => {
  res.json(await getSupplierPerformance(res.locals.validatedQuery));
};
