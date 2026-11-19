import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ZodError, ZodType } from "zod";
import { env } from "../config/env";
import { AppError } from "./errors";
import { prisma } from "../config/prisma";

export function routeParam(value: string | string[] | undefined): string {
  if (typeof value !== "string") throw new AppError(400, "VALIDATION_ERROR", "Invalid route parameter");
  return value;
}

export type AuthUser = { id: string; email: string; role: string };
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error);
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) return next(result.error);
    req.query = result.data as never;
    next();
  };
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as AuthUser;
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user?.isActive) throw new AppError(401, "UNAUTHORIZED", "Account is inactive or invalid");
    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError(401, "UNAUTHORIZED", "Invalid or expired access token"));
    } else {
      next(error);
    }
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "FORBIDDEN", "You do not have permission for this operation"));
    }
    next();
  };
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "One or more fields are invalid",
      details: error.issues
    });
  }
  if (error instanceof AppError) {
    return res.status(error.status).json({
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {})
    });
  }
  console.error(error);
  res.status(500).json({ code: "INTERNAL_ERROR", message: "An unexpected error occurred" });
}
