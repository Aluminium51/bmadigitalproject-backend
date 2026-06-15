// src/modules/users/user.controller.ts
import { Context } from 'hono';
import * as userService from './user.service';
import { sendVerificationEmail } from '@/utils/email.service';
import { handleDRegisterError } from '@/utils/error-handler';

// Handler สำหรับดึงข้อมูลผู้ใช้ทั้งหมด
export const getUsers = async (c: Context) => {
  const users = await userService.getAllUsers();
  return c.json(users, 200);
};

// Handler สำหรับสร้างผู้ใช้ใหม่ (พร้อมดัก Error)
export const createUser = async (c: Context, body: any) => {
  try {
    const newUser = await userService.createUser(body);
    
    // 🟢 2. สั่งส่งอีเมลหาผู้ใช้ โดยใช้ข้อมูลจาก newUser
    await sendVerificationEmail(newUser.email, newUser.verificationToken!, newUser.firstName);

    // 🟢 3. เปลี่ยนข้อความตอบกลับ เพื่อให้หน้าบ้านรู้ว่าต้องไปเช็คอีเมล
    return c.json({ 
      message: "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลของท่านเพื่อยืนยันตัวตน",
      requireVerification: true,
      user: newUser 
    }, 201);
    
  } catch (error: any) {
    return handleDRegisterError(c, error);
  }
};