import { eq, desc, like, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../../db";
import { projects, projectSequences } from "../../db/schema/projects";
import { HTTPException } from "hono/http-exception";
import type { CreateProjectDTO, UpdateProjectDTO } from "./project.schema";

// Gen รหัสโครงการ (เช่น BMA-69-0001)
const generateProjectCode = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const thaiYear = currentYear + 543;
  const shortYear = thaiYear.toString().slice(-2);
  const prefix = `BMA-${shortYear}-`;

  // Database จะทำหน้าที่บวก 1 ให้อัตโนมัติ (รับประกันไม่เกิด Race Condition)
  const [sequence] = await db.insert(projectSequences)
    .values({ year: thaiYear, lastValue: 1 })
    .onConflictDoUpdate({
      target: projectSequences.year,
      set: { lastValue: sql`${projectSequences.lastValue} + 1` }
    })
    .returning();

  const nextNumberPadded = sequence.lastValue.toString().padStart(4, '0');
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