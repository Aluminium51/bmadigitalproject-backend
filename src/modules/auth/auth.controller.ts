import { Context } from 'hono';
import { sign } from 'hono/jwt';
import * as authService from './auth.service';

export const login = async (c: Context, body: any) => {
  try {
    const { username, password } = body;

    const user = await authService.verifyUser(username);
    
    // 🟢 1. ตรวจสอบรวบยอด: ถ้าไม่มี user หรือ รหัสผิด ให้เตะออกด้วยข้อความเดียวกัน
    if (!user || !(await Bun.password.verify(password, user.password))) {
      // ไม่ระบุ field เพื่อให้หน้าบ้านโชว์แถบแดงรวมๆ 
      return c.json({ error: 'ชื่อผู้ใช้งาน หรือ รหัสผ่านไม่ถูกต้อง' }, 401);
    }

    // สร้าง Token ตามปกติ
    const payload = {
      sub: user.id,
      username: user.username,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    };
    
    const token = await sign(payload, process.env.JWT_SECRET || 'secret');

    return c.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user: { 
        id: user.id, 
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName
      }
    }, 200);

  } catch (error) {
    // This section are errors from database or unexpected issues
    console.error("🔥 Login Error:", error);
    return c.json({ error: 'ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง' }, 500);
  }
};