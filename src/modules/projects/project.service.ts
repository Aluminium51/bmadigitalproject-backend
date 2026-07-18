import {
  eq,
  desc,
  sql,
  and,
  or,
  ilike,
  ne,
  not,
  aliasedTable,
} from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../../db";
import { projects, projectAttachments, projectSequences } from "../../db/schema/projects";
import { HTTPException } from "hono/http-exception";
import type {
  AssignProjectDTO,
  CreateProjectDTO,
  UpdateProjectDTO,
  UpdateProjectStatusDTO,
  UpdateProjectTypeDTO,
} from "./project.schema";
import {
  divisions,
  departments,
  projectStatuses,
  projectTypes,
  projectAttachmentTypes,
} from "../../db/schema/lookups";
import { users } from "@/db/schema/users";
import { checkPermission, UserContext } from "@/utils/permission.helper";
import {
  PROJECT_STATUS,
  applyProjectStatusTransition,
  assertValidProjectTransition,
} from "./project-workflow";

async function assertUserExists(userId: string) {
  const [user] = await db
    .select({ userId: users.userId })
    .from(users)
    .where(eq(users.userId, userId))
    .limit(1);
  if (!user)
    throw new HTTPException(401, { message: "Unauthorized: User not found" });
}

// Gen รหัสโครงการ (เช่น BMA-69-0001)
const generateProjectCode = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const thaiYear = currentYear + 543;
  const shortYear = thaiYear.toString().slice(-2);
  const prefix = `BMA-${shortYear}-`;

  // Database จะทำหน้าที่บวก 1 ให้อัตโนมัติ (รับประกันไม่เกิด Race Condition)
  const [sequence] = await db
    .insert(projectSequences)
    .values({ year: thaiYear, lastValue: 1 })
    .onConflictDoUpdate({
      target: projectSequences.year,
      set: { lastValue: sql`${projectSequences.lastValue} + 1` },
    })
    .returning();

  const nextNumberPadded = sequence.lastValue.toString().padStart(4, "0");
  return `${prefix}${nextNumberPadded}`;
};

const analysts = aliasedTable(users, "analysts");

// Helper 1: สร้าง Query กลางสำหรับการ Join เพื่อไม่ให้โค้ดซ้ำซ้อน
const getBaseProjectQuery = () => {
  return db
    .select({
      project: projects,
      division: {
        id: divisions.divisionId,
        name: divisions.divisionName,
        departmentId: divisions.departmentId,
        departmentName: departments.departmentName,
      },
      status: {
        id: projectStatuses.id,
        name: projectStatuses.statusName,
      },
      projectType: {
        id: projectTypes.id,
        name: projectTypes.typeName,
      },
      owner: {
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
      },
      analyst: {
        userId: analysts.userId,
        firstName: analysts.firstName,
        lastName: analysts.lastName,
      },
    })
    .from(projects)
    .leftJoin(divisions, eq(projects.divisionId, divisions.divisionId))
    .leftJoin(departments, eq(divisions.departmentId, departments.departmentId))
    .leftJoin(projectStatuses, eq(projects.projectStatusId, projectStatuses.id))
    .leftJoin(projectTypes, eq(projects.projectTypeId, projectTypes.id))
    .leftJoin(users, eq(projects.userId, users.userId))
    .leftJoin(analysts, eq(projects.analystId, analysts.userId));
};

// Helper 2: Map ข้อมูลที่ Join มาแล้วให้อยู่ใน Format ที่ตรงกับ Zod Schema
const mapJoinedProject = (row: any) => {
  return {
    ...row.project,
    division: row.division?.id
      ? {
          id: row.division.id,
          name: row.division.name,
          departmentId: row.division.departmentId,
          departmentName: row.division.departmentName,
        }
      : null,
    status: row.status?.id ? row.status : null,
    projectType: row.projectType?.id ? row.projectType : null,
    owner: row.owner?.userId ? row.owner : null,
    analyst: row.analyst?.userId ? row.analyst : null
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

export const findAllProjects = async (user: UserContext, queryParams: any) => {
  const { page, limit, search, status, ownership } = queryParams;
  const offset = (page - 1) * limit;

  let query = getBaseProjectQuery();
  let countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(projects)
    .leftJoin(divisions, eq(projects.divisionId, divisions.divisionId)) as any;

  const conditions = [];
  const isAdmin =
    user.roles.includes("super_admin") || user.roles.includes("admin");

  // ==========================================
  // 1. กฎเหล็กความปลอดภัย (Security Baseline)
  // ==========================================
  if (!isAdmin) {
    // คนทั่วไปจะเห็นข้อมูลได้ใน 2 กรณีเท่านั้น:
    // 1. เป็นข้อมูลของแผนกตัวเอง (departmentId ตรงกัน)
    // 2. หรือเป็นข้อมูลที่ไม่ใช่ Draft (สถานะ > 1) ซึ่งสอดคล้องกับหน้า "All Projects"
    conditions.push(
      or(
        eq(divisions.departmentId, user.departmentId),
        ne(projects.projectStatusId, 1),
      ),
    );
  }

  // ==========================================
  // 2. ตัวกรองความเป็นเจ้าของ (Ownership Filter)
  // ==========================================
  if (ownership === "mine") {
    conditions.push(eq(projects.userId, user.userId));
  } else if (ownership === "team_only") {
    conditions.push(eq(divisions.departmentId, user.departmentId));
    conditions.push(ne(projects.userId, user.userId)); // ของทีม แต่ต้องไม่ใช่ของฉัน
  } else if (ownership === "team_and_mine") {
    conditions.push(eq(divisions.departmentId, user.departmentId));
  }

  // ==========================================
  // 3. ตัวกรองสถานะ (Status Filter)
  // ==========================================
  if (status === "draft") {
    conditions.push(eq(projects.projectStatusId, 1));
  } else if (status === "submitted" || status === "all_except_draft") {
    conditions.push(ne(projects.projectStatusId, 1));
  }

  // ==========================================
  // 4. ตัวกรองคำค้นหา (Search Filter)
  // ==========================================
  if (search) {
    conditions.push(
      or(
        ilike(projects.projectName, `%${search}%`),
        ilike(projects.projectCode, `%${search}%`),
      ),
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
    countQuery = countQuery.where(and(...conditions)) as any;
  }

  const [rows, [{ count }]] = await Promise.all([
    query.orderBy(desc(projects.createdAt)).limit(limit).offset(offset),
    countQuery,
  ]);

  return {
    data: rows.map(mapJoinedProject),
    pagination: {
      total: Number(count),
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(Number(count) / Number(limit)),
    },
  };
};

export const findProjectById = async (id: string, user: UserContext) => {
  const rows = await getBaseProjectQuery().where(eq(projects.id, id));
  if (!rows || rows.length === 0)
    throw new HTTPException(404, { message: "ไม่พบข้อมูลโครงการ" });

  const project = mapJoinedProject(rows[0]);

  // เช็คสิทธิ์การอ่าน
  checkPermission(user, "read", "project", {
    departmentId: project.division?.departmentId,
  });
  const attachments = await db
    .select({
      id: projectAttachments.id,
      projectId: projectAttachments.projectId,
      docTypeId: projectAttachments.docTypeId,
      docTypeName: projectAttachmentTypes.docTypeName,
      uploadedBy: projectAttachments.uploadedBy,
      fileName: projectAttachments.fileName,
      fileUrl: projectAttachments.fileUrl,
      fileType: projectAttachments.fileType,
      createdAt: projectAttachments.createdAt,
    })
    .from(projectAttachments)
    .leftJoin(projectAttachmentTypes, eq(projectAttachments.docTypeId, projectAttachmentTypes.id))
    .where(eq(projectAttachments.projectId, id))
    .orderBy(desc(projectAttachments.createdAt));

  return { ...project, attachments };
};

export const createProject = async (
  user: UserContext,
  data: CreateProjectDTO,
) => {
  await assertUserExists(user.userId);
  checkPermission(user, "create", "project", {
    departmentId: user.departmentId,
  });
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

export const updateProject = async (
  id: string,
  data: UpdateProjectDTO,
  user: UserContext,
) => {
  await assertUserExists(user.userId);
  const project = await findProjectById(id, user);

  // เช็คสิทธิ์การแก้ไข (ป้องกันการยิง API มาแก้โปรเจกต์แผนกอื่น)
  checkPermission(user, "update", "project", {
    departmentId: project.division?.departmentId,
  });

  await db
    .update(projects)
    .set({
      ...data,
      updatedBy: user.userId,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id));

  return await findProjectById(id, user);
};

export const updateProjectType = async (
  id: string,
  data: UpdateProjectTypeDTO,
  user: UserContext,
) => {
  const project = await findProjectById(id, user);
  checkPermission(user, "update", "project", {
    departmentId: project.division?.departmentId,
  });

  await db
    .update(projects)
    .set({
      projectTypeId: data.projectTypeId,
      updatedBy: user.userId,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id));

  return await findProjectById(id, user);
};

export const updateProjectStatus = async (
  id: string,
  data: UpdateProjectStatusDTO,
  user: UserContext,
) => {
  const project = await findProjectById(id, user);

  const isPrivileged = user.roles.some((role) => ["admin", "super_admin"].includes(role));
  const isSecretaryApproval =
    project.projectStatusId === PROJECT_STATUS.PENDING_SECRETARY &&
    data.projectStatusId === PROJECT_STATUS.PENDING_ASSIGNMENT;

  if (!isPrivileged && !user.roles.includes("secretary") && !user.roles.includes("analyst")) {
    throw new HTTPException(403, { message: "You do not have permission to change project status" });
  }
  if (!isPrivileged && user.roles.includes("secretary") && !isSecretaryApproval && project.projectStatusId !== PROJECT_STATUS.PENDING_SECRETARY) {
    throw new HTTPException(403, { message: "Secretary status actions are only available during Secretary review" });
  }
  if (!isPrivileged && user.roles.includes("analyst") && project.projectStatusId !== PROJECT_STATUS.IN_ANALYSIS) {
    throw new HTTPException(403, { message: "Analyst status actions are only available during analysis" });
  }
  if (isSecretaryApproval && data.projectTypeId !== 1 && data.projectTypeId !== 2) {
    throw new HTTPException(400, { message: "A Hardware or Software project type is required before approval" });
  }

  assertValidProjectTransition(project.projectStatusId, data.projectStatusId, data.remark);

  await db.transaction(async (tx) => {
    if (isSecretaryApproval) {
      await tx
        .update(projects)
        .set({ projectTypeId: data.projectTypeId })
        .where(eq(projects.id, id));
    }
    await applyProjectStatusTransition(tx, {
      projectId: id,
      userId: user.userId,
      oldStatusId: project.projectStatusId,
      newStatusId: data.projectStatusId,
      remark: data.remark,
    });
  });

  return await findProjectById(id, user);
};

export const assignProject = async (
  id: string,
  data: AssignProjectDTO,
  user: UserContext,
) => {
  const project = await findProjectById(id, user);

  if (!user.roles.includes("admin") && !user.roles.includes("super_admin")) {
    throw new HTTPException(403, { message: "ไม่มีสิทธิ์มอบหมายงาน" });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(projects)
      .set({
        analystId: data.analystId,
        assignedBy: user.userId,
        assignedAt: new Date(),
        updatedBy: user.userId,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id));

    if (project.projectStatusId === PROJECT_STATUS.PENDING_ASSIGNMENT) {
      await applyProjectStatusTransition(tx, {
        projectId: id,
        userId: user.userId,
        oldStatusId: PROJECT_STATUS.PENDING_ASSIGNMENT,
        newStatusId: PROJECT_STATUS.IN_ANALYSIS,
      });
    }
  });

  return await findProjectById(id, user);
};

export const removeProject = async (id: string, user: UserContext) => {
  const project = await findProjectById(id, user); // จะ Throw 404/403 หากหาไม่เจอหรือไม่มีสิทธิ์อ่าน

  // เช็คสิทธิ์ก่อนลบ
  checkPermission(user, "delete", "project", {
    departmentId: project.division?.departmentId,
    status: project.status?.id === 1 ? "draft" : "other_status", // 1 = draft
  });

  await db.delete(projects).where(eq(projects.id, id));
  return true;
};
