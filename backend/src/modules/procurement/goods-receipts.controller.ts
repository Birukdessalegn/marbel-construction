import { RequestHandler } from "express";
import { routeParam } from "../../common/middleware";
import { createGoodsReceipt, getGoodsReceipt, listGoodsReceipts } from "./goods-receipts.service";

export const listGoodsReceiptsController: RequestHandler = async (_req, res) => {
  res.json(await listGoodsReceipts(res.locals.validatedQuery));
};

export const getGoodsReceiptController: RequestHandler = async (req, res) => {
  res.json(await getGoodsReceipt(routeParam(req.params.id)));
};

export const createGoodsReceiptController: RequestHandler = async (req, res) => {
  res.status(201).json(await createGoodsReceipt(req.body, req.user!.id));
};
