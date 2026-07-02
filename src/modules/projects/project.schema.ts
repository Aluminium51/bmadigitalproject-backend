import { z } from "zod";

// Schema สำหรับตรวจสอบตอนสร้าง Project ใหม่
export const createProjectSchema = z.object({
  projectName: z.string().min(1, "กรุณาระบุชื่อโครงการ").max(500, "ชื่อโครงการยาวเกินไป"),
  divisionId: z.number().int("รหัสส่วนราชการต้องเป็นตัวเลข"),
  projectTypeId: z.number().int().optional(),
  isPublic: z.boolean().default(false),
});

// Schema สำหรับตรวจสอบตอน Update (ให้ทุกฟิลด์เป็น optional)
export const updateProjectSchema = createProjectSchema.partial();

// Schema สำหรับตรวจสอบ Params (เช่น /projects/:id)
export const projectIdSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID ต้องเป็นตัวเลข").transform(Number),
});

export type CreateProjectDTO = z.infer<typeof createProjectSchema>;
export type UpdateProjectDTO = z.infer<typeof updateProjectSchema>;