import { prisma } from '@/db/prisma';

export const verifyUser = async (username: string) => {
  return await prisma.user.findUnique({
    where: { username },
  });
};