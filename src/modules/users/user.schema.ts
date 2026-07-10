// src/modules/users/user.schema.ts
import { z } from "@hono/zod-openapi";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "@/db/schema/users";

// Schema สำหรับข้อมูลสิทธิ์ (Role)
const RoleSchema = z.object({
  roleId: z.number().openapi({ example: 1 }),
  roleName: z.string().openapi({ example: "USER" })
});

// Schema สำหรับข้อมูลหน่วยงาน
const DivisionSchema = z.object({
  divisionId: z.number().openapi({ example: 1 }),
  divisionName: z.string().openapi({ example: "กองยุทธศาสตร์ดิจิทัล" }),
  departmentId: z.number().openapi({ example: 1 }),
  departmentName: z.string().openapi({ example: "สำนักดิจิทัล" })
});

// Response Schema (ดึงข้อมูลออกมาทั้งหมด)
export const UserSchema = createSelectSchema(users)
  .omit({ // ปิดบังฟิลด์ที่เป็นความลับหรือข้อมูลระบบที่ไม่จำเป็น
    password: true, 
    resetPasswordToken: true,
    resetPasswordExpires: true,
    verificationToken: true,
    verificationExpires: true
  })
  .extend({
    // เพิ่มฟิลด์ที่ได้จากการ Join
    division: DivisionSchema.nullable().openapi({ description: 'ข้อมูลหน่วยงานและต้นสังกัด' }),
    roles: z.array(RoleSchema).openapi({ description: 'สิทธิ์การใช้งานทั้งหมดของผู้ใช้' }),
  })
  .openapi("UserProfileResponse");

// Request Body Schema สำหรับสมัครสมาชิก
export const CreateUserSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3),
  password: (schema) => schema.min(8),
  firstName: (schema) => schema.min(1),
  lastName: (schema) => schema.min(1),
  position: (schema) => schema.min(1),
  email: (schema) => schema.email(),
  mobilePhone: (schema) => schema.min(6),
  officePhone: (schema) => schema.min(6).optional(),
  internalExtension: (schema) => schema.min(1).optional(),
  // เพิ่มการตรวจเช็ค divisionId ว่าต้องเป็นตัวเลข ID ของฝ่ายที่เลือกมา
  divisionId: (schema) => schema.int().positive("กรุณาระบุฝ่ายให้ถูกต้อง"),
})
  .omit({ // ตัด fields ที่ไม่ต้องการออกไปจาก Request Body เพราะเป็นฟิลด์ระบบ
    userId: true,              
    isActive: true,             // Default เป็น true
    lastLogin: true,            // ฟิลด์ระบบ ห้ามกรอกตอนสมัคร
    resetPasswordToken: true,   // ฟิลด์ระบบ
    resetPasswordExpires: true, // ฟิลด์ระบบ
    isVerified: true,           // ระบบจะ Default เป็น false จนกว่าจะยืนยันอีเมล
    verificationToken: true,    // ฟิลด์ระบบ
    verificationExpires: true,  // ฟิลด์ระบบ
    createdAt: true,            // ระบบสร้างให้อัตโนมัติ
    updatedAt: true             // ระบบสร้างให้อัตโนมัติ
  })
  .extend({ // ต่อเติม/ขยาย fields นอกเหนือจากตาราง users เพื่อให้หน้าบ้านส่งมาได้
    // ถ้าตอนสมัครสมาชิก คุณอยากให้หน้าบ้านส่งกลุ่มของ Role ID มาพร้อมกัน (เช่น [1] สำหรับ USER) สามารถเปิดรับตรงนี้ได้ครับ
    roleIds: z.array(z.number()).default([1]).openapi({ example: [1] }),
  })
  .openapi("CreateUserRequest"); // swagger generator

// 3. Schema สำหรับส่งกลับเมื่อเกิดข้อผิดพลาด (คงเดิม)
export const ErrorSchema = z
  .object({
    error: z.string().openapi({ example: "ข้อมูลซ้ำ" }),
    field: z.string().optional().openapi({ example: "email" }),
  })
  .openapi("ErrorResponse");