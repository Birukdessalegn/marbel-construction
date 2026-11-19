import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1).default("postgresql://postgres:postgres@localhost:5432/marbleerp?schema=public"),
  JWT_ACCESS_SECRET: z.string().min(32).default("development-access-secret-change-this-value"),
  JWT_REFRESH_SECRET: z.string().min(32).default("development-refresh-secret-change-this-value"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().default(10),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local")
});

export const env = schema.parse(process.env);
