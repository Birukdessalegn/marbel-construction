import { RequestHandler } from "express";
import { routeParam } from "../../common/middleware";
import { createLandingCost, listLandingCosts } from "./landing-costs.service";

export const listLandingCostsController: RequestHandler = async (req, res) => {
  res.json(await listLandingCosts(routeParam(req.params.purchaseOrderId)));
};

export const createLandingCostController: RequestHandler = async (req, res) => {
  res.status(201).json(await createLandingCost(routeParam(req.params.purchaseOrderId), req.body));
};
