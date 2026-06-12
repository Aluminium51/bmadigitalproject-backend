// src/modules/users/user.controller.ts
import { Context } from 'hono';
import * as userService from './user.service';
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
    return c.json(newUser, 201);
    
  } catch (error: any) {
    return handleDRegisterError(c, error);
  }
};