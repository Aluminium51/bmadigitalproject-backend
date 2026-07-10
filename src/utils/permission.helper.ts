// src/utils/permission.helper.ts
import { HTTPException } from "hono/http-exception";
import { permissionMatrix, Role, Resource, Action } from "../config/permissions.config";

export interface UserContext {
  userId: string;
  role: Role;
  divisionId: number;
}

export interface ResourceData {
  divisionId?: number;
  status?: string;
}

/**
 * ฟังก์ชันกลางสำหรับตรวจสอบสิทธิ์การเข้าถึงและการจัดการข้อมูล
 * @param user ข้อมูลผู้ใช้งานปัจจุบัน (ดึงจาก JWT)
 * @param action การกระทำ (create, read, update, delete)
 * @param resource ประเภทของข้อมูล (project, proposal, ฯลฯ)
 * @param resourceData (Optional) ข้อมูลเฉพาะของรายการนั้นๆ เช่น แผนกเจ้าของ, สถานะปัจจุบัน
 */
export const checkPermission = (
  user: UserContext,
  action: Action,
  resource: Resource,
  resourceData?: ResourceData
): boolean => {
  // 1. ตรวจสอบสิทธิ์ระดับ Role (RBAC) จาก Matrix
  const allowedActions = permissionMatrix[user.role]?.[resource] || [];
  if (!allowedActions.includes(action)) {
    throw new HTTPException(403, { 
      message: `Forbidden: บทบาท ${user.role} ไม่มีสิทธิ์ ${action} ข้อมูลประเภท ${resource}` 
    });
  }

  // 2. ข้ามการตรวจสอบเงื่อนไขเชิงลึก หากผู้ใช้งานเป็น Admin หรือ Super Admin
  if (user.role === 'super_admin' || user.role === 'admin') {
    return true;
  }

  // 3. ตรวจสอบเงื่อนไขเชิงลึก (ABAC) สำหรับผู้ใช้งานทั่วไป (User)
  if (resourceData) {
    
    // กฎที่ 1: การจัดการข้อมูลข้ามแผนก (Cross-Division Access)
    // หากข้อมูลมี divisionId กำกับไว้ ผู้ใช้จะต้องอยู่แผนกเดียวกันเท่านั้น
    if (resourceData.divisionId && resourceData.divisionId !== user.divisionId) {
      throw new HTTPException(403, { 
        message: "Forbidden: คุณไม่มีสิทธิ์เข้าถึงหรือจัดการข้อมูลของหน่วยงานอื่น" 
      });
    }

    // กฎที่ 2: เงื่อนไขการลบข้อมูลสำคัญ (Project และ Proposal)
    if (action === 'delete') {
      if (resource === 'project' || resource === 'proposal') {
        // ต้องมีสถานะเป็น 'draft' เท่านั้น ถึงจะอนุญาตให้ลบได้
        if (resourceData.status !== 'draft') {
          throw new HTTPException(403, { 
            message: "Forbidden: ไม่สามารถลบข้อมูลที่ถูกยื่นเสนอหรือดำเนินการไปแล้วได้ (อนุญาตเฉพาะสถานะ Draft)" 
          });
        }
      }
      // หมายเหตุ: สำหรับ 'proposal_draft' จะผ่านเงื่อนไขนี้ไปได้เลย (ลบได้เสมอหากอยู่แผนกเดียวกัน)
    }
  }

  return true; // ผ่านการตรวจสอบทุกเงื่อนไข
};