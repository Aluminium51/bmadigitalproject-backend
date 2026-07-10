import { eq, desc, like, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../../db";
import { projects, projectSequences } from "../../db/schema/projects";
import { HTTPException } from "hono/http-exception";
import type { AssignProjectDTO, CreateProjectDTO, UpdateProjectDTO, UpdateProjectStatusDTO, UpdateProjectTypeDTO } from "./project.schema";
import { divisions, departments, projectStatuses, projectTypes } from "../../db/schema/lookups";
import { users } from "@/db/schema/users";
import { checkPermission, UserContext } from "@/utils/permission.helper";

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
      name: divisions.divisionName,
      departmentId: divisions.departmentId,
      departmentName: departments.departmentName
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
  .leftJoin(departments, eq(divisions.departmentId, departments.departmentId)) 
  .leftJoin(projectStatuses, eq(projects.projectStatusId, projectStatuses.id))
  .leftJoin(projectTypes, eq(projects.projectTypeId, projectTypes.id))
  .leftJoin(users, eq(projects.userId, users.userId));
};

// Helper 2: Map ข้อมูลที่ Join มาแล้วให้อยู่ใน Format ที่ตรงกับ Zod Schema
const mapJoinedProject = (row: any) => {
  return {
    ...row.project,
    division: row.division?.id ? {
      id: row.division.id,
      name: row.division.name,
      departmentId: row.division.departmentId,
      departmentName: row.division.departmentName
    } : null,
    status: row.status?.id ? row.status : null,
    projectType: row.projectType?.id ? row.projectType : null,
    owner: row.owner?.userId ? row.owner : null
  };
};

// export const findAllProjects = async () => {
//   const rows = await getBaseProjectQuery().orderBy(desc(projects.createdAt));
//   return rows.map(mapJoinedProject);
// };

// export const findProjectById = async (id: string) => {
//   const rows = await getBaseProjectQuery().where(eq(projects.id, id));

//   if (!rows || rows.length === 0) {
//     throw new HTTPException(404, { message: "ไม่พบข้อมูลโครงการ" });
//   }
  
//   return mapJoinedProject(rows[0]);
// };

export const findAllProjects = async (user: UserContext) => {
  let query = getBaseProjectQuery();

  // ถ้าไม่ใช่ Admin ให้ดึงเฉพาะข้อมูลในหน่วยงาน (Division) ของตัวเอง
  if (!user.roles.includes('super_admin') && !user.roles.includes('admin')) {
    query = query.where(eq(divisions.departmentId, user.departmentId)) as any;
  }

  const rows = await query.orderBy(desc(projects.createdAt));
  return rows.map(mapJoinedProject);
};

export const findProjectById = async (id: string, user: UserContext) => {
  const rows = await getBaseProjectQuery().where(eq(projects.id, id));
  if (!rows || rows.length === 0) throw new HTTPException(404, { message: "ไม่พบข้อมูลโครงการ" });
  
  const project = mapJoinedProject(rows[0]);
  
  // เช็คสิทธิ์การอ่าน
  checkPermission(user, 'read', 'project', { departmentId: project.division?.departmentId });
  return project;
};

export const createProject = async (user: UserContext, data: CreateProjectDTO) => {
  await assertUserExists(user.userId); 
  const newId = uuidv7(); 
  const newProjectCode = await generateProjectCode();

  await db.insert(projects).values({
    id: newId,
    projectCode: newProjectCode,
    ...data,
    userId: user.userId,
    divisionId: user.divisionId, // บังคับใช้ Division ID จาก User's Token
  });

  return await findProjectById(newId, user);
};

export const updateProject = async (id: string, data: UpdateProjectDTO, user: UserContext) => {
  await assertUserExists(user.userId);      // ตรวจสอบว่าผู้ใช้งานมีอยู่จริงหรือไม่
  await findProjectById(id, user);          // ตรวจสอบว่ามีอยู่จริงไหม

  // 1. Update ข้อมูล
  await db.update(projects)
    .set({
      ...data,
      updatedBy: user.userId,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id));

  // 2. ดึงข้อมูลอัปเดตล่าสุด (พร้อม Join ตารางที่เกี่ยวข้อง) ส่งกลับไปให้ตรง Schema
  return await findProjectById(id, user);
};

export const updateProjectType = async (id: string, data: UpdateProjectTypeDTO, user: UserContext) => {
  const project = await findProjectById(id, user);
  checkPermission(user, 'update', 'project', { departmentId: project.division?.departmentId });

  await db.update(projects)
    .set({ projectTypeId: data.projectTypeId, updatedBy: user.userId, updatedAt: new Date() })
    .where(eq(projects.id, id));

  return await findProjectById(id, user);
};

export const updateProjectStatus = async (id: string, data: UpdateProjectStatusDTO, user: UserContext) => {
  const project = await findProjectById(id, user);
  
  // ถ้าไม่ใช่ Admin หรือ Super Admin จะไม่สามารถเปลี่ยนสถานะได้
  if (!user.roles.includes('admin') && !user.roles.includes('super_admin')) {
    throw new HTTPException(403, { message: "เฉพาะผู้ดูแลระบบหรือหัวหน้าหน่วยงานที่สามารถเปลี่ยนสถานะได้" });
  }

  await db.update(projects)
    .set({ projectStatusId: data.projectStatusId, updatedBy: user.userId, updatedAt: new Date() })
    .where(eq(projects.id, id));
  
  return await findProjectById(id, user);
};

export const assignProject = async (id: string, data: AssignProjectDTO, user: UserContext) => {
  await findProjectById(id, user);
  
  if (!user.roles.includes('admin') && !user.roles.includes('super_admin')) {
    throw new HTTPException(403, { message: "ไม่มีสิทธิ์มอบหมายงาน" });
  }

  await db.update(projects)
    .set({
      analystId: data.analystId,
      assignedBy: user.userId,
      assignedAt: new Date(),
      updatedBy: user.userId,
      updatedAt: new Date()
    })
    .where(eq(projects.id, id));

  return await findProjectById(id, user);
};

export const removeProject = async (id: string, user: UserContext) => {
  const project = await findProjectById(id, user); // จะ Throw 404/403 หากหาไม่เจอหรือไม่มีสิทธิ์อ่าน

  // เช็คสิทธิ์ก่อนลบ
  checkPermission(user, 'delete', 'project', {
    departmentId: project.division?.departmentId,
    status: project.status?.id === 1 ? 'draft' : 'other_status' // 1 = draft
  });

  await db.delete(projects).where(eq(projects.id, id));
  return true;
};