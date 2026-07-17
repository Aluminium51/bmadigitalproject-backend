// src/modules/users/user.controller.ts
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import * as userService from "./user.service";
import { sendVerificationEmail } from "@/utils/email.service";
import { handleRegisterError } from "@/utils/error-handler";
import type { UserListQuery } from "./user.service";

export const getUsers = async (c: Context, query: UserListQuery) => {
  const result = await userService.getUsersPage(query);
  if (!result) {
    throw new HTTPException(404, { message: "ไม่พบข้อมูลผู้ใช้งานในระบบ" });
  }
  return c.json(result, 200);
};

export const getUserProfile = async (c: Context, userId: string) => {
  const user = await userService.getUserProfile(userId);
  if (!user) {
    throw new HTTPException(404, { message: "ไม่พบข้อมูลผู้ใช้งานที่ระบุในระบบ" });
  }

  return c.json(user, 200);
};

export const createUser = async (c: Context, body: any) => {
  try {
    const newUser = await userService.createUser(body);

    await sendVerificationEmail(
      newUser.email,
      newUser.verificationToken!,
      newUser.firstName,
    );

    return c.json(
      {
        message:
          "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลของท่านเพื่อยืนยันตัวตน",
        requireVerification: true,
        user: newUser,
      },
      201,
    );
  } catch (error: any) {
    return handleRegisterError(c, error);
  }
};
