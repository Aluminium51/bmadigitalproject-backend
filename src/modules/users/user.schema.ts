// src/modules/users/user.schema.ts
import { z } from '@hono/zod-openapi';

// Schema สำหรับส่งข้อมูลผู้ใช้กลับไปให้หน้าบ้าน (Response)
export const UserSchema = z.object({
  id: z.string().openapi({ example: 'cuid123456' }),
  username: z.string().openapi({ example: 'johndoe' }),
  firstName: z.string().openapi({ example: 'สมชาย' }),
  lastName: z.string().openapi({ example: 'ใจดี' }),
  department: z.string().openapi({ example: 'สำนักดิจิทัล' }),
  role: z.string().openapi({ example: 'USER' }),
}).openapi('User');

// Schema สำหรับตอนสร้างผู้ใช้ใหม่ (Request Body)
export const CreateUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  position: z.string().min(1),
  department: z.string().min(1),
  division: z.string().min(1),
  email: z.string().email(),
  mobilePhone: z.string().min(6),
  officePhone: z.string().min(6).optional(), 
  internalExtension: z.string().min(1).optional(),
  
}).openapi('CreateUserRequest');

// Schema สำหรับส่งกลับเมื่อเกิดข้อผิดพลาด
export const ErrorSchema = z.object({
  error: z.string().openapi({ example: 'ข้อมูลซ้ำ' }),
  field: z.string().optional().openapi({ example: 'email' }),
}).openapi('ErrorResponse');