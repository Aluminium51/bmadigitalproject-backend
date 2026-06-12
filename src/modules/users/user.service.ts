// src/modules/users/user.service.ts
import { prisma } from '@/db/prisma';

export const getAllUsers = async () => {
  return await prisma.user.findMany({ /* ... */ });
};

export const createUser = async (data: any) => {
  // Logic การ Hash รหัสผ่านจะอยู่ที่นี่
  return await prisma.user.create({ data });
};