// src/modules/users/user.routes.ts
import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import { UserSchema, CreateUserSchema, ErrorSchema, PaginatedUserResponseSchema, UserQuerySchema } from './user.schema';
import * as userController from './user.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { HTTPException } from 'hono/http-exception';
import type { Context, Next } from 'hono';
import type { UserContext } from '../../utils/permission.helper';

const app = new OpenAPIHono();

const adminOnly = async (c: Context, next: Next) => {
  const user = c.get('user') as UserContext | undefined;
  if (!user?.roles.some((role) => role === 'admin' || role === 'super_admin')) {
    throw new HTTPException(403, { message: 'Forbidden: Admin or Super Admin access is required.' });
  }
  await next();
};

const getUsersRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Users'],
  middleware: [authMiddleware, adminOnly],
  request: { query: UserQuerySchema },
  summary: 'ดึงรายชื่อผู้ใช้งานทั้งหมด',
  responses: {
    200: {
      content: { 'application/json': { schema: PaginatedUserResponseSchema } },
      description: 'รายชื่อผู้ใช้ทั้งหมดในระบบ',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'ไม่พบข้อมูลผู้ใช้งานในระบบ',
    },
    500: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'ข้อผิดพลาดทางเซิร์ฟเวอร์',
    },
  },
});
app.openapi(getUsersRoute, (c) => userController.getUsers(c, c.req.valid('query')));

const getUserProfileRoute = createRoute({
  method: 'get',
  path: '/profile/:userId', // ตั้ง path รับค่า userId
  tags: ['Users'],
  summary: 'ดึงโปรไฟล์ผู้ใช้งานรายบุคคล',
  request: {
    params: z.object({
      // บังคับให้หน้าบ้านส่งมาในรูปแบบ UUID เท่านั้น
      userId: z.string().uuid().openapi({ description: 'รหัสประจำตัวของผู้ใช้ (UUID)' }),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: UserSchema } },
      description: 'ข้อมูลโปรไฟล์ของผู้ใช้รายบุคคล',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'กรุณาระบุรหัสผู้ใช้งาน',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'ไม่พบรหัสผู้ใช้งานนี้ในฐานข้อมูล',
    },
    500: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'ข้อผิดพลาดทางเซิร์ฟเวอร์',
    },
  },
});
app.openapi(getUserProfileRoute, (c) => {
  const { userId } = c.req.valid('param');
  return userController.getUserProfile(c, userId);
});

const createUserRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Users'],
  summary: 'สร้างผู้ใช้งานใหม่',
  request: {
    body: {
      content: { 'application/json': { schema: CreateUserSchema } },
    },
  },
  responses: {
    201: {
      content: { 
        'application/json': { 
          schema: z.object({
            message: z.string(),
            requireVerification: z.boolean(),
            user: z.any() 
          })
        } 
      },
      description: 'สร้างผู้ใช้สำเร็จ',
    },
    409: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'ข้อมูลซ้ำซ้อน (Conflict)',
    },
    500: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'ข้อผิดพลาดทางเซิร์ฟเวอร์',
    },
  },
});
app.openapi(createUserRoute, (c) => {
  const body = c.req.valid('json'); 
  return userController.createUser(c, body);
});

export default app;
