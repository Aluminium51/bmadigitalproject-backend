// src/db/seed-data.ts

export const agendaTypeSeedData = [
  { id: 1, name: "Chairman's Announcements" },
  { id: 2, name: "Adoption of Minutes" },
  { id: 3, name: "Matters Arising / Follow-up" },
  { id: 4, name: "Matters for Consideration" },
  { id: 5, name: "Any Other Business" },
];

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
    { id: 1, name: "รองผู้ว่าฯ 1" },
    { id: 2, name: "รองผู้ว่าฯ 2" },
    { id: 3, name: "รองผู้ว่าฯ 3" },
    { id: 4, name: "รองผู้ว่าฯ 4" }
  ],

mockUsers: [
    {
      username: "test_user",
      firstName: "Test",
      lastName: "User",
      email: "user@system.com",
      rawPassword: "password123",
      roleId: 1, // USER
      divisionId: 1, // กองยุทธศาสตร์ดิจิทัล
      departmentId: 1 // สำนักดิจิทัล
    },
    {
      username: "test_analyst",
      firstName: "Test",
      lastName: "Analyst",
      email: "analyst@system.com",
      rawPassword: "password123",
      roleId: 2, // ANALYST
      divisionId: 1, // กองยุทธศาสตร์ดิจิทัล
      departmentId: 1 // สำนักดิจิทัล
    },
    {
      username: "test_secretary",
      firstName: "Test",
      lastName: "Secretary",
      email: "secretary@system.com",
      rawPassword: "password123",
      roleId: 3, // SECRETARY
      divisionId: 1, // กองยุทธศาสตร์ดิจิทัล
      departmentId: 1 // สำนักดิจิทัล
    },
    {
      username: "test_admin",
      firstName: "Test",
      lastName: "Admin",
      email: "admin@system.com",
      rawPassword: "password123",
      roleId: 4, // ADMIN
      divisionId: 1, // กองยุทธศาสตร์ดิจิทัล
      departmentId: 1 // สำนักดิจิทัล
    },
    {
      username: "test_super_admin",
      firstName: "Test",
      lastName: "SuperAdmin",
      email: "superadmin@system.com",
      rawPassword: "password123",
      roleId: 5, // SUPER_ADMIN
      divisionId: 1, // กองยุทธศาสตร์ดิจิทัล
      departmentId: 1 // สำนักดิจิทัล
    }
  ],

  projectStatuses: [
    { id: 1, statusName: "Draft" },
    { id: 2, statusName: "Pending Secretary" },
    { id: 3, statusName: "Returned by Secretary" },
    { id: 4, statusName: "Rejected by Secretary" },
    { id: 5, statusName: "Pending Assignment" },
    { id: 6, statusName: "In Analysis" },
    { id: 7, statusName: "Returned by Analyst" },
    { id: 8, statusName: "Rejected by Analyst" },
    { id: 9, statusName: "Pending Small Board" },
    { id: 10, statusName: "Returned by Small Board" },
    { id: 11, statusName: "Rejected by Small Board" },
    { id: 12, statusName: "Pending Big Board" },
    { id: 13, statusName: "Returned by Big Board" },
    { id: 14, statusName: "Rejected by Big Board" },
    { id: 15, statusName: "Approved" },
  ],

  projectAttachmentTypes: [
    { id: 1, docTypeName: "system_diagram" },
    { id: 2, docTypeName: "network_diagram" },
    { id: 3, docTypeName: "use_case_diagram" },
    { id: 4, docTypeName: "security_diagram" },
    { id: 5, docTypeName: "presentation" },
    { id: 6, docTypeName: "report" },
    { id: 7, docTypeName: "ใบเบิกเงิน" },
    { id: 8, docTypeName: "other" },
    { id: 9, docTypeName: "quotation" },
    { id: 10, docTypeName: "one_page_summary" },
    { id: 11, docTypeName: "approval_document" },
    { id: 12, docTypeName: "bma_dc_usage" }
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
