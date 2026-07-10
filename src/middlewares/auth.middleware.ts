// src/middlewares/auth.middleware.ts
import { verify } from 'hono/jwt';
import { getCookie } from 'hono/cookie';
import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { UserContext } from '../utils/permission.helper';
import type { Role } from '../config/permissions.config';

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  const cookieToken = getCookie(c, 'token');

  let token = cookieToken;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token) {
    throw new HTTPException(401, { message: 'Unauthorized: ไม่พบ Token ยืนยันตัวตน' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("❌ CRITICAL: process.env.JWT_SECRET is not defined!");
    throw new HTTPException(500, { message: 'Internal Server Error: ตรวจพบปัญหาการตั้งค่าระบบ' });
  }

  try {
    const decodedPayload = await verify(token, secret, 'HS256') as any;

    // ตรวจสอบและจัดรูปแบบข้อมูลผู้ใช้งานจาก Payload ของ JWT
    let userRoles: Role[] = [];
    if (Array.isArray(decodedPayload.roles)) {
      userRoles = decodedPayload.roles;
    } else if (typeof decodedPayload.role === 'string') {
      userRoles = [decodedPayload.role as Role];
    } else {
      userRoles = ['user']; // Default หากไม่มีการระบุสิทธิ์ใดๆ
    }

    const formattedUser: UserContext = {
      userId: decodedPayload.userId || decodedPayload.id,
      roles: userRoles, 
      divisionId: Number(decodedPayload.divisionId) || 0,
      departmentId: Number(decodedPayload.departmentId) || 0,
    };

    if (!formattedUser.userId) {
      throw new Error("Invalid payload: Missing User ID");
    }

    c.set('user', formattedUser);
    await next();
  } catch (error) {
    throw new HTTPException(401, { message: 'Unauthorized: Token ไม่ถูกต้องหรือหมดอายุ' });
  }
};