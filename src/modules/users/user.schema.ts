// src/modules/users/user.schema.ts
import { z } from "@hono/zod-openapi";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "@/db/schema";

// สร้าง Response Schema (เลือกฟิลด์เฉพาะที่จะส่งให้หน้าบ้าน)
export const UserSchema = createSelectSchema(users)
  .pick({
    id: true,
    username: true,
    firstName: true,
    lastName: true,
    department: true,
    role: true,
  })
  .openapi("User");

// สร้าง Request Body Schema สำหรับสมัครสมาชิก
// ตัว drizzle-zod จะนำ Validation Rules เช่น .email() หรือ .min() ที่เรากำหนดเพิ่มเติมมาเช็คให้ด้วยครับ
export const CreateUserSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3),
  password: (schema) => schema.min(8),
  firstName: (schema) => schema.min(1),
  lastName: (schema) => schema.min(1),
  position: (schema) => schema.min(1),
  department: (schema) => schema.min(1),
  division: (schema) => schema.min(1),
  email: (schema) => schema.email(),
  mobilePhone: (schema) => schema.min(6),
  officePhone: (schema) => schema.min(6).optional(),
  internalExtension: (schema) => schema.min(1).optional(),
})
  .omit({ id: true, role: true, createdAt: true, updatedAt: true }) // ตัดฟิลด์ที่ระบบสร้างให้อัตโนมัติออก
  .openapi("CreateUserRequest");

// Schema สำหรับส่งกลับเมื่อเกิดข้อผิดพลาด (คงเดิม)
export const ErrorSchema = z
  .object({
    error: z.string().openapi({ example: "ข้อมูลซ้ำ" }),
    field: z.string().optional().openapi({ example: "email" }),
  })
  .openapi("ErrorResponse");
