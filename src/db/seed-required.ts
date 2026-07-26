import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  agendaTypes,
  departments,
  divisions,
  deputyGovernors,
  fourQuadrants,
  meetingAttachmentTypes,
  meetingStatuses,
  meetingTypes,
  projectAttachmentTypes,
  projectStatuses,
  projectTypes,
  resolutionStatuses,
} from "./schema/lookups";
import { agendaTypeSeedData, seedData } from "./seed-data";
import { roles } from "./schema/users";

async function seedRequiredData() {
  for (const item of seedData.departments) {
    const existing = await db.query.departments.findFirst({
      where: eq(departments.departmentId, item.departmentId),
    });
    if (!existing) await db.insert(departments).values(item);
    else if (existing.departmentName !== item.departmentName) {
      await db.update(departments)
        .set({ departmentName: item.departmentName })
        .where(eq(departments.departmentId, item.departmentId));
    }
  }

  for (const item of seedData.divisions) {
    const existing = await db.query.divisions.findFirst({
      where: eq(divisions.divisionId, item.divisionId),
    });
    if (!existing) await db.insert(divisions).values(item);
    else if (
      existing.divisionName !== item.divisionName ||
      existing.departmentId !== item.departmentId
    ) {
      await db.update(divisions)
        .set({ divisionName: item.divisionName, departmentId: item.departmentId })
        .where(eq(divisions.divisionId, item.divisionId));
    }
  }

  for (const item of seedData.roles) {
    const existingByCode = await db.query.roles.findFirst({
      where: eq(roles.code, item.code),
    });
    const existingById = await db.query.roles.findFirst({
      where: eq(roles.roleId, item.roleId),
    });
    const existing = existingByCode ?? existingById;
    if (!existing) {
      await db.insert(roles).values(item);
    } else if (existing.roleName !== item.roleName || existing.code !== item.code) {
      await db.update(roles)
        .set({ code: item.code, roleName: item.roleName })
        .where(eq(roles.roleId, existing.roleId));
    }
  }

  for (const item of seedData.projectTypes) {
    const existingByCode = await db.query.projectTypes.findFirst({
      where: eq(projectTypes.code, item.code),
    });
    const existingById = await db.query.projectTypes.findFirst({
      where: eq(projectTypes.id, item.id),
    });
    const existing = existingByCode ?? existingById;
    if (!existing) await db.insert(projectTypes).values(item);
    else if (existing.typeName !== item.typeName || existing.code !== item.code) {
      await db.update(projectTypes)
        .set({ code: item.code, typeName: item.typeName })
        .where(eq(projectTypes.id, existing.id));
    }
  }

  for (const item of seedData.fourQuadrants) {
    const existing = await db.query.fourQuadrants.findFirst({
      where: eq(fourQuadrants.id, item.id),
    });
    if (!existing) await db.insert(fourQuadrants).values(item);
    else if (existing.name !== item.name) {
      await db.update(fourQuadrants)
        .set({ name: item.name })
        .where(eq(fourQuadrants.id, item.id));
    }
  }

  for (const item of seedData.deputyGovernors) {
    const existing = await db.query.deputyGovernors.findFirst({
      where: eq(deputyGovernors.id, item.id),
    });
    if (!existing) await db.insert(deputyGovernors).values(item);
    else if (existing.name !== item.name) {
      await db.update(deputyGovernors)
        .set({ name: item.name })
        .where(eq(deputyGovernors.id, item.id));
    }
  }

  for (const item of seedData.projectStatuses) {
    const existingByCode = await db.query.projectStatuses.findFirst({
      where: eq(projectStatuses.code, item.code),
    });
    const existingById = await db.query.projectStatuses.findFirst({
      where: eq(projectStatuses.id, item.id),
    });
    const existing = existingByCode ?? existingById;
    if (!existing) await db.insert(projectStatuses).values(item);
    else if (existing.statusName !== item.statusName || existing.code !== item.code) {
      await db.update(projectStatuses)
        .set({ code: item.code, statusName: item.statusName })
        .where(eq(projectStatuses.id, existing.id));
    }
  }

  for (const item of seedData.projectAttachmentTypes) {
    const existingByCode = await db.query.projectAttachmentTypes.findFirst({
      where: eq(projectAttachmentTypes.code, item.code),
    });
    const existingByName = await db.query.projectAttachmentTypes.findFirst({
      where: eq(projectAttachmentTypes.docTypeName, item.docTypeName),
    });
    const existing = existingByCode ?? existingByName;
    if (!existing) {
      await db.insert(projectAttachmentTypes)
        .values({ code: item.code, docTypeName: item.docTypeName })
        .onConflictDoNothing({ target: projectAttachmentTypes.docTypeName });
    } else if (existing.code !== item.code || existing.docTypeName !== item.docTypeName) {
      await db.update(projectAttachmentTypes)
        .set({ code: item.code, docTypeName: item.docTypeName })
        .where(eq(projectAttachmentTypes.id, existing.id));
    }
  }

  for (const item of seedData.meetingStatuses) {
    const existing = await db.query.meetingStatuses.findFirst({
      where: eq(meetingStatuses.id, item.id),
    });
    if (!existing) await db.insert(meetingStatuses).values(item);
    else if (existing.name !== item.name) {
      await db.update(meetingStatuses).set({ name: item.name }).where(eq(meetingStatuses.id, item.id));
    }
  }

  for (const item of seedData.meetingTypes) {
    const existing = await db.query.meetingTypes.findFirst({
      where: eq(meetingTypes.id, item.id),
    });
    if (!existing) await db.insert(meetingTypes).values(item);
    else if (existing.name !== item.name) {
      await db.update(meetingTypes).set({ name: item.name }).where(eq(meetingTypes.id, item.id));
    }
  }

  for (const item of seedData.meetingAttachmentTypes) {
    const existing = await db.query.meetingAttachmentTypes.findFirst({
      where: eq(meetingAttachmentTypes.id, item.id),
    });
    if (!existing) await db.insert(meetingAttachmentTypes).values(item);
    else if (existing.name !== item.name) {
      await db.update(meetingAttachmentTypes).set({ name: item.name }).where(eq(meetingAttachmentTypes.id, item.id));
    }
  }

  for (const item of agendaTypeSeedData) {
    const existing = await db.query.agendaTypes.findFirst({
      where: eq(agendaTypes.id, item.id),
    });
    if (!existing) await db.insert(agendaTypes).values(item);
    else if (existing.name !== item.name) {
      await db.update(agendaTypes).set({ name: item.name }).where(eq(agendaTypes.id, item.id));
    }
  }

  for (const item of seedData.resolutionStatuses) {
    const existing = await db.query.resolutionStatuses.findFirst({
      where: eq(resolutionStatuses.id, item.id),
    });
    if (!existing) await db.insert(resolutionStatuses).values(item);
    else if (existing.name !== item.name) {
      await db.update(resolutionStatuses).set({ name: item.name }).where(eq(resolutionStatuses.id, item.id));
    }
  }
}

async function main() {
  try {
    console.log("Starting required database seed...");
    await seedRequiredData();
    console.log("Required database seed completed.");
  } catch (error) {
    console.error("Required database seed failed:", error);
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  void main();
}

export { seedRequiredData };
