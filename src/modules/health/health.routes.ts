// src/modules/health/health.routes.ts
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { db } from "@/db";
import { sql } from "drizzle-orm";

const app = new OpenAPIHono();

// Schema for successful health check response
const HealthSuccessSchema = z
  .object({
    status: z.string().openapi({ example: "ok" }),
    database: z.string().openapi({ example: "connected" }),
    timestamp: z.string().openapi({ example: "2026-06-12T12:00:00.000Z" }),
  })
  .openapi("HealthSuccess");

// Schema for error health check response
const HealthErrorSchema = z
  .object({
    status: z.string().openapi({ example: "error" }),
    database: z.string().openapi({ example: "disconnected" }),
  })
  .openapi("HealthError");

const healthCheckRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["System"],
  summary: "ตรวจสอบสถานะการทำงานของระบบ (Health Check)",
  responses: {
    200: {
      description: "ระบบทำงานปกติและเชื่อมต่อฐานข้อมูลได้",
      content: {
        "application/json": { schema: HealthSuccessSchema },
      },
    },
    503: {
      description: "ระบบมีปัญหาหรือไม่สามารถเชื่อมต่อฐานข้อมูลได้",
      content: {
        "application/json": { schema: HealthErrorSchema },
      },
    },
  },
});

app.openapi(healthCheckRoute, async (c) => {
  try {
    await db.execute(sql`SELECT 1`);

    return c.json(
      {
        status: "ok",
        database: "connected",
        timestamp: new Date().toISOString(),
      },
      200,
    );
  } catch (error) {
    console.error("🔥 Health Check Failed:", error);

    return c.json(
      {
        status: "error",
        database: "disconnected",
      },
      503,
    );
  }
});

export default app;
