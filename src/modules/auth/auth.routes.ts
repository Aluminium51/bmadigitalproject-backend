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
  summary: 'ยืนยันอีเมลด้วย Token',
  request: {
    query: z.object({ token: z.string() }) // รับค่า token จาก URL
  },
  responses: {
    200: { description: 'ยืนยันสำเร็จ' },
    400: { description: 'Token ไม่ถูกต้อง' }
  }
});

app.openapi(loginRoute, (c) => authController.login(c, c.req.valid('json')));
app.openapi(verifyRoute, (c) => authController.verifyEmail(c));

export default app;