import { eq, desc } from "drizzle-orm";
import { db } from "../../db";
import { projects } from "../../db/schema/projects";
import { HTTPException } from "hono/http-exception";
import type { CreateProjectDTO, UpdateProjectDTO } from "./project.schema";

export const findAllProjects = async () => {
  return await db.select()
    .from(projects)
    .orderBy(desc(projects.createdAt));
};

export const findProjectById = async (id: number) => {
  const [project] = await db.select()
    .from(projects)
    .where(eq(projects.id, id));

  if (!project) {
    throw new HTTPException(404, { message: "ไม่พบข้อมูลโครงการ" });
  }
  return project;
};

export const createProject = async (userId: string, data: CreateProjectDTO) => {
  const [newProject] = await db.insert(projects).values({
    ...data,
    userId,
  }).returning();

  return newProject;
};

export const updateProject = async (id: number, data: UpdateProjectDTO, updatedBy: string) => {
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

export const removeProject = async (id: number) => {
  await findProjectById(id);
  await db.delete(projects).where(eq(projects.id, id));
  return true;
};