// src/modules/users/user.routes.ts
import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import { UserSchema, CreateUserSchema, ErrorSchema } from './user.schema';
import * as userController from './user.controller'; // ดึง Controller มาใช้

const app = new OpenAPIHono();

// ==========================================
// Route 1: ดึงรายชื่อผู้ใช้งานทั้งหมด
// ==========================================
const getUsersRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Users'],
  summary: 'ดึงรายชื่อผู้ใช้งานทั้งหมด',
  responses: {
    200: {
      content: { 'application/json': { schema: z.array(UserSchema) } },
      description: 'รายชื่อผู้ใช้',
    },
  },
});

app.openapi(getUsersRoute, (c) => userController.getUsers(c));

// ==========================================
// Route 2: สร้างผู้ใช้งานใหม่
// ==========================================
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
            user: z.any() // TODO: แนะนำให้ใช้ z.any() ไปก่อน หรือถ้ามี FullUserSchema ก็ใส่แทนได้
          })
        } 
      },
      description: 'สร้างผู้ใช้สำเร็จ',
    },
    // ประกาศให้ Swagger รู้ว่าเส้นนี้มีโอกาสพ่น 409 และ 500 ออกมา
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
  return userController.createUser(c, body); // โยน Context และ Body ให้ Controller จัดการต่อ
});

export default app;