import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import * as authController from './auth.controller';
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

app.openapi(loginRoute, (c) => authController.login(c, c.req.valid('json')));

export default app;