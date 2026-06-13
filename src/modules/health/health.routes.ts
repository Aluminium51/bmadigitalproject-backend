// src/modules/health/health.routes.ts
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { prisma } from '@/db/prisma';

const app = new OpenAPIHono();

const healthCheckRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['System'], // แยกหมวดหมู่ใน Swagger ให้ชัดเจน
  summary: 'ตรวจสอบสถานะการทำงานของระบบ (Health Check)',
  responses: {
    200: {
      description: 'ระบบทำงานปกติและเชื่อมต่อฐานข้อมูลได้',
      content: {
        'application/json': {
          schema: z.object({
            status: z.string().openapi({ example: 'ok' }),
            database: z.string().openapi({ example: 'connected' }),
            timestamp: z.string().openapi({ example: '2026-06-12T12:00:00.000Z' }),
          }),
        },
      },
    },
    503: {
      description: 'ระบบมีปัญหาหรือไม่สามารถเชื่อมต่อฐานข้อมูลได้',
      content: {
        'application/json': {
          schema: z.object({
            status: z.string().openapi({ example: 'error' }),
            database: z.string().openapi({ example: 'disconnected' }),
          }),
        },
      },
    },
  },
});

app.openapi(healthCheckRoute, async (c) => {
  try {
    // 🟢 ยิง Query เปล่าๆ ไปที่ Postgres เพื่อเช็คว่า Connection ยังไม่หลุด
    await prisma.$queryRawUnsafe('SELECT 1');
    
    return c.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    }, 200);

  } catch (error) {
    console.error('🔥 Health Check Failed:', error);
    
    // 🔴 คืนค่า 503 (Service Unavailable) เพื่อให้ Docker หรือ Load Balancer รู้ว่าระบบป่วย
    return c.json({
      status: 'error',
      database: 'disconnected',
    }, 503);
  }
});

export default app;