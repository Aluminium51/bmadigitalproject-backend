// src/modules/auth/auth.routes.ts
import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import * as authController from './auth.controller';
import {
  LoginRequestSchema,
  LoginResponseSchema,
  VerifyEmailQuerySchema,
  SuccessResponseSchema
} from './auth.schema';
import { ErrorSchema } from '../users/user.schema'; // อ้างอิงจาก ErrorSchema เดิมของคุณ

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
  request: { query: VerifyEmailQuerySchema },
  responses: {
    200: { content: { 'application/json': { schema: SuccessResponseSchema } }, description: 'สำเร็จ' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Token ไม่ถูกต้องหรือหมดอายุ' },
    500: { content: { 'application/json': { schema: ErrorSchema } }, description: 'เซิร์ฟเวอร์มีปัญหา' },
  },
});

export const logoutRoute = createRoute({
  method: "post",
  path: "/logout",
  tags: ["Auth"],
  summary: "ออกจากระบบ (Logout)",
  description: "ยกเลิกเซสชันปัจจุบันและลบคุกกี้การยืนยันตัวตน",
  responses: {
    200: { content: { "application/json": { schema: SuccessResponseSchema } }, description: "ออกจากระบบสำเร็จ" },
    500: { content: { "application/json": { schema: ErrorSchema } }, description: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" },
  },
});

// การ Binding Routes กับ Controller
app.openapi(loginRoute, (c) => authController.login(c, c.req.valid('json')));
app.openapi(verifyRoute, (c) => authController.verifyEmail(c));
app.openapi(logoutRoute, (c) => authController.logout(c));

export default app;
