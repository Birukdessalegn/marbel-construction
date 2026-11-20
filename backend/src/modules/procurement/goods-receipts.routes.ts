import { Router } from "express";
import { authenticate, authorize, validateBody, validateQuery } from "../../common/middleware";
import { goodsReceiptCreateSchema, goodsReceiptListSchema } from "./procurement.schemas";
import {
  createGoodsReceiptController,
  getGoodsReceiptController,
  listGoodsReceiptsController
} from "./goods-receipts.controller";

export const goodsReceiptRoutes = Router();
goodsReceiptRoutes.use(authenticate);
goodsReceiptRoutes.get("/", validateQuery(goodsReceiptListSchema), listGoodsReceiptsController);
goodsReceiptRoutes.get("/:id", getGoodsReceiptController);
goodsReceiptRoutes.post("/", authorize("ADMIN", "WAREHOUSE_MANAGER"), validateBody(goodsReceiptCreateSchema), createGoodsReceiptController);
