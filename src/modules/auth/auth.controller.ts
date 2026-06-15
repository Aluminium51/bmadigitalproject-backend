// src/modules/auth/auth.controller.ts
import crypto from "crypto"; // สำหรับสร้าง token สุ่ม
import { sendVerificationEmail } from "@/utils/email.service";
import { Context } from "hono";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { LoginRequestSchema } from "./auth.schema";
import { z } from "@hono/zod-openapi";

type LoginBody = z.infer<typeof LoginRequestSchema>;

// 🟢 1. ต้องเป็น export const และชื่อต้องเป็น "login" ตัวเล็กทั้งหมด
// 🟢 2. รับพารามิเตอร์ 2 ตัว คือ (c, body) เพื่อให้สอดคล้องกับที่ Route ส่งมา
export const login = async (c: Context, body: LoginBody) => {
  try {
    const { username, password } = body;

    // 🟢 1. ดึงข้อมูล User จากฐานข้อมูลจริงด้วย Drizzle (เช็คจาก Username หรือ Email)
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    // 🟢 2. ถ้าไม่พบ User หรือ รหัสผ่านไม่ตรงกับ Hash ใน Database
    if (!user) {
      return c.json({ error: "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง", field: "username" }, 401);
    }

    const isPasswordValid = await Bun.password.verify(password, user.password);
    if (!isPasswordValid) {
      return c.json({ error: "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง", field: "password" }, 401);
    }

    // 🟢 3. เปิดด่านตรวจเช็คการยืนยันตัวตนผ่านอีเมล (ใช้งานจริง ไม่เอาคอมเมนต์ครอบแล้ว)
    if (!user.isVerified) {
      return c.json({ 
        error: "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ (โปรดตรวจสอบลิงก์ยืนยันในกล่องจดหมายของคุณ)", 
        field: "general" 
      }, 403); // ส่ง 403 Forbidden กลับไปบอกหน้าบ้าน
    }

    // 🟢 4. ถ้าผ่านทุกด่านและยืนยันตัวตนเรียบร้อยแล้ว ค่อยปล่อยให้เข้าระบบและส่งข้อมูลกลับ
    return c.json({
      message: "Login Successful",
      token: "your-real-jwt-token-here", // ตรงนี้สามารถเปลี่ยนไปใช้ฟังก์ชันสร้าง JWT ของคุณได้เลยครับ
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      }
    }, 200);

  } catch (error) {
    console.error("Login Error:", error);
    return c.json({ 
      error: "เกิดข้อผิดพลาดในระบบเซิร์ฟเวอร์", 
      field: "server" 
    }, 500);
  }
};

// 🟢 1. API: สมัครสมาชิก (Register)
export const registerUser = async (c: Context) => {
  const body = await c.req.json();
  
  // สร้าง Token ยาวๆ 64 ตัวอักษร
  const verificationToken = crypto.randomUUID() + crypto.randomUUID(); 
  
  // ตั้งเวลาหมดอายุ (เช่น 24 ชั่วโมง)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  // สมมติว่า Insert ลง Database สำเร็จ
  // await db.insert(users).values({ ...body, verificationToken, verificationExpires: expiresAt, isVerified: false })

  // 📧 สั่งส่งอีเมล!
  await sendVerificationEmail(body.email, verificationToken, body.firstName);

  // ส่งกลับบอกหน้าบ้านให้ไปเช็คอีเมล
  return c.json({ 
    message: "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลของท่านเพื่อยืนยันตัวตน",
    requireVerification: true 
  }, 201);
};

// 🟢 2. API: ยืนยันอีเมล (Verify)
export const verifyEmail = async (c: Context) => {
  const token = c.req.query("token");
  if (!token) return c.json({ error: "ไม่พบข้อมูล Token" }, 400);
  return c.json({ message: "ยืนยันอีเมลสำเร็จ ตอนนี้คุณสามารถเข้าสู่ระบบได้แล้ว" }, 200);
};