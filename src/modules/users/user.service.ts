// src/modules/users/user.service.ts
import { prisma } from '@/db/prisma';
// หมายเหตุ: ในการใช้งานจริง ต้องนำ bcrypt/argon2 มา hash password ด้วยเสมอ
// import { hash } from 'argon2'; 

export const createUser = async (data: any) => {
  // const hashedPassword = await hash(data.password);
  
  return await prisma.user.create({
    data: {
      ...data,
      // password: hashedPassword,
    },
  });
};

export const getAllUsers = async () => {
  return await prisma.user.findMany({
    select: { // เลือกเฉพาะฟิลด์ที่ปลอดภัยส่งกลับไป (ไม่ส่ง password)
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      department: true,
      role: true,
    },
  });
};