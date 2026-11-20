import { RequestHandler } from "express";
import { routeParam } from "../../common/middleware";
import { createSupplier, deactivateSupplier, getSupplier, listSuppliers, updateSupplier } from "./suppliers.service";

export const listSuppliersController: RequestHandler = async (_req, res) => {
  res.json(await listSuppliers(res.locals.validatedQuery));
};

export const getSupplierController: RequestHandler = async (req, res) => {
  res.json(await getSupplier(routeParam(req.params.id)));
};

export const createSupplierController: RequestHandler = async (req, res) => {
  res.status(201).json(await createSupplier(req.body));
};

export const updateSupplierController: RequestHandler = async (req, res) => {
  res.json(await updateSupplier(routeParam(req.params.id), req.body));
};

export const deactivateSupplierController: RequestHandler = async (req, res) => {
  await deactivateSupplier(routeParam(req.params.id));
  res.status(204).send();
};
