import { z } from '@hono/zod-openapi';

// Schema สำหรับ Error แบบมาตรฐาน
export const ErrorSchema = z.object({
  message: z.string().openapi({ example: 'เกิดข้อผิดพลาดบางอย่าง' }),
});

// Schema ของโปรเจกต์เต็มรูปแบบ (ใช้สำหรับ Response)
export const ProjectSchema = z.object({
  id: z.number().openapi({ example: 1 }),
  userId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
  divisionId: z.number().openapi({ example: 12 }),
  projectStatusId: z.number().nullable().openapi({ example: 1 }),
  projectTypeId: z.number().nullable().openapi({ example: 2 }),
  externalTaskId: z.string().nullable().openapi({ example: null }),
  projectName: z.string().nullable().openapi({ example: 'โครงการพัฒนาระบบให้บริการประชาชน' }),
  projectNameOriginal: z.string().nullable().openapi({ example: 'โครงการพัฒนาระบบให้บริการประชาชน' }),
  initialRequestedBudget: z.string().nullable().openapi({ example: '5000000.00' }),
  latestApprovedBudget: z.string().nullable().openapi({ example: '4500000.00' }),
  analystId: z.string().uuid().nullable().openapi({ example: null }),
  assignedBy: z.string().uuid().nullable().openapi({ example: null }),
  assignedAt: z.string().datetime().nullable().openapi({ example: null }),
  isPublic: z.boolean().openapi({ example: false }),
  publicToken: z.string().nullable().openapi({ example: null }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  updatedBy: z.string().uuid().nullable().openapi({ example: null }),
}).openapi('Project');

// Schema สำหรับสร้าง Project ใหม่
export const CreateProjectSchema = z.object({
  projectName: z.string().min(1, "กรุณาระบุชื่อโครงการ").max(600, "ชื่อโครงการยาวเกินไป").openapi({ example: 'โครงการพัฒนาระบบให้บริการประชาชน' }),
  divisionId: z.number().int("รหัสส่วนราชการต้องเป็นตัวเลข").openapi({ example: 12 }),
  projectTypeId: z.number().int().optional().openapi({ example: 2 }),
  isPublic: z.boolean().default(false).openapi({ example: false }),
});

// Schema สำหรับอัปเดต
export const UpdateProjectSchema = CreateProjectSchema.partial();

// Schema สำหรับรับ Parameter จาก URL
export const ProjectIdParamsSchema = z.object({
  id: z.coerce.number().int().positive("ID โครงการต้องเป็นตัวเลขบวก").openapi({ example: 1, description: 'รหัสโครงการ' }),
});

export type CreateProjectDTO = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectDTO = z.infer<typeof UpdateProjectSchema>;