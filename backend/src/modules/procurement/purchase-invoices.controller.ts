import { RequestHandler } from "express";
import { routeParam } from "../../common/middleware";
import { createPurchaseInvoice, getPurchaseInvoice, listPurchaseInvoices, voidPurchaseInvoice } from "./purchase-invoices.service";

export const listPurchaseInvoicesController: RequestHandler = async (_req, res) => {
  res.json(await listPurchaseInvoices(res.locals.validatedQuery));
};

export const getPurchaseInvoiceController: RequestHandler = async (req, res) => {
  res.json(await getPurchaseInvoice(routeParam(req.params.id)));
};

export const createPurchaseInvoiceController: RequestHandler = async (req, res) => {
  res.status(201).json(await createPurchaseInvoice(req.body));
};

export const voidPurchaseInvoiceController: RequestHandler = async (req, res) => {
  res.json(await voidPurchaseInvoice(routeParam(req.params.id)));
};
