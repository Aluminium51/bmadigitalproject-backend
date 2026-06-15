// src/modules/users/user.service.ts
import { db } from "@/db";
import { users } from "@/db/schema";

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

  // ใน Drizzle เราใส่คำสั่ง .returning() เพื่อให้มันส่ง Object แถวที่เพิ่มเข้ากลับมาให้เราใช้ต่อได้ทันที
  const [newUser] = await db
    .insert(users)
    .values({
      ...restData,
      password: hashedPassword,
    })
    .returning();

  return newUser;
};
