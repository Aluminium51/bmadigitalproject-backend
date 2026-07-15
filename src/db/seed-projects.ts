// src/db/seed-projects.ts
import { db } from "./index";
import { projects, projectSequences } from "./schema/projects";
import { v7 as uuidv7 } from "uuid";
import { eq, sql } from "drizzle-orm";
import { users } from "./schema/users";

export const mockProjectsData = [
  {
    projectCode: "BMA-69-0001",
    projectName: "โครงการพัฒนาระบบให้บริการประชาชนแบบเบ็ดเสร็จ (One Stop Service)",
    fourQuadrantsId: 2, // Q2: งานประจำที่บริการประชาชน[cite: 13]
    deputyGovernorId: 1, // รองผู้ว่าฯ ด้านบริหาร[cite: 13]
    projectStatusId: 1, // Draft[cite: 13]
    projectTypeId: 2, // Software[cite: 13]
    initialRequestedBudget: "1200000.00",
    isPublic: true,
  },
  {
    projectCode: "BMA-69-0002",
    projectName: "โครงการจัดหาอุปกรณ์คอมพิวเตอร์และเครือข่ายสำหรับศูนย์ข้อมูล",
    fourQuadrantsId: 1, // Q1: เพิ่มประสิทธิภาพ[cite: 13]
    deputyGovernorId: 1, // รองผู้ว่าฯ ด้านบริหาร[cite: 13]
    projectStatusId: 2, // Submitted[cite: 13]
    projectTypeId: 1, // Hardware[cite: 13]
    initialRequestedBudget: "5500000.00",
    isPublic: false,
  },
  {
    projectCode: "BMA-69-0003",
    projectName: "โครงการระบบบริหารจัดการน้ำท่วมอัจฉริยะ (Smart Flood Management)",
    fourQuadrantsId: 4, // Q4: ยุทธศาสตร์ / งานอนาคต[cite: 13]
    deputyGovernorId: 4, // รองผู้ว่าฯ ด้านสิ่งแวดล้อม[cite: 13]
    projectStatusId: 3, // In Review[cite: 13]
    projectTypeId: 2, // Software[cite: 13]
    initialRequestedBudget: "8900000.00",
    isPublic: true,
  },
  {
    projectCode: "BMA-69-0004",
    projectName: "โครงการติดตั้งระบบกล้องวงจรปิดเพื่อความปลอดภัยสาธารณะ",
    fourQuadrantsId: 2, // Q2: งานประจำที่บริการประชาชน[cite: 13]
    deputyGovernorId: 3, // รองผู้ว่าฯ ด้านสังคม[cite: 13]
    projectStatusId: 4, // Need Revision[cite: 13]
    projectTypeId: 1, // Hardware[cite: 13]
    initialRequestedBudget: "15000000.00",
    isPublic: true,
  },
  {
    projectCode: "BMA-69-0005",
    projectName: "โครงการพัฒนาระบบฐานข้อมูลเศรษฐกิจชุมชน",
    fourQuadrantsId: 3, // Q3: งานหลังบ้านที่เป็นงานใหม่[cite: 13]
    deputyGovernorId: 2, // รองผู้ว่าฯ ด้านเศรษฐกิจ[cite: 13]
    projectStatusId: 5, // Approved[cite: 13]
    projectTypeId: 2, // Software[cite: 13]
    initialRequestedBudget: "2500000.00",
    latestApprovedBudget: "2450000.00",
    isPublic: false,
  },
  {
    projectCode: "BMA-69-0006",
    projectName: "โครงการระบบติดตามและประเมินผลการลดคาร์บอน (Carbon Footprint Tracking)",
    fourQuadrantsId: 4, // Q4: ยุทธศาสตร์ / งานอนาคต[cite: 13]
    deputyGovernorId: 4, // รองผู้ว่าฯ ด้านสิ่งแวดล้อม[cite: 13]
    projectStatusId: 6, // Rejected[cite: 13]
    projectTypeId: 2, // Software[cite: 13]
    initialRequestedBudget: "3000000.00",
    isPublic: false,
  }
];

export async function seedMockProjects() {
  console.log(">> เริ่มสร้างข้อมูลโครงการทดสอบ (Mock Projects)...");

  try {
    const testUser = await db.query.users.findFirst({
      where: eq(users.username, "test_user")
    });

    if (!testUser) {
      console.error("❌ ไม่พบผู้ใช้งาน 'test_user' กรุณารัน Seed Data หลักก่อน");
      return;
    }

    const testAnalyst = await db.query.users.findFirst({
      where: eq(users.username, "test_analyst")
    });

    // --- ส่วน Insert ข้อมูล Mock ของเดิม ---
    for (const project of mockProjectsData) {
      const existing = await db.query.projects.findFirst({
        where: eq(projects.projectCode, project.projectCode)
      });

      if (!existing) {
        await db.insert(projects).values({
          id: uuidv7(),
          ...project,
          projectNameOriginal: project.projectName,
          userId: testUser.userId,
          divisionId: testUser.divisionId ?? 1,
          analystId: project.projectStatusId >= 3 && testAnalyst ? testAnalyst.userId : null,
          assignedBy: project.projectStatusId >= 3 && testAnalyst ? testUser.userId : null,
          assignedAt: project.projectStatusId >= 3 ? new Date() : null,
        });
        console.log(`   ✅ เพิ่มโครงการ '${project.projectName}' สำเร็จ`);
      }
    }

    // 3. ซิงค์ค่า Running Number ให้ตรงกับความเป็นจริง
    console.log(">> กำลังซิงค์เลข Project Code ล่าสุด...");

    // ดึงปีปัจจุบัน พ.ศ. (ให้ตรงกับ Logic ใน generateProjectCode)
    const currentYear = new Date().getFullYear();
    const thaiYear = currentYear + 543;
    const maxSeedNumber = mockProjectsData.length; // จำนวนข้อมูล Seed (ตอนนี้คือ 6)

    // บันทึกหรืออัปเดต Sequence ล่าสุด
    await db.insert(projectSequences)
      .values({ year: thaiYear, lastValue: maxSeedNumber })
      .onConflictDoUpdate({
        target: projectSequences.year,
        set: {
          // ป้องกันในกรณีที่ User สร้าง Project จริงทะลุเลข 6 ไปแล้ว เราจะไม่ถอยเลขกลับ
          lastValue: sql`GREATEST(${projectSequences.lastValue}, ${maxSeedNumber})`
        }
      });

    console.log(`   ✅ อัปเดต Sequence ของปี ${thaiYear} ให้เริ่มต้นจากเลข ${maxSeedNumber + 1} แล้ว`);
    console.log("✅ Seed ข้อมูลโครงการทดสอบเสร็จสิ้น!");

  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการ Seed Projects:", error);
  }
}
