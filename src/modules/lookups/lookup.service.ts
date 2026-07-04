// src/modules/lookups/lookup.service.ts
import { db } from "../../db";
import { divisions, fourQuadrants, projectStatuses } from "../../db/schema"; 
import { appCache } from "../../utils/memory-cache";

// ตั้งเวลาให้ Cache จำข้อมูล Lookup นาน 24 ชั่วโมง (86400 วินาที)
const LOOKUP_TTL = 86400; 

export const getDivisionsLookup = async () => {
  return appCache.getOrSet(
    "lookup:divisions", // คีย์ของ Cache
    async () => {
      // โค้ดส่วนนี้จะทำงานแค่ "ครั้งแรก" ครั้งเดียว หรือตอนหมดอายุ
      console.log("Fetching divisions from DB..."); 
      return await db.select().from(divisions);
    },
    LOOKUP_TTL
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

export const getProjectStatusesLookup = async () => {
  return appCache.getOrSet(
    "lookup:projectStatuses",
    async () => {
      return await db.select().from(projectStatuses);
    },
    LOOKUP_TTL
  );
};