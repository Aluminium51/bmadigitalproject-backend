// src/modules/auth/auth.service.ts
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { appCache } from "../../utils/memory-cache";

export const verifyUser = async (username: string) => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username));
  return result[0];
};

// export const getRolePermissions = async (roleId: number) => {
//   // สมมติใช้เวลา Cache 1 ชั่วโมง
//   return appCache.getOrSet(
//     `rbac:role:${roleId}`,
//     async () => {
//       const result = await db.select()
//         .from(permissions)
//         .where(eq(permissions.roleId, roleId));
      
//       // แปลงข้อมูลจากตารางให้เป็น Array ของชื่อสิทธิ์ ['CREATE_PROJECT', 'EDIT_PROJECT']
//       return result.map(p => p.action); 
//     },
//     3600 
//   );
// };