// src/modules/auth/auth.controller.ts
import crypto from "crypto";
import { sendVerificationEmail } from "@/utils/email.service";
import { Context } from "hono";
import { db } from "@/db";
import { eq, or } from "drizzle-orm";
import { users } from "@/db/schema";
import { LoginRequestSchema } from "./auth.schema";
import { z } from "@hono/zod-openapi";
import { sign } from "hono/jwt";
import { deleteCookie } from "hono/cookie"; // Import ฟังก์ชันลบ Cookie

type LoginBody = z.infer<typeof LoginRequestSchema>;

export const login = async (c: Context, body: LoginBody) => {
  try {
    const { username: identifier, password } = body;

    const user = await db.query.users.findFirst({
      where: or(eq(users.username, identifier), eq(users.email, identifier)),
      with: {
        roles: { with: { role: true } },
        division: true,
      },
    });

    if (!user) {
      return c.json(
        { error: "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง", field: "credentials" },
        401,
      );
    }

    const isPasswordValid = await Bun.password.verify(password, user.password);
    if (!isPasswordValid) {
      return c.json(
        { error: "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง", field: "credentials" },
        401,
      );
    }

    if (!user.isVerified) {
      return c.json(
        { error: "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ", field: "general" },
        403,
      );
    }

    const userRoles =
      user.roles && user.roles.length > 0
        ? user.roles.map((ur: any) => ur.role.roleName.toLowerCase())
        : ["user"];

    const payload = {
      userId: user.userId,
      username: user.username,
      roles: userRoles,
      divisionId: user.divisionId,
      departmentId: user.division?.departmentId || 0,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    };

    const secret = process.env.JWT_SECRET;
    if (!secret)
      throw new Error("JWT_SECRET is not defined in environment variables");

    const token = await sign(payload, secret);

    return c.json(
      {
        message: "Login Successful",
        token: token,
        user: {
          userId: user.userId,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      },
      200,
    );
  } catch (error) {
    console.error("Login Error:", error);
    return c.json(
      { error: "เกิดข้อผิดพลาดในระบบเซิร์ฟเวอร์", field: "server" },
      500,
    );
  }
};

export const registerUser = async (c: Context) => {
  const body = await c.req.json();
  const verificationToken = crypto.randomUUID() + crypto.randomUUID();

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  // await db.insert(users).values({ ...body, verificationToken, verificationExpires: expiresAt, isVerified: false })
  await sendVerificationEmail(body.email, verificationToken, body.firstName);

  return c.json(
    {
      message: "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลของท่านเพื่อยืนยันตัวตน",
      requireVerification: true,
    },
    201,
  );
};

export const verifyEmail = async (c: Context) => {
  try {
    const token = c.req.query("token");

    if (!token) {
      return c.json({ error: "ไม่พบข้อมูล Token ยืนยัน", field: "token" }, 400);
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.verificationToken, token))
      .limit(1);

    if (!user) {
      return c.json(
        {
          error: "ลิงก์ยืนยันไม่ถูกต้อง หรือบัญชีนี้ได้รับการยืนยันไปแล้ว",
          field: "token",
        },
        400,
      );
    }

    if (user.verificationExpires && new Date() > user.verificationExpires) {
      return c.json(
        {
          error: "ลิงก์ยืนยันหมดอายุแล้ว กรุณาติดต่อผู้ดูแลระบบหรือสมัครใหม่",
          field: "token",
        },
        400,
      );
    }

    await db
      .update(users)
      .set({
        isVerified: true,
        verificationToken: null,
        verificationExpires: null,
      })
      .where(eq(users.userId, user.userId));

    return c.json(
      { message: "ยืนยันอีเมลสำเร็จ ตอนนี้คุณสามารถเข้าสู่ระบบได้แล้ว" },
      200,
    );
  } catch (error) {
    console.error("🔴 Verification API Crashed:", error);
    return c.json(
      { error: "เกิดข้อผิดพลาดภายในระบบเซิร์ฟเวอร์", field: "server" },
      500,
    );
  }
};

// เพิ่มฟังก์ชัน Logout
export const logout = async (c: Context) => {
  try {
    // ลบคุกกี้ด้วยค่า Configuration มาตรฐานเพื่อความปลอดภัย
    deleteCookie(c, "token", {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "Strict",
    });

    return c.json({ message: "ออกจากระบบสำเร็จ" }, 200);
  } catch (error) {
    console.error("Logout Error:", error);
    return c.json(
      { error: "เกิดข้อผิดพลาดในการออกจากระบบ", field: "server" },
      500,
    );
  }
};
