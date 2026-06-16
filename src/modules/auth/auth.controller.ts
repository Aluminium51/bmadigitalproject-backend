// src/modules/auth/auth.controller.ts
import crypto from "crypto"; // สำหรับสร้าง token สุ่ม
import { sendVerificationEmail } from "@/utils/email.service";
import { Context } from "hono";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { LoginRequestSchema } from "./auth.schema";
import { z } from "@hono/zod-openapi";
import { sign } from "hono/jwt";

type LoginBody = z.infer<typeof LoginRequestSchema>;

// 🟢 1. ต้องเป็น export const และชื่อต้องเป็น "login" ตัวเล็กทั้งหมด
// 🟢 2. รับพารามิเตอร์ 2 ตัว คือ (c, body) เพื่อให้สอดคล้องกับที่ Route ส่งมา
export const login = async (c: Context, body: LoginBody) => {
  try {
    const { username, password } = body;

    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

// 🟢 1. ถ้าไม่พบ User
    if (!user) {
      return c.json({ 
        error: "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง", 
        field: "credentials"
      }, 401);
    }

    // 🟢 2. ถ้ารหัสผ่านไม่ตรง
    const isPasswordValid = await Bun.password.verify(password, user.password);
    if (!isPasswordValid) {
      return c.json({ 
        error: "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง", 
        field: "credentials" 
      }, 401);
    }

    if (!user.isVerified) {
      return c.json({ 
        error: "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ", 
        field: "general" 
      }, 403);
    }

    // 🟢 2. โค้ดส่วนสร้าง JWT ของจริง!
    // Payload คือ "ไส้ใน" ของ Token ที่เราต้องการให้หน้าบ้านรู้
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role, // เอาไว้ให้หน้าบ้านเช็คสิทธิ์ (Admin / User)
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // กำหนดหมดอายุใน 24 ชั่วโมง (เวลาปัจจุบัน + 86400 วินาที)
    };
    
    // ดึง Secret Key จาก .env (ถ้าไม่มีให้ระเบิดตัวเอง)
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is not defined in environment variables");

    // สร้าง Token ด้วยฟังก์ชัน sign()
    const token = await sign(payload, secret);

    // 🟢 3. ส่ง Token ของจริงที่ได้ กลับไปให้ Frontend
    return c.json({
      message: "Login Successful",
      token: token, // ตรงนี้จะกลายเป็นตัวอักษรขยุกขยิกยาวๆ ตามมาตรฐาน JWT แล้ว!
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
  try {
    // อ่านค่า token จาก URL query (เช่น ?token=xxxx)
    const token = c.req.query("token");
    
    if (!token) {
      return c.json({ error: "ไม่พบข้อมูล Token ยืนยัน" }, 400);
    }

    // 🔍 ปรับมาใช้ db.select() แบบมาตรฐาน (ลดโอกาสพังจากเรื่อง Schema configuration)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.verificationToken, token))
      .limit(1);

    // ❌ กรณีที่ 1: หาตัว Token นี้ไม่เจอในระบบ
    if (!user) {
      return c.json({ error: "ลิงก์ยืนยันไม่ถูกต้อง หรือบัญชีนี้ได้รับการยืนยันไปแล้ว" }, 400);
    }

    // ❌ กรณีที่ 2: ลิงก์หมดอายุ (เกิน 24 ชั่วโมง)
    if (user.verificationExpires && new Date() > user.verificationExpires) {
      return c.json({ error: "ลิงก์ยืนยันหมดอายุแล้ว กรุณาติดต่อผู้ดูแลระบบหรือสมัครใหม่" }, 400);
    }

    // ✅ ผ่านทุกเงื่อนไข -> ทำการอัปเดตสถานะในฐานข้อมูล
    await db
      .update(users)
      .set({
        isVerified: true,
        verificationToken: null,     // ลบออกเพื่อไม่ให้ใช้ซ้ำได้อีก
        verificationExpires: null,   // ลบวันหมดอายุออก
      })
      .where(eq(users.id, user.id));

    return c.json({ message: "ยืนยันอีเมลสำเร็จ ตอนนี้คุณสามารถเข้าสู่ระบบได้แล้ว" }, 200);

  } catch (error) {
    // 💡 พิมพ์บอกใน Terminal เสมอว่าเซิร์ฟเวอร์พังเพราะอะไร
    console.error("🔴 Verification API Crashed:", error);
    return c.json({ error: "เกิดข้อผิดพลาดภายในระบบเซิร์ฟเวอร์" }, 500);
  }
};