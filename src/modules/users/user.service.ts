// src/modules/users/user.service.ts
import { prisma } from '@/db/prisma';

export const getAllUsers = async () => {
  return await prisma.user.findMany({ /* ... */ });
};

export const createUser = async (data: any) => {
  // 1. ดึง password ออกมาจาก data
  const { password, ...restData } = data;

  // 2. เข้ารหัสผ่านด้วย Bun.password.hash (ค่าเริ่มต้นคือ Argon2id ซึ่งปลอดภัยมาก)
  const hashedPassword = await Bun.password.hash(password);

  // 3. ประกอบร่างข้อมูลกลับเข้าไปแล้วค่อยบันทึก
  return await prisma.user.create({ 
    data: {
      ...restData,
      password: hashedPassword 
    } 
  });
};