import { OpenAPIHono } from "@hono/zod-openapi";
import { db } from "@/db";
import { sql } from "drizzle-orm";

const app = new OpenAPIHono();

app.get("/live", (c) => c.json({
  status: "ok",
  timestamp: new Date().toISOString(),
}, 200));

app.get("/ready", async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
    return c.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    }, 200);
  } catch (error) {
    console.error("Health readiness check failed:", error);
    return c.json({ status: "error", database: "disconnected" }, 503);
  }
});

// Backward-compatible readiness endpoint.
app.get("/", async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
    return c.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    }, 200);
  } catch {
    return c.json({ status: "error", database: "disconnected" }, 503);
  }
});

export default app;
