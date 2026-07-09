import { eq, desc, like, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../../db";
import { projects, projectSequences } from "../../db/schema/projects";
import { HTTPException } from "hono/http-exception";
import type { CreateProjectDTO, UpdateProjectDTO } from "./project.schema";
import { divisions, projectStatuses, projectTypes } from "../../db/schema/lookups";
import { users } from "@/db/schema/users";

async function assertUserExists(userId: string) {
  const [user] = await db.select({ userId: users.userId }).from(users).where(eq(users.userId, userId)).limit(1);
  if (!user) throw new HTTPException(401, { message: "Unauthorized: User not found" });
}

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

// Helper 1: สร้าง Query กลางสำหรับการ Join เพื่อไม่ให้โค้ดซ้ำซ้อน
const getBaseProjectQuery = () => {
  return db.select({
    project: projects,
    division: {
      id: divisions.divisionId, 
      name: divisions.divisionName  
    },
    status: {
      id: projectStatuses.id,        
      name: projectStatuses.statusName      
    },
    projectType: {
      id: projectTypes.id,            
      name: projectTypes.typeName
    },
    owner: {
      userId: users.userId,
      firstName: users.firstName,
      lastName: users.lastName
    }
  })
  .from(projects)
  .leftJoin(divisions, eq(projects.divisionId, divisions.divisionId))
  .leftJoin(projectStatuses, eq(projects.projectStatusId, projectStatuses.id))
  .leftJoin(projectTypes, eq(projects.projectTypeId, projectTypes.id))
  .leftJoin(users, eq(projects.userId, users.userId));
};

// Helper 2: Map ข้อมูลที่ Join มาแล้วให้อยู่ใน Format ที่ตรงกับ Zod Schema
const mapJoinedProject = (row: any) => {
  return {
    ...row.project,
    // ใช้ Optional Chaining (?.) เพื่อป้องกัน Error กรณี Left Join แล้วไม่เจอข้อมูล
    division: row.division?.id ? row.division : null,
    status: row.status?.id ? row.status : null,
    projectType: row.projectType?.id ? row.projectType : null,
    owner: row.owner?.userId ? row.owner : null
  };
};

export const findAllProjects = async () => {
  const rows = await getBaseProjectQuery().orderBy(desc(projects.createdAt));
  return rows.map(mapJoinedProject);
};

export const findProjectById = async (id: string) => {
  const rows = await getBaseProjectQuery().where(eq(projects.id, id));

  if (!rows || rows.length === 0) {
    throw new HTTPException(404, { message: "ไม่พบข้อมูลโครงการ" });
  }
  
  return mapJoinedProject(rows[0]);
};

export const createProject = async (userId: string, data: CreateProjectDTO) => {
  await assertUserExists(userId); // ตรวจสอบว่าผู้ใช้งานมีอยู่จริงหรือไม่
  const newId = uuidv7(); 
  const newProjectCode = await generateProjectCode();

  // 1. Insert
  await db.insert(projects).values({
    id: newId,
    projectCode: newProjectCode,
    ...data,
    userId,
  });

  // 2. ดึงข้อมูลที่เพิ่งสร้างใหม่ขึ้นมา (พร้อม Join ตารางที่เกี่ยวข้อง) ส่งกลับไปให้ตรง Schema
  return await findProjectById(newId);
};

export const updateProject = async (id: string, data: UpdateProjectDTO, updatedBy: string) => {
  await assertUserExists(updatedBy);  // ตรวจสอบว่าผู้ใช้งานมีอยู่จริงหรือไม่
  await findProjectById(id);          // ตรวจสอบว่ามีอยู่จริงไหม

  // 1. Update ข้อมูล
  await db.update(projects)
    .set({
      ...data,
      updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id));

  // 2. ดึงข้อมูลอัปเดตล่าสุด (พร้อม Join ตารางที่เกี่ยวข้อง) ส่งกลับไปให้ตรง Schema
  return await findProjectById(id);
};

export const removeProject = async (id: string, userId: string) => {
  await assertUserExists(userId);
  await findProjectById(id);
  await db.delete(projects).where(eq(projects.id, id));
  return true;
};