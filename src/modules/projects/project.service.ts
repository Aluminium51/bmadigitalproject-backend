import { eq, desc } from "drizzle-orm";
import { db } from "../../db";
import { projects } from "../../db/schema/projects";
import { HTTPException } from "hono/http-exception";
import type { CreateProjectDTO, UpdateProjectDTO } from "./project.schema";

export class ProjectService {
  // ดึงรายการโปรเจกต์ทั้งหมด
  static async getProjects() {
    return await db.select()
      .from(projects)
      .orderBy(desc(projects.createdAt));
  }

  // ดึงโปรเจกต์ตาม ID
  static async getProjectById(id: number) {
    const [project] = await db.select()
      .from(projects)
      .where(eq(projects.id, id));

    if (!project) {
      throw new HTTPException(404, { message: "ไม่พบข้อมูลโครงการ" }); 
    }
    return project;
  }

  // สร้างโปรเจกต์ใหม่
  static async createProject(userId: string, data: CreateProjectDTO) {
    const [newProject] = await db.insert(projects).values({
      ...data,
      userId, 
    }).returning();

    return newProject;
  }

  // อัปเดตโปรเจกต์
  static async updateProject(id: number, data: UpdateProjectDTO, updatedBy: string) {
    // เช็คก่อนว่ามีโปรเจกต์นี้ไหม
    await this.getProjectById(id);

    const [updatedProject] = await db.update(projects)
      .set({
        ...data,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();

    return updatedProject;
  }
}