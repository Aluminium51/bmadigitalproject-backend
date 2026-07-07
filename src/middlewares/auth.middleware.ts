// src/middlewares/auth.middleware.ts
import { verify } from 'hono/jwt';
import { getCookie } from 'hono/cookie';
import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

export const authMiddleware = async (c: Context, next: Next) => {
  // 1. ดึงค่า Authorization จาก Header
  const authHeader = c.req.header('Authorization');
  const cookieToken = getCookie(c, 'token');

  // 2. เช็คว่าส่งมาไหม และมีคำว่า "Bearer " นำหน้าหรือเปล่า
  if ((!authHeader || !authHeader.startsWith('Bearer ')) && !cookieToken) {
    throw new HTTPException(401, { message: 'Unauthorized: ไม่พบ Token หรือรูปแบบไม่ถูกต้อง' });
  }

  // 3. เอาเฉพาะตัว Token (ตัดคำว่า Bearer ออก)
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : cookieToken;

  if (!token) {
    throw new HTTPException(401, { message: 'Unauthorized: ไม่พบ Token หรือรูปแบบไม่ถูกต้อง' });
  }

  // 4. ดึง JWT_SECRET และบังคับว่าต้องตั้งค่าในระบบเสมอก่อนใช้งาน
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("❌ CRITICAL INSECURE WARNING: process.env.JWT_SECRET is not defined!");
    throw new HTTPException(500, { message: 'Internal Server Error: ตรวจพบปัญหาการตั้งค่าระบบรักษาความปลอดภัย' });
  }

  try {
    // 5. ถอดรหัส Token
    const decodedPayload = await verify(token, secret, 'HS256');

    const formattedUser = {
      ...decodedPayload,
      id: decodedPayload.id || decodedPayload.userId,
      userId: decodedPayload.userId || decodedPayload.id
    };

    // 6. นำ Payload ไปฝากไว้ใน Context ของ Hono
    c.set('user', formattedUser);

    // 7. ให้ทำงานใน Route/Controller ลำดับถัดไป
    await next();
  } catch (error) {
    // Token หมดอายุ, โครงสร้างเบี้ยว หรือ Secret ไม่ตรงกัน
    throw new HTTPException(401, { message: 'Unauthorized: Token ไม่ถูกต้องหรือหมดอายุ' });
  }
};
