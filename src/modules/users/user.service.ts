// src/modules/users/user.service.ts
import { db } from "@/db";
import { users, roleUsers } from "@/db/schema/users";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { v7 as uuidv7 } from "uuid";

// ฟังก์ชันช่วยจัดรูปแบบข้อมูล (Mapping Helper) แปลงข้อมูลที่ Join มาให้แบนราบตาม Zod
const mapUserToResponse = (user: any) => ({
  userId: user.userId,
  username: user.username,
  firstName: user.firstName,
  lastName: user.lastName,
  position: user.position,
  email: user.email,
  divisionName: user.division?.divisionName ?? "",
  departmentName: user.division?.department?.departmentName ?? "",
  roles: user.roles?.map((ur: any) => ur.role?.roleName).filter(Boolean) ?? []
});

// ดึงรายชื่อผู้ใช้งานทั้งหมด พร้อมข้อมูลหน่วยงานและสิทธิ์
export const getAllUsers = async () => {
  const result = await db.query.users.findMany({
    with: {
      division: {
        with: { department: true }
      },
      roles: {
        with: { role: true }
      }
    }
  });
  return result.map(mapUserToResponse);
};

// ดึงโปรไฟล์ผู้ใช้งานรายบุคคล
export const getUserProfile = async (userId: string) => {
  const result = await db.query.users.findFirst({
    where: eq(users.userId, userId),
    with: {
      division: {
        with: { department: true }
      },
      roles: {
        with: { role: true }
      }
    }
  });
  
  if (!result) return null;
  return mapUserToResponse(result);
};

// สร้างผู้ใช้งานใหม่
export const createUser = async (data: any) => {
  const { password, roleIds = [1], ...restData } = data; // แกะรหัสผ่าน และกลุ่มรหัสสิทธิ์ (Default: 1 ย่อมาจาก USER)

  const hashedPassword = await Bun.password.hash(password);

  const verificationToken = crypto.randomUUID() + crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  // ใช้ Transaction ควบคุม: ถ้าบันทึก User ผ่าน แต่บันทึกสิทธิ์ Role พัง ระบบจะยกเลิกทั้งหมด (Rollback) เพื่อความปลอดภัย
  return await db.transaction(async (tx) => {
    // 1. บันทึกข้อมูลหลักของผู้ใช้ลงตาราง users
    const newUserId = uuidv7();
    const [newUser] = await tx
      .insert(users)
      .values({
        userId: newUserId,
        username: restData.username,
        firstName: restData.firstName,
        lastName: restData.lastName,
        email: restData.email,
        position: restData.position,
        divisionId: restData.divisionId, // เปลี่ยนมารับค่าเป็น ID ตัวเลขแทนข้อความธรรมดา
        mobilePhone: restData.mobilePhone,
        officePhone: restData.officePhone,
        internalExtension: restData.internalExtension,
        password: hashedPassword,
        verificationToken: verificationToken,
        verificationExpires: expiresAt,
        isVerified: false
      })
      .returning();

    // 2. บันทึกความเชื่อมโยงสิทธิ์ลงตาราง Many-to-Many (role_user)
    if (roleIds && roleIds.length > 0) {
      const roleInserts = roleIds.map((roleId: number) => ({
        userId: newUser.userId,
        roleId: roleId,
      }));
      await tx.insert(roleUsers).values(roleInserts);
    }

    return newUser;
  });
};