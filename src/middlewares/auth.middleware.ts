// src/middlewares/auth.middleware.ts
import { verify } from 'hono/jwt';
import { getCookie } from 'hono/cookie';
import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { UserContext } from '../utils/permission.helper'; // 👉 Import type มาใช้

export const authMiddleware = async (c: Context, next: Next) => {
  // 1. ดึงค่า Token จาก Header หรือ Cookie
  const authHeader = c.req.header('Authorization');
  const cookieToken = getCookie(c, 'token');

  let token = cookieToken;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7); // ใช้ substring(7) จะ Clean และเร็วกว่า split(' ')[1]
  }

  // 2. ถ้าหา Token ไม่เจอเลย ให้ปฏิเสธการเข้าถึง
  if (!token) {
    throw new HTTPException(401, { message: 'Unauthorized: ไม่พบ Token ยืนยันตัวตน' });
  }

  // 3. ตรวจสอบ Environment Variable
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("❌ CRITICAL: process.env.JWT_SECRET is not defined!");
    throw new HTTPException(500, { message: 'Internal Server Error: ตรวจพบปัญหาการตั้งค่าระบบ' });
  }

  try {
    // 4. ถอดรหัส Token
    const decodedPayload = await verify(token, secret, 'HS256') as any;

    // 5. จัดรูปแบบข้อมูลผู้ใช้งานให้ตรงกับ `UserContext` สำหรับใช้ตรวจสอบสิทธิ์
    const formattedUser: UserContext = {
      userId: decodedPayload.userId || decodedPayload.id,
      role: decodedPayload.role || 'user',       // Default ป้องกัน Token เก่าที่ไม่มี role
      divisionId: Number(decodedPayload.divisionId) || 0, // แปลงเป็น Number เสมอ
    };

    // ป้องกันกรณี Token โครงสร้างผิดปกติจนแกะ ID ไม่ออก
    if (!formattedUser.userId) {
      throw new Error("Invalid payload: Missing User ID");
    }

    // 6. นำ Payload ไปฝากไว้ใน Context
    c.set('user', formattedUser);

    // 7. ส่งต่อให้ Route/Controller ถัดไป
    await next();
  } catch (error) {
    // จะตกมาที่นี่ถ้า Token หมดอายุ (exp), ลายเซ็นไม่ตรง (invalid signature), หรือแกะข้อมูลไม่ได้
    throw new HTTPException(401, { message: 'Unauthorized: Token ไม่ถูกต้องหรือหมดอายุ' });
  }
};