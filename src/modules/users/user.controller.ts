// src/modules/users/user.controller.ts
import { Context } from 'hono';
import * as userService from './user.service';
import { sendVerificationEmail } from '@/utils/email.service';
import { handleRegisterError } from '@/utils/error-handler';

export const getUsers = async (c: Context) => {
  const users = await userService.getAllUsers();
  if (!users) {
    return c.json({ error: "ไม่พบข้อมูลผู้ใช้งานในระบบ" }, 404);
  }
  return c.json(users, 200);
};

// Handler สำหรับดึงข้อมูลโปรไฟล์ผู้ใช้รายบุคคล (เพิ่มใหม่)
export const getUserProfile = async (c: Context) => {
  const userId = c.req.param('userId');
  if (!userId) {
    return c.json({ error: "กรุณาระบุรหัสผู้ใช้งาน" }, 400);
  }

  const user = await userService.getUserProfile(userId);
  if (!user) {
    return c.json({ error: "ไม่พบข้อมูลผู้ใช้งานที่ระบุในระบบ" }, 404);
  }
  
  return c.json(user, 200);
};

export const createUser = async (c: Context, body: any) => {
  try {
    const newUser = await userService.createUser(body);
    
    await sendVerificationEmail(newUser.email, newUser.verificationToken!, newUser.firstName);

    return c.json({ 
      message: "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลของท่านเพื่อยืนยันตัวตน",
      requireVerification: true,
      user: newUser 
    }, 201);
    
  } catch (error: any) {
    return handleRegisterError(c, error);
  }
};