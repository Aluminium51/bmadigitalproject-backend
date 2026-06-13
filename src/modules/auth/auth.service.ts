// src/modules/auth/auth.service.ts
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const verifyUser = async (username: string) => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username));
  return result[0];
};
