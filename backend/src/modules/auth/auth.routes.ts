import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { AppError } from "../../common/errors";
import { authenticate, authorize, validateBody } from "../../common/middleware";

export const authRoutes = Router();

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
const refreshSchema = z.object({ refreshToken: z.string().min(20) });

function accessToken(user: { id: string; email: string; role: string }) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as SignOptions["expiresIn"]
  });
}

authRoutes.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (!user?.isActive || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }
    const refreshToken = crypto.randomBytes(48).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
    res.json({ accessToken: accessToken(user), refreshToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) { next(error); }
});

authRoutes.post("/refresh", validateBody(refreshSchema), async (req, res, next) => {
  try {
    const tokenHash = crypto.createHash("sha256").update(req.body.refreshToken).digest("hex");
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!stored || stored.revokedAt || stored.expiresAt <= new Date() || !stored.user.isActive) {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
    }
    res.json({ accessToken: accessToken(stored.user) });
  } catch (error) { next(error); }
});

authRoutes.post("/logout", authenticate, validateBody(refreshSchema), async (req, res, next) => {
  try {
    const tokenHash = crypto.createHash("sha256").update(req.body.refreshToken).digest("hex");
    await prisma.refreshToken.updateMany({ where: { tokenHash, userId: req.user!.id }, data: { revokedAt: new Date() } });
    res.status(204).send();
  } catch (error) { next(error); }
});

authRoutes.get("/me", authenticate, (req, res) => res.json({ user: req.user }));

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "WAREHOUSE_MANAGER", "STORE_KEEPER", "VIEWER"])
});

authRoutes.post("/users", authenticate, authorize("ADMIN"), validateBody(createUserSchema), async (req, res, next) => {
  try {
    const { password, ...data } = req.body as z.infer<typeof createUserSchema>;
    const user = await prisma.user.create({ data: { ...data, passwordHash: await bcrypt.hash(password, 12) } });
    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive });
  } catch (error) { next(error); }
});
