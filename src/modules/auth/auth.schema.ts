import { z } from '@hono/zod-openapi';

export const LoginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
}).openapi('LoginRequest');

export const LoginResponseSchema = z.object({
  message: z.string(),
  token: z.string(), // เราจะส่ง JWT Token กลับไปให้หน้าบ้าน
  user: z.object({
    userId: z.string(),
    username: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  })
}).openapi('LoginResponse');