import { RequestHandler } from "express";
import { routeParam } from "../../common/middleware";
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  closePurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  updateDraftPurchaseOrder
} from "./purchase-orders.service";

export const listPurchaseOrdersController: RequestHandler = async (_req, res) => {
  res.json(await listPurchaseOrders(res.locals.validatedQuery));
};

export const getPurchaseOrderController: RequestHandler = async (req, res) => {
  res.json(await getPurchaseOrder(routeParam(req.params.id)));
};

export const createPurchaseOrderController: RequestHandler = async (req, res) => {
  res.status(201).json(await createPurchaseOrder(req.body, req.user!.id));
};

export const updatePurchaseOrderController: RequestHandler = async (req, res) => {
  res.json(await updateDraftPurchaseOrder(routeParam(req.params.id), req.body));
};

export const approvePurchaseOrderController: RequestHandler = async (req, res) => {
  res.json(await approvePurchaseOrder(routeParam(req.params.id), req.user!.id));
};

export const cancelPurchaseOrderController: RequestHandler = async (req, res) => {
  res.json(await cancelPurchaseOrder(routeParam(req.params.id)));
};

export const closePurchaseOrderController: RequestHandler = async (req, res) => {
  res.json(await closePurchaseOrder(routeParam(req.params.id)));
};
