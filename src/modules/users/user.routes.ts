// src/modules/users/user.routes.ts
import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import * as userService from './user.service';
import { UserSchema, CreateUserSchema } from './user.schema';
import { z } from '@hono/zod-openapi';

const app = new OpenAPIHono();

// Route 1: ดึงรายชื่อผู้ใช้งานทั้งหมด
const getUsersRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Users'], // หมวดหมู่ใน Swagger
  summary: 'ดึงรายชื่อผู้ใช้งานทั้งหมด',
  responses: {
    200: {
      content: { 'application/json': { schema: z.array(UserSchema) } },
      description: 'รายชื่อผู้ใช้',
    },
  },
});

app.openapi(getUsersRoute, async (c) => {
  const users = await userService.getAllUsers();
  return c.json(users, 200);
});

// Route 2: สร้างผู้ใช้งานใหม่
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
      content: { 'application/json': { schema: UserSchema } },
      description: 'สร้างผู้ใช้สำเร็จ',
    },
  },
});

app.openapi(createUserRoute, async (c) => {
  const body = c.req.valid('json'); // ข้อมูลถูกตรวจสอบด้วย Zod เรียบร้อยแล้ว
  const newUser = await userService.createUser(body);
  return c.json(newUser, 201);
});

export default app;