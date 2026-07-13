import { z } from '@hono/zod-openapi';

// Schema สำหรับ Error แบบมาตรฐาน
export const ErrorSchema = z.object({
  message: z.string().openapi({ example: 'เกิดข้อผิดพลาดบางอย่าง' }),
});

// Schema สำหรับ Lookup แบบย่อ (ใช้สำหรับ Join ข้อมูลจากตารางอื่น เช่น Division, Status, ProjectType)
const CompactLookupSchema = z.object({
  id: z.number(),
  name: z.string(),
});

// Schema สำหรับ User แบบย่อ (ใช้สำหรับ Join ข้อมูลผู้สร้างโครงการ)
const CompactUserSchema = z.object({
  userId: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
});

const DivisionLookupSchema = z.object({
  id: z.number(),
  name: z.string(),
  departmentId: z.number().nullable(),
  departmentName: z.string().nullable(),
});

// Schema ของโปรเจกต์เต็มรูปแบบ (ใช้สำหรับ Response)
export const ProjectSchema = z.object({
  id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
  projectCode: z.string().nullable().openapi({ example: 'BMA-69-0001' }),
  userId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
  divisionId: z.number().openapi({ example: 12 }),
  projectStatusId: z.number().nullable().openapi({ example: 1 }),
  projectTypeId: z.number().nullable().openapi({ example: 2 }),
  fourQuadrantsId: z.number().nullable().openapi({ example: 1 }),
  deputyGovernorId: z.number().nullable().openapi({ example: 3 }),
  externalTaskId: z.string().nullable().openapi({ example: null }),
  projectName: z.string().nullable().openapi({ example: 'โครงการพัฒนาระบบให้บริการประชาชน' }),
  projectNameOriginal: z.string().nullable().openapi({ example: 'โครงการพัฒนาระบบให้บริการประชาชน' }),
  initialRequestedBudget: z.string().nullable().openapi({ example: '5000000.00' }),
  latestApprovedBudget: z.string().nullable().openapi({ example: '4500000.00' }),
  analystId: z.string().uuid().nullable().openapi({ example: null }),
  assignedBy: z.string().uuid().nullable().openapi({ example: null }),
  assignedAt: z.union([z.string(), z.date()]).nullable().openapi({ type: 'string', format: 'date-time', example: null }),
  isPublic: z.boolean().openapi({ example: false }),
  publicToken: z.string().nullable().openapi({ example: null }),
  createdAt: z.union([z.string(), z.date()]).openapi({ type: 'string', format: 'date-time' }),
  updatedAt: z.union([z.string(), z.date()]).openapi({ type: 'string', format: 'date-time' }),
  updatedBy: z.string().uuid().nullable().openapi({ example: null }),

  // เพิ่มฟิลด์ที่ถูก Join สำหรับการใช้งานฝั่งหน้าบ้าน
  division: DivisionLookupSchema.nullable().openapi({ description: 'ข้อมูลส่วนราชการเจ้าของโครงการ' }),
  status: CompactLookupSchema.nullable().openapi({ description: 'สถานะโครงการ' }),
  projectType: CompactLookupSchema.nullable().openapi({ description: 'ประเภทโครงการ' }),
  owner: CompactUserSchema.nullable().openapi({ description: 'ผู้สร้างโครงการ' }),
}).openapi('Project');

// Schema สำหรับสร้าง Project ใหม่
export const CreateProjectSchema = z.object({
  projectName: z.string().min(1, "กรุณาระบุชื่อโครงการ").max(600, "ชื่อโครงการยาวเกินไป").openapi({ example: 'โครงการพัฒนาระบบให้บริการประชาชน' }),
  projectTypeId: z.number().int().optional().openapi({ example: 2 }),
  isPublic: z.boolean().default(false).openapi({ example: false }),
  fourQuadrantsId: z.coerce.number().int().openapi({ example: 1 }),
  deputyGovernorId: z.coerce.number().int().openapi({ example: 3 }),
});

export const UpdateProjectStatusSchema = z.object({
  projectStatusId: z.number().int().openapi({ example: 2 }),
  remark: z.string().optional().openapi({ example: 'ผ่านการอนุมัติขั้นต้น' }),
});

export const UpdateProjectTypeSchema = z.object({
  projectTypeId: z.number().int().openapi({ example: 3 }),
});

export const AssignProjectSchema = z.object({
  analystId: z.string().uuid().openapi({ description: 'UUID ของนักวิเคราะห์' }),
});

// Schema สำหรับอัปเดต
export const UpdateProjectSchema = CreateProjectSchema.partial();

// Schema สำหรับรับ Parameter จาก URL
export const ProjectIdParamsSchema = z.object({
  id: z.string().uuid("ID โครงการต้องเป็น UUID").openapi({ example: '018f3a3b-1b2c-7d3e-8f4g-5h6i7j8k9l0m', description: 'รหัสโครงการ (UUID)' }),
});

// Schema สำหรับ Query Parameters ของการดึงรายการ Project
// ใช้สำหรับ Pagination, Search, Filter
export const ProjectQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'all_except_draft', 'all']).default('all'),
  ownership: z.enum(['mine', 'team_only', 'team_and_mine', 'all']).default('all'),
});

export const PaginatedProjectResponseSchema = z.object({
  data: z.array(ProjectSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  })
}).openapi('PaginatedProjectResponse');

export type CreateProjectDTO = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectDTO = z.infer<typeof UpdateProjectSchema>;
export type UpdateProjectStatusDTO = z.infer<typeof UpdateProjectStatusSchema>;
export type UpdateProjectTypeDTO = z.infer<typeof UpdateProjectTypeSchema>;
export type AssignProjectDTO = z.infer<typeof AssignProjectSchema>;
