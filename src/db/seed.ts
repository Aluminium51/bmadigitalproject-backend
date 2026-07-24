// src/db/seed.ts
import { db } from "./index";
import { roles, users, roleUsers } from "./schema/users";
import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

// import all form schema/lookup schema
import {
  departments,
  divisions,
  projectTypes,
  fourQuadrants,
  deputyGovernors,
  projectStatuses,
  projectAttachmentTypes,
  meetingStatuses,
  meetingTypes,
  meetingAttachmentTypes,
  agendaTypes,
  resolutionStatuses
} from "./schema/lookups";

// ดึงข้อมูลมาจากไฟล์แยก
import { agendaTypeSeedData, seedData } from "./seed-data";
import { seedMockProjects } from "./seed-projects";

async function main() {
  console.log("Starting database seeding...");

  try {
    // Departments
    console.log(">> ตรวจสอบและสร้างข้อมูลแผนก (Departments)...");
    for (const dept of seedData.departments) {
      const existing = await db.query.departments.findFirst({
        where: eq(departments.departmentId, dept.departmentId),
      });
      if (!existing) {
        await db.insert(departments).values(dept);
        console.log(`   ✅ เพิ่มแผนก '${dept.departmentName}' สำเร็จ`);
      }
    }

    // Divisions
    console.log(">> ตรวจสอบและสร้างข้อมูลฝ่าย (Divisions)...");
    for (const div of seedData.divisions) {
      const existing = await db.query.divisions.findFirst({
        where: eq(divisions.divisionId, div.divisionId),
      });
      if (!existing) {
        await db.insert(divisions).values(div);
        console.log(`   ✅ เพิ่มฝ่าย '${div.divisionName}' สำเร็จ`);
      }
    }

    // Roles
    console.log(">> ตรวจสอบและสร้างข้อมูลสิทธิ์ (Roles)...");
    for (const role of seedData.roles) {
      const existing = await db.query.roles.findFirst({
        where: eq(roles.roleId, role.roleId),
      });
      if (!existing) {
        await db.insert(roles).values(role);
        console.log(`   ✅ เพิ่มสิทธิ์ '${role.roleName}' สำเร็จ`);
      }
    }

    // Project Types
    console.log(">> ตรวจสอบและสร้างข้อมูลประเภทโครงการ (Project Types)...");
    for (const pt of seedData.projectTypes) {
      const existing = await db.query.projectTypes.findFirst({
        where: eq(projectTypes.id, pt.id),
      });
      if (!existing) {
        await db.insert(projectTypes).values(pt);
        console.log(`   ✅ เพิ่มประเภทโครงการ '${pt.typeName}' สำเร็จ`);
      }
    }

    // 4 Quadrants
    console.log(">> ตรวจสอบและสร้างข้อมูล 4 Quadrants...");
    for (const q of seedData.fourQuadrants) {
      const existing = await db.query.fourQuadrants.findFirst({
        where: eq(fourQuadrants.id, q.id),
      });
      if (!existing) {
        await db.insert(fourQuadrants).values(q);
        console.log(`   ✅ เพิ่มข้อมูล '${q.name}' สำเร็จ`);
      }
    }

    // Deputy Governors
    console.log(">> ตรวจสอบและสร้างข้อมูล รองผู้ว่าฯ...");
    for (const gov of seedData.deputyGovernors) {
      const existing = await db.query.deputyGovernors.findFirst({
        where: eq(deputyGovernors.id, gov.id),
      });
      if (!existing) {
        await db.insert(deputyGovernors).values(gov);
        console.log(`   ✅ เพิ่มข้อมูล '${gov.name}' สำเร็จ`);
      }
    }

// สร้าง Mock Users ครบทุกสิทธิ์
    console.log(">> ตรวจสอบและสร้างบัญชีผู้ใช้งานทดสอบ (Mock Users)...");
    for (const userData of seedData.mockUsers) {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, userData.username),
      });

      if (!existingUser) {
        console.log(`   กำลังสร้างบัญชี ${userData.username}...`);
        const hashedPassword = await Bun.password.hash(userData.rawPassword);
        const newUserId = uuidv7();

        // 1. สร้างข้อมูล User
        const [newUser] = await db
          .insert(users)
          .values({
            userId: newUserId,
            username: userData.username,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            password: hashedPassword,
            divisionId: userData.divisionId,
            isVerified: true, // กำหนดให้ยืนยันตัวตนแล้วเพื่อให้ล็อกอินได้เลย
          })
          .returning();

        // 2. ผูก Role ให้กับ User ลงตาราง roleUsers
        await db.insert(roleUsers).values({
          userId: newUser.userId,
          roleId: userData.roleId,
        });

        console.log(`   ✅ สร้างบัญชี ${userData.username} สำเร็จ!`);
      }
    }

    console.log(">> ตรวจสอบและสร้างข้อมูล Project Statuses...");
    for (const ps of seedData.projectStatuses) {
      const existing = await db.query.projectStatuses.findFirst({
        where: eq(projectStatuses.id, ps.id),
      });
      if (!existing) {
        await db.insert(projectStatuses).values(ps);
      } else if (existing.statusName !== ps.statusName) {
        await db.update(projectStatuses)
          .set({ statusName: ps.statusName })
          .where(eq(projectStatuses.id, ps.id));
      }
    }

    // Project Attachment Types
    console.log(">> ตรวจสอบและสร้างข้อมูล Project Attachment Types...");
    for (const pat of seedData.projectAttachmentTypes) {
      const existing = await db.query.projectAttachmentTypes.findFirst({
        where: eq(projectAttachmentTypes.docTypeName, pat.docTypeName),
      });
      if (existing) {
        if (existing.id !== pat.id) {
          console.warn(
            `Attachment type '${pat.docTypeName}' already uses ID ${existing.id}; keeping the existing ID. Run the guarded development reset only when deterministic IDs are required.`,
          );
        }
        continue;
      }

      // Normal startup seeding is name-based and non-destructive. The guarded
      // reset command is responsible for recreating deterministic numeric IDs.
      await db
        .insert(projectAttachmentTypes)
        .values({ docTypeName: pat.docTypeName })
        .onConflictDoNothing({ target: projectAttachmentTypes.docTypeName });
    }

    // Meeting Statuses
    console.log(">> ตรวจสอบและสร้างข้อมูล Meeting Statuses...");
    for (const ms of seedData.meetingStatuses) {
      const existing = await db.query.meetingStatuses.findFirst({
        where: eq(meetingStatuses.id, ms.id),
      });
      if (!existing) await db.insert(meetingStatuses).values(ms);
    }

    // Meeting Types
    console.log(">> ตรวจสอบและสร้างข้อมูล Meeting Types...");
    for (const mt of seedData.meetingTypes) {
      const existing = await db.query.meetingTypes.findFirst({
        where: eq(meetingTypes.id, mt.id),
      });
      if (!existing) await db.insert(meetingTypes).values(mt);
    }

    // Meeting Attachment Types
    console.log(">> ตรวจสอบและสร้างข้อมูล Meeting Attachment Types...");
    for (const mat of seedData.meetingAttachmentTypes) {
      const existing = await db.query.meetingAttachmentTypes.findFirst({
        where: eq(meetingAttachmentTypes.id, mat.id),
      });
      if (!existing) await db.insert(meetingAttachmentTypes).values(mat);
    }

    // Agenda Types
    console.log(">> ตรวจสอบและสร้างข้อมูล Agenda Types...");
    for (const at of agendaTypeSeedData) {
      const existing = await db.query.agendaTypes.findFirst({
        where: eq(agendaTypes.id, at.id),
      });
      if (!existing) {
        await db.insert(agendaTypes).values(at);
      } else if (existing.name !== at.name) {
        await db.update(agendaTypes).set({ name: at.name }).where(eq(agendaTypes.id, at.id));
      }
    }

    // Resolution Statuses
    console.log(">> ตรวจสอบและสร้างข้อมูล Resolution Statuses...");
    for (const rs of seedData.resolutionStatuses) {
      const existing = await db.query.resolutionStatuses.findFirst({
        where: eq(resolutionStatuses.id, rs.id),
      });
      if (!existing) await db.insert(resolutionStatuses).values(rs);
    }

    console.log("   ✅ เพิ่มข้อมูล Master Data สำหรับระบบการประชุมสำเร็จ");

    await seedMockProjects(); // เรียกใช้ฟังก์ชัน Seed Mock Projects

    console.log("✅ Seed ข้อมูลเสร็จสมบูรณ์!");
    process.exit(0);
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการ Seed:", error);
    process.exit(1);
  }
}

main();
