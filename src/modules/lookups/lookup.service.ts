// src/modules/lookups/lookup.service.ts
import { db } from "../../db";
import { divisions, fourQuadrants, deputyGovernors, projectStatuses, departments, roles } from "../../db/schema";
import { asc } from "drizzle-orm";
import { appCache } from "../../utils/memory-cache";

// ตั้งเวลาให้ Cache จำข้อมูล Lookup นาน 24 ชั่วโมง (86400 วินาที)
const LOOKUP_TTL = 86400;

export const getDivisionsLookup = async (departmentId?: number) => {
  // 1. ดึงข้อมูล Divisions ทั้งหมด (จาก Cache ก่อน ถ้าไม่มีค่อยลง DB)
  const allDivisions = await appCache.getOrSet(
    "lookup:divisions",
    async () => {
      console.log("Fetching divisions from DB...");
      const result = await db.select().from(divisions);

      // แปลง Key เป็น id และ name เพื่อให้ FormCombobox ใน Frontend เอาไปใช้ได้ทันที
      return result.map(div => ({
        id: div.divisionId,
        name: div.divisionName,
        departmentId: div.departmentId
      }));
    },
    LOOKUP_TTL
  );

  // 2. ถ้ามีการส่ง departmentId มา ให้กรองเฉพาะส่วนราชการที่อยู่ในหน่วยงานนั้น
  if (departmentId) {
    return allDivisions.filter(div => div.departmentId === departmentId);
  }

  // 3. ถ้าไม่มีการส่งมา (เช่น ตอนโหลดครั้งแรก) ให้คืนค่าทั้งหมด
  return allDivisions;
};

export const getDepartmentsLookup = async () => {
  return appCache.getOrSet(
    "lookup:departments",
    async () => {
      console.log("Fetching departments from DB...");
      const result = await db.select().from(departments);

      // แปลง Key ให้เป็น id และ name เพื่อให้ตรงกับ LookupItemSchema
      // และตรงกับที่ Frontend (FormCombobox) คาดหวังว่าจะได้รับ
      return result.map(dept => ({
        id: dept.departmentId,
        name: dept.departmentName
      }));
    },
    LOOKUP_TTL
  );
};

export const getRolesLookup = async () => {
  return appCache.getOrSet(
    "lookup:roles",
    async () => {
      console.log("Fetching roles from DB...");
      const result = await db.select({ id: roles.roleId, name: roles.roleName })
        .from(roles)
        .orderBy(asc(roles.roleName));

      return result;
    },
    LOOKUP_TTL,
  );
};

export const getFourQuadrantsLookup = async () => {
  return appCache.getOrSet(
    "lookup:fourQuadrants",
    async () => {
      console.log("Fetching fourQuadrants from DB...");
      return await db.select().from(fourQuadrants);
    },
    LOOKUP_TTL
  );
};

export const getDeputyGovernorsLookup = async () => {
  return appCache.getOrSet(
    "lookup:deputyGovernors",
    async () => {
       console.log("Fetching deputyGovernors from DB...");
      return await db.select().from(deputyGovernors);    },
    LOOKUP_TTL
  );
};

export const getProjectStatusesLookup = async () => {
  return appCache.getOrSet(
    "lookup:projectStatuses",
    async () => {
      return await db.select().from(projectStatuses);
    },
    LOOKUP_TTL
  );
};
