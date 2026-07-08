import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

export const getUserId = (c: Context) => {
  const user = c.get("user");
  const userId = user?.userId
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized: Token อาจหมดอายุหรือไม่ถูกต้อง" });
  }
  return userId;
};