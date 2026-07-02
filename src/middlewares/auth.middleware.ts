// src/middlewares/auth.middleware.ts
import { verify } from 'hono/jwt';
import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

export const authMiddleware = async (c: Context, next: Next) => {
  // ดึงค่า Authorization จาก Header
  const authHeader = c.req.header('Authorization');

  // เช็คว่าส่งมาไหม และมีคำว่า "Bearer " นำหน้าหรือเปล่า
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Unauthorized: ไม่พบ Token หรือรูปแบบไม่ถูกต้อง' });
  }

  // เอาเฉพาะตัว Token (ตัดคำว่า Bearer ออก)
  const token = authHeader.split(' ')[1];

  try {
    // ถอดรหัส Token 
    // หมายเหตุ: ต้องใช้ JWT_SECRET ตัวเดียวกันกับที่คุณใช้สร้าง Token ในหน้า Login
    const secret = process.env.JWT_SECRET || 'your-secret-key'; // เปลี่ยนให้ตรงกับโปรเจกต์คุณ
    
    const decodedPayload = await verify(token, secret, 'HS256');

    // 5. นำ Payload ที่แกะได้ (เช่น id, username) ไปฝากไว้ใน Context ของ Hono
    // เพื่อให้ Controller สามารถดึงไปใช้ต่อได้ผ่าน c.get('user')
    c.set('user', decodedPayload);

    // 6. ให้ทำงานใน Route/Controller ลำดับถัดไป
    await next();
  } catch (error) {
    // Token หมดอายุ หรือ Secret ไม่ตรงกัน
    throw new HTTPException(401, { message: 'Unauthorized: Token ไม่ถูกต้องหรือหมดอายุ' });
  }
};