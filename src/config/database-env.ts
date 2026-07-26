import { z } from "zod";

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
});

export const databaseEnv = databaseEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
});

export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
