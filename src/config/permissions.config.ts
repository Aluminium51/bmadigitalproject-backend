// src/config/permissions.config.ts

export type Role = 'super_admin' | 'admin' | 'user';
export type Resource = 'project' | 'proposal' | 'proposal_draft' | 'user_management' | 'attachment' | 'meeting';
export type Action = 'create' | 'read' | 'update' | 'delete';

type PermissionMatrix = Record<Role, Partial<Record<Resource, Action[]>>>;

// ตารางกำหนดสิทธิ์พื้นฐาน (Role-Based Access Control)
export const permissionMatrix: PermissionMatrix = {
  super_admin: {
    project: ['create', 'read', 'update', 'delete'],
    proposal: ['create', 'read', 'update', 'delete'],
    proposal_draft: ['create', 'read', 'update', 'delete'],
    user_management: ['create', 'read', 'update', 'delete'],
    attachment: ['create', 'read', 'delete'],
    meeting: ['create', 'read', 'update', 'delete'],
  },
  admin: {
    project: ['create', 'read', 'update', 'delete'],
    proposal: ['create', 'read', 'update', 'delete'],
    proposal_draft: ['create', 'read', 'update', 'delete'],
    user_management: ['read'], // Admin สามารถดูได้อย่างเดียว จัดการไม่ได้
    attachment: ['create', 'read', 'delete'],
    meeting: ['create', 'read', 'update', 'delete'],
  },
  user: {
    project: ['create', 'read', 'update', 'delete'], // การลบจะถูกควบคุมด้วย Status ใน Helper
    proposal: ['create', 'read', 'update', 'delete'], // การลบจะถูกควบคุมด้วย Status ใน Helper
    proposal_draft: ['create', 'read', 'update', 'delete'], 
    user_management: [], // ไม่มีสิทธิ์เข้าถึงเลย
    attachment: ['create', 'read', 'delete'],
    meeting: ['read'], // สมมติให้ดูข้อมูลการประชุมได้อย่างเดียว
  },
};