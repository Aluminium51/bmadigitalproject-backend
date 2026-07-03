import { eq, desc, like } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../../db";
import { projects } from "../../db/schema/projects";
import { HTTPException } from "hono/http-exception";
import type { CreateProjectDTO, UpdateProjectDTO } from "./project.schema";

// Gen รหัสโครงการ (เช่น BMA-69-0001)
const generateProjectCode = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  // แปลง ค.ศ. เป็น พ.ศ. และเอาเฉพาะ 2 หลักท้าย (เช่น 2026 + 543 = 2569 -> "69")
  const thaiYear = (currentYear + 543).toString().slice(-2);
  const prefix = `BMA-${thaiYear}-`;

  // หาโปรเจกต์ล่าสุดของปีนี้
  const [lastProject] = await db.select({ projectCode: projects.projectCode })
    .from(projects)
    .where(like(projects.projectCode, `${prefix}%`))
    .orderBy(desc(projects.projectCode))
    .limit(1);

  // ถ้ายังไม่มีโปรเจกต์ในปีนี้เลย เริ่มที่ 0001
  if (!lastProject || !lastProject.projectCode) {
    return `${prefix}0001`;
  }

  // หั่นข้อความเพื่อเอาตัวเลข 4 หลักท้ายมา +1 (เช่น "BMA-69-0015" -> "0015" -> 16)
  const lastNumberStr = lastProject.projectCode.split('-')[2];
  const nextNumber = parseInt(lastNumberStr, 10) + 1;
  
  // เติม 0 ด้านหน้าให้ครบ 4 หลัก
  const nextNumberPadded = nextNumber.toString().padStart(4, '0');

  return `${prefix}${nextNumberPadded}`;
};

export const findAllProjects = async () => {
  return await db.select()
    .from(projects)
    .orderBy(desc(projects.createdAt));
};

export const findProjectById = async (id: string) => {
  const [project] = await db.select()
    .from(projects)
    .where(eq(projects.id, id));

  if (!project) {
    throw new HTTPException(404, { message: "ไม่พบข้อมูลโครงการ" });
  }
  return project;
};

export const createProject = async (userId: string, data: CreateProjectDTO) => {
  const newId = uuidv7(); 
  const newProjectCode = await generateProjectCode();

  const [newProject] = await db.insert(projects).values({
    id: newId,
    projectCode: newProjectCode,
    ...data,
    userId,
  }).returning();

  return newProject;
};

export const updateProject = async (id: string, data: UpdateProjectDTO, updatedBy: string) => {
  await findProjectById(id);

  const [updatedProject] = await db.update(projects)
    .set({
      ...data,
      updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id))
    .returning();

  return updatedProject;
};

export const removeProject = async (id: string) => {
  await findProjectById(id);
  await db.delete(projects).where(eq(projects.id, id));
  return true;
};