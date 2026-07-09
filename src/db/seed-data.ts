// src/db/seed-data.ts

export const seedData = {
  departments: [
    { departmentId: 1, departmentName: "สำนักดิจิทัล" },
    { departmentId: 2, departmentName: "สำนักยุทธศาสตร์และประเมินผล" }
  ],

  divisions: [
    { divisionId: 1, divisionName: "กองยุทธศาสตร์ดิจิทัล", departmentId: 1 },
    { divisionId: 2, divisionName: "กองพัฒนาระบบคอมพิวเตอร์", departmentId: 1 }
  ],

  roles: [
    { roleId: 1, roleName: "USER" },
    { roleId: 2, roleName: "ANALYST" },
    { roleId: 3, roleName: "SECRETARY" },
    { roleId: 4, roleName: "ADMIN" },
    { roleId: 5, roleName: "SUPER_ADMIN" }
  ],

  projectTypes: [
    { id: 1, typeName: "Hardware" },
    { id: 2, typeName: "Software" },
  ],

  fourQuadrants: [
    { id: 1, name: "Q1: เพิ่มประสิทธิภาพ" },
    { id: 2, name: "Q2: งานประจำที่บริการประชาชน" },
    { id: 3, name: "Q3: งานหลังบ้านที่เป็นงานใหม่" },
    { id: 4, name: "Q4: ยุทธศาสตร์ / งานอนาคต" }
  ],

  deputyGovernors: [
    { id: 1, name: "รองผู้ว่าฯ ด้านบริหาร" },
    { id: 2, name: "รองผู้ว่าฯ ด้านเศรษฐกิจ" },
    { id: 3, name: "รองผู้ว่าฯ ด้านสังคม" },
    { id: 4, name: "รองผู้ว่าฯ ด้านสิ่งแวดล้อม" }
  ],

  adminUser: {
    username: "super_admin",
    firstName: "System",
    lastName: "Administrator",
    email: "admin@system.com",
    rawPassword: "password123",
    roleId: 5 // ผูกกับ roleId: 5 (SUPER_ADMIN)
  },

  projectStatuses: [
    { id: 1, statusName: "Draft" },               // ร่าง
    { id: 2, statusName: "Submitted" },           // ส่งแล้ว รอตรวจสอบ
    { id: 3, statusName: "In Review" },           // กำลังพิจารณา
    { id: 4, statusName: "Need Revision" },       // ส่งกลับไปแก้ไข
    { id: 5, statusName: "Approved" },            // อนุมัติแล้ว
    { id: 6, statusName: "Rejected" }             // ไม่อนุมัติ
  ],

  projectAttachmentTypes: [
    { id: 1, docTypeName: "system_diagram" },
    { id: 2, docTypeName: "network_diagram" },
    { id: 3, docTypeName: "use_case_diagram" },
    { id: 4, docTypeName: "security_diagram" },
    { id: 5, docTypeName: "presentation" },
    { id: 6, docTypeName: "report" },
    { id: 7, docTypeName: "ใบเบิกเงิน" },
    { id: 8, docTypeName: "other" }
  ],

  meetingStatuses: [
    { id: 1, name: "Scheduled (รอการประชุม)" },
    { id: 2, name: "In Progress (กำลังดำเนินการ)" },
    { id: 3, name: "Completed (เสร็จสิ้น)" },
    { id: 4, name: "Cancelled (ยกเลิก)" }
  ],

  meetingTypes: [
    { id: 1, name: "คณะกรรมการกลั่นกรอง (Small Board)" },
    { id: 2, name: "คณะกรรมการนโยบาย (Big Board)" }
  ],

  meetingAttachmentTypes: [
    { id: 1, name: "ระเบียบวาระการประชุม" },
    { id: 2, name: "รายงานการประชุม" },
    { id: 3, name: "เอกสารประกอบการพิจารณา" }
  ],

  agendaTypes: [
    { id: 1, name: "วาระแจ้งเพื่อทราบ" },
    { id: 2, name: "วาระรับรองรายงานการประชุม" },
    { id: 3, name: "วาระเพื่อพิจารณา" },
    { id: 4, name: "วาระอื่นๆ" }
  ],

  resolutionStatuses: [
    { id: 1, name: "Approved (อนุมัติ)" },
    { id: 2, name: "Need Revision (ให้แก้ไข)" },
    { id: 3, name: "Rejected (ไม่อนุมัติ)" },
    { id: 4, name: "Acknowledged (รับทราบ)" },
    { id: 5, name: "Pending (รอการพิจารณา)" }
  ]
};