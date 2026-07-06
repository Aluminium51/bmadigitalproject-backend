// src/modules/auth/auth.routes.ts
import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import * as authController from './auth.controller';
import { z } from '@hono/zod-openapi';
import { LoginRequestSchema, LoginResponseSchema } from './auth.schema';
import { ErrorSchema } from '../users/user.schema';

const app = new OpenAPIHono();

const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Auth'],
  summary: 'เข้าสู่ระบบ (Login)',
  request: { body: { content: { 'application/json': { schema: LoginRequestSchema } } } },
  responses: {
    200: { content: { 'application/json': { schema: LoginResponseSchema } }, description: 'สำเร็จ' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'รหัสผ่านผิด' },
    403: { content: { 'application/json': { schema: ErrorSchema } }, description: 'ยังไม่ได้ยืนยันอีเมล' },
    500: { content: { 'application/json': { schema: ErrorSchema } }, description: 'เกิดข้อผิดพลาด' },
  },
});

const verifyRoute = createRoute({
  method: 'get',
  path: '/verify',
  tags: ['Auth'],
  summary: 'ยืนยันอีเมลของผู้ใช้งาน',
  request: {
    query: z.object({
      token: z.string().openapi({
        description: 'รหัสยืนยันตัวตนที่ส่งไปใน Gmail'
      }),
    }),
  },
  responses: {
    200: { content: { 'application/json': { schema: z.object({ message: z.string() }) } }, description: 'สำเร็จ' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Token ไม่ถูกต้องหรือหมดอายุ' },
    500: { content: { 'application/json': { schema: ErrorSchema } }, description: 'เซิร์ฟเวอร์มีปัญหา' },
  },
});

// ดึงข้อมูล request ที่ผ่านการ validate มาใช้งานได้ถูกต้องปลอดภัย
app.openapi(loginRoute, (c) => authController.login(c, c.req.valid('json')));
app.openapi(verifyRoute, (c) => authController.verifyEmail(c));

export default app;