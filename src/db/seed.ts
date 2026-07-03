// src/db/seed.ts
import { db } from "./index";
import { roles, users, roleUsers } from "./schema/users";
import { departments, divisions } from "./schema/lookups";
import { eq } from "drizzle-orm";
import { projectTypes } from "./schema/projects";
import { v7 as uuidv7 } from "uuid";

async function main() {
  console.log("Starting database seeding...");

  try {

    // Departments
    console.log(">> ตรวจสอบและสร้างข้อมูลแผนก (Departments)...");
    const existingDept = await db.query.departments.findFirst({
      where: eq(departments.departmentId, 1)
    });
    if (!existingDept) {
      await db.insert(departments).values([
        { departmentId: 1, departmentName: "สำนักดิจิทัล" }
      ]);
      console.log("   ✅ เพิ่มแผนก 'สำนักดิจิทัล' สำเร็จ");
    }

    // Divisions
    console.log(">> ตรวจสอบและสร้างข้อมูลฝ่าย (Divisions)...");
    const existingDiv = await db.query.divisions.findFirst({
      where: eq(divisions.divisionId, 1)
    });
    if (!existingDiv) {
      await db.insert(divisions).values([
        { divisionId: 1, divisionName: "กองยุทธศาสตร์ดิจิทัล", departmentId: 1 }
      ]);
      console.log("   ✅ เพิ่มฝ่าย 'กองยุทธศาสตร์ดิจิทัล' สำเร็จ");
    }

    // Roles
    console.log(">> ตรวจสอบและสร้างข้อมูลสิทธิ์ (Roles)...");
    const existingRole = await db.query.roles.findFirst({
      where: eq(roles.roleId, 1) 
    });
    if (!existingRole) {
      await db.insert(roles).values([
        { roleId: 1, roleName: "USER" },
        { roleId: 2, roleName: "ADMIN" }
      ]);
      console.log("   ✅ เพิ่มสิทธิ์ USER และ ADMIN สำเร็จ");
    }

    // Project Types
    console.log(">> ตรวจสอบและสร้างข้อมูลประเภทโครงการ (Project Types)...");
    const existingProjectType = await db.query.projectTypes.findFirst({
      where: eq(projectTypes.id, 1)
    });
    if (!existingProjectType) {
      await db.insert(projectTypes).values([
        { id: 1, typeName: "Hardware" },
        { id: 2, typeName: "Software" }
      ]);
      console.log("   ✅ เพิ่มประเภทโครงการ สำเร็จ");
    }

    // First Admin User
    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.username, "admin")
    });

    if (!existingAdmin) {
      console.log(">> กำลังสร้างบัญชี Admin เริ่มต้น...");
      const hashedPassword = await Bun.password.hash("password123"); // รหัสผ่านตั้งต้น
      const adminId = uuidv7();
      const [admin] = await db.insert(users).values({
        userId: adminId,
        username: "admin",
        firstName: "System",
        lastName: "Administrator",
        email: "admin@system.com",
        password: hashedPassword,
        isVerified: true,
      }).returning();

      // สมมติว่า role แอดมินคือ ID 1
      await db.insert(roleUsers).values({
        userId: admin.userId,
        roleId: 1, 
      });
      console.log(">> สร้างบัญชี Admin สำเร็จ! (username: admin / pass: password123)");
    }

    console.log("✅ Seed ข้อมูลเสร็จสมบูรณ์!");
    process.exit(0); // ปิดการทำงานสำเร็จ
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการ Seed:", error);
    process.exit(1); // ปิดการทำงานแบบแจ้ง Error
  }
}

main();