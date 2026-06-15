// src/modules/users/user.service.ts
import { db } from "@/db";
import { users } from "@/db/schema";
import crypto from "crypto";

export const getAllUsers = async () => {
  // แทน prisma.user.findMany()
  return await db
    .select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      department: users.department,
      role: users.role,
    })
    .from(users);
};

export const createUser = async (data: any) => {
  const { password, ...restData } = data;

  // เข้ารหัสผ่านด้วย Bun
  const hashedPassword = await Bun.password.hash(password);

  // token สำหรับยืนยัน gmail (ในอนาคตอาจใช้สำหรับรีเซ็ตรหัสผ่านด้วย)
  const verificationToken = crypto.randomUUID() + crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  // บันทึกข้อมูลลง Database พร้อม Token
  const [newUser] = await db
    .insert(users)
    .values({
      ...restData,
      password: hashedPassword,
      verificationToken: verificationToken, // เก็บ Token
      verificationExpires: expiresAt,       // เก็บเวลาหมดอายุ
      isVerified: false                     // บังคับว่ายังไม่ได้ยืนยัน
    })
    .returning();

  return newUser;
};
