import { z } from "zod";

const appEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8081),
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must contain at least 32 characters"),
  PUBLIC_API_URL: z.string().url().default("http://localhost:8080/api/v1"),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  UPLOAD_STORAGE_DIR: z.string().trim().min(1).default("uploads"),
  COOKIE_SECURE: z.string().default("false").transform((value) => value.toLowerCase() === "true"),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  COOKIE_DOMAIN: z.string().default(""),
});

export const appEnv = appEnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  PUBLIC_API_URL: process.env.PUBLIC_API_URL,
  CORS_ORIGINS: process.env.CORS_ORIGINS,
  UPLOAD_STORAGE_DIR: process.env.UPLOAD_STORAGE_DIR,
  COOKIE_SECURE: process.env.COOKIE_SECURE,
  COOKIE_SAME_SITE: process.env.COOKIE_SAME_SITE,
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
});

export const corsOrigins = appEnv.CORS_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export type AppEnv = z.infer<typeof appEnvSchema>;
