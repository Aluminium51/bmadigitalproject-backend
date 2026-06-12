import { Context } from 'hono';

export const handleDRegisterError = (c: Context, error: any) => {
  const errorString = String(error?.message || error?.detail || error).toLowerCase();

  // ดักจับข้อมูลซ้ำ
  if (error?.code === 'P2002' || error?.code === '23505' || errorString.includes('unique constraint')) {
    if (errorString.includes('email') || errorString.includes('user_email_key')) {
      return c.json({ error: 'อีเมลนี้มีผู้ใช้งานแล้ว', field: 'email' }, 409);
    }
    if (errorString.includes('username') || errorString.includes('user_username_key')) {
      return c.json({ error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว', field: 'username' }, 409);
    }
    return c.json({ error: 'ข้อมูลนี้มีอยู่ในระบบแล้ว' }, 409);
  }

  // ดักจับ Error อื่นๆ (เพิ่มได้ในอนาคต เช่น ข้อมูลยาวไป, ค้นหาไม่เจอ)
  console.error("🔥 Error ทั่วไป:", error);
  return c.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, 500);
};