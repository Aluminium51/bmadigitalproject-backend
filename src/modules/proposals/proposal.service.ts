// src/modules/proposals/proposal.service.ts
import { db } from "../../db";
import { and, eq, inArray, isNull, lt } from "drizzle-orm";
import {
  proposals,
  proposalBudgets,
  proposalRelatedProjects,
  proposalManpower,
  proposalExistingEquipments,
  proposalHardwareCosts,
  proposalSoftwareCosts,
  proposalPersonnelCosts,
  proposalPersonnelResponsibilities,
  proposalTrainings,
  proposalTrainingSpeakerCosts,
  proposalTrainingFoodCosts,
  proposalOtherCosts,
  proposalIctPersonnel,
  proposalCloudRequests,
  proposalCloudVms,
} from "../../db/schema/proposals";
import { proposalDrafts } from "../../db/schema/proposal_drafts";
import { projects } from "../../db/schema/projects";
import { users } from "../../db/schema/users";
import { HTTPException } from "hono/http-exception";
import { v7 as uuidv7 } from "uuid";
import type { UserContext } from "../../utils/permission.helper";
import {
  checkPermission,
  isSecretaryOnlyUser,
} from "../../utils/permission.helper";
import {
  PROJECT_STATUS,
  OWNER_EDITABLE_STATUS_IDS,
  applyProjectStatusTransition,
} from "../projects/project-workflow";
import { syncProposalCollections } from "./proposal.persistence";

// ============================================================================
// Helper Function: สำหรับจัดการ Update, Insert, Delete ด้วย Promise.all
// ============================================================================
async function syncSubTable(
  tx: any,
  table: any,
  parentIdColumn: any,
  parentIdValue: string,
  idColumn: any,
  payloadArray: any[] = [],
  mapInsert: (item: any) => any,
  mapUpdate: (item: any) => any
) {
  const existingRecords = await tx.select({ id: idColumn }).from(table).where(eq(parentIdColumn, parentIdValue));
  const existingIds = new Set(existingRecords.map((r: any) => r.id));

  const payloadIds = new Set(payloadArray.filter(i => i.id).map(i => i.id));
  
  const toDelete = [...existingIds].filter(id => !payloadIds.has(id));
  const toInsert = payloadArray.filter(i => !i.id);
  const toUpdate = payloadArray.filter(i => i.id && existingIds.has(i.id));

  // ใช้ Promise.all เพื่อยิง Query ลบ/เพิ่ม/แก้ พร้อมกัน (Concurrent)
  const dbOperations: Promise<any>[] = [];

  if (toDelete.length > 0) {
    dbOperations.push(tx.delete(table).where(inArray(idColumn, toDelete)));
  }
  if (toInsert.length > 0) {
    dbOperations.push(tx.insert(table).values(toInsert.map(mapInsert)));
  }
  if (toUpdate.length > 0) {
    // แตก Update ทีละแถวให้เป็น Promise แล้วยัดเข้า Array ให้ทำงานพร้อมกัน
    dbOperations.push(...toUpdate.map(item => tx.update(table).set(mapUpdate(item)).where(eq(idColumn, item.id))));
  }

  await Promise.all(dbOperations);
}

async function assertUserExists(userId: string) {
  const [user] = await db.select({ userId: users.userId }).from(users).where(eq(users.userId, userId)).limit(1);
  if (!user) throw new HTTPException(401, { message: "Invalid authentication token: user not found" });
}

async function assertOwnerCanEditProject(projectId: string, userId: string) {
  const [project] = await db
    .select({ id: projects.id, ownerId: projects.userId, statusId: projects.projectStatusId })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) throw new HTTPException(404, { message: "Project not found" });
  if (project.ownerId !== userId) {
    throw new HTTPException(403, { message: "Only the project owner can edit this proposal" });
  }
  if (!OWNER_EDITABLE_STATUS_IDS.includes(project.statusId as typeof OWNER_EDITABLE_STATUS_IDS[number])) {
    throw new HTTPException(409, { message: "This project is currently outside the owner's editing stage" });
  }

  return project;
}

const submittedProposalScalarColumns = {
  projectName: proposals.projectName,
  agencyName: proposals.agencyName,
  headOfAgency: proposals.headOfAgency,
  dcioName: proposals.dcioName,
  projectManager: proposals.projectManager,
  totalBudget: proposals.totalBudget,
  background: proposals.background,
  objective: proposals.objective,
  target: proposals.target,
  scope: proposals.scope,
  projectType: proposals.projectType,
  currentSystemStatus: proposals.currentSystemStatus,
  currentProblems: proposals.currentProblems,
  isBmaPlan: proposals.isBmaPlan,
  isAgencyPlan: proposals.isAgencyPlan,
  agencyStrategy: proposals.agencyStrategy,
  agencyIssue: proposals.agencyIssue,
  agencyKpi: proposals.agencyKpi,
  isGovernorPolicy: proposals.isGovernorPolicy,
  governorPolicyCode: proposals.governorPolicyCode,
  governorPolicyName: proposals.governorPolicyName,
  obstacleLaws: proposals.obstacleLaws,
  appArchitecture: proposals.appArchitecture,
  dataOwner: proposals.dataOwner,
  dataExchangePlan: proposals.dataExchangePlan,
  isReady: proposals.isReady,
  readinessDetails: proposals.readinessDetails,
  durationDays: proposals.durationDays,
  otherReadiness: proposals.otherReadiness,
  expectedBenefits: proposals.expectedBenefits,
  isInRoadmap: proposals.isInRoadmap,
} as const;

const hasOwn = (payload: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(payload, key);

async function syncSubmittedProposalCollections(
  tx: any,
  proposalId: string,
  payload: Record<string, any>,
) {
  const syncIfProvided = (
    key: string,
    table: any,
    payloadRows: any[],
    mapInsert: (row: any) => any,
    mapUpdate: (row: any) => any,
  ) => {
    if (!hasOwn(payload, key)) return Promise.resolve();
    return syncSubTable(
      tx,
      table,
      table.proposalId,
      proposalId,
      table.id,
      Array.isArray(payloadRows) ? payloadRows : [],
      mapInsert,
      mapUpdate,
    );
  };

  await Promise.all([
    syncIfProvided(
      "budgetsByYear",
      proposalBudgets,
      payload.budgetsByYear ?? payload.budgets,
      (row) => ({ id: uuidv7(), proposalId, year: row.year, amount: String(row.amount), budgetType: row.budgetType }),
      (row) => ({ year: row.year, amount: String(row.amount), budgetType: row.budgetType }),
    ),
    syncIfProvided(
      "budgets",
      proposalBudgets,
      payload.budgets,
      (row) => ({ id: uuidv7(), proposalId, year: row.year, amount: String(row.amount), budgetType: row.budgetType }),
      (row) => ({ year: row.year, amount: String(row.amount), budgetType: row.budgetType }),
    ),
    syncIfProvided(
      "relatedProjects",
      proposalRelatedProjects,
      payload.relatedProjects,
      (row) => ({ id: uuidv7(), proposalId, projectName: row.projectName, agency: row.agency, fiscalYear: row.fiscalYear, relationType: row.relationType, remark: row.remark }),
      (row) => ({ projectName: row.projectName, agency: row.agency, fiscalYear: row.fiscalYear, relationType: row.relationType, remark: row.remark }),
    ),
    syncIfProvided(
      "manpower",
      proposalManpower,
      payload.manpower,
      (row) => ({ id: uuidv7(), proposalId, agencyPart: row.agencyPart, positionLimit: row.positionLimit, occupied: row.occupied, vacant: row.vacant }),
      (row) => ({ agencyPart: row.agencyPart, positionLimit: row.positionLimit, occupied: row.occupied, vacant: row.vacant }),
    ),
    syncIfProvided(
      "existingEquipment",
      proposalExistingEquipments,
      payload.existingEquipment ?? payload.existingEquipments,
      (row) => ({ id: uuidv7(), proposalId, itemName: row.itemName, ageYears: String(row.ageYears), quantity: row.quantity, user: row.user, location: row.location, remark: row.remark }),
      (row) => ({ itemName: row.itemName, ageYears: String(row.ageYears), quantity: row.quantity, user: row.user, location: row.location, remark: row.remark }),
    ),
    syncIfProvided(
      "hardwareCosts",
      proposalHardwareCosts,
      payload.hardwareCosts,
      (row) => ({ id: uuidv7(), proposalId, itemName: row.itemName, quantity: row.quantity, unitPrice: String(row.unitPrice), referenceType: row.referenceType, mdesMonth: row.mdesMonth, mdesYear: row.mdesYear, mdesItemNo: row.mdesItemNo, marketCount: row.marketCount, marketCompany: row.marketCompany, prevProject: row.prevProject, prevYear: row.prevYear, otherDetail: row.otherDetail }),
      (row) => ({ itemName: row.itemName, quantity: row.quantity, unitPrice: String(row.unitPrice), referenceType: row.referenceType, mdesMonth: row.mdesMonth, mdesYear: row.mdesYear, mdesItemNo: row.mdesItemNo, marketCount: row.marketCount, marketCompany: row.marketCompany, prevProject: row.prevProject, prevYear: row.prevYear, otherDetail: row.otherDetail }),
    ),
    syncIfProvided(
      "softwareCosts",
      proposalSoftwareCosts,
      payload.softwareCosts,
      (row) => ({ id: uuidv7(), proposalId, itemName: row.itemName, quantity: row.quantity, unitPrice: String(row.unitPrice), referenceType: row.referenceType, mdesMonth: row.mdesMonth, mdesYear: row.mdesYear, mdesItemNo: row.mdesItemNo, marketCount: row.marketCount, marketCompany: row.marketCompany, prevProject: row.prevProject, prevYear: row.prevYear, otherDetail: row.otherDetail }),
      (row) => ({ itemName: row.itemName, quantity: row.quantity, unitPrice: String(row.unitPrice), referenceType: row.referenceType, mdesMonth: row.mdesMonth, mdesYear: row.mdesYear, mdesItemNo: row.mdesItemNo, marketCount: row.marketCount, marketCompany: row.marketCompany, prevProject: row.prevProject, prevYear: row.prevYear, otherDetail: row.otherDetail }),
    ),
    syncIfProvided(
      "personnelResponsibilities",
      proposalPersonnelResponsibilities,
      payload.personnelResponsibilities,
      (row) => ({ id: uuidv7(), proposalId, position: row.position, responsibility: row.responsibility }),
      (row) => ({ position: row.position, responsibility: row.responsibility }),
    ),
    syncIfProvided(
      "otherCosts",
      proposalOtherCosts,
      payload.otherCosts,
      (row) => ({ id: uuidv7(), proposalId, itemName: row.itemName, quantity: row.quantity, unitPrice: String(row.unitPrice), remark: row.remark, costType: row.costType }),
      (row) => ({ itemName: row.itemName, quantity: row.quantity, unitPrice: String(row.unitPrice), remark: row.remark, costType: row.costType }),
    ),
    syncIfProvided(
      "ictPersonnel",
      proposalIctPersonnel,
      payload.ictPersonnel,
      (row) => ({ id: uuidv7(), proposalId, position: row.position, level: row.level, count: row.count }),
      (row) => ({ position: row.position, level: row.level, count: row.count }),
    ),
  ]);
}

export const proposalService = {

  // ============================================================================
  // 1. ระบบแบบร่าง (DRAFTS)
  // ============================================================================

  async initializeDraft(projectId: string, userId: string) {
    await assertUserExists(userId);
    await assertOwnerCanEditProject(projectId, userId);

    const existing = await db.query.proposalDrafts.findFirst({
      where: eq(proposalDrafts.projectId, projectId)
    });
    if (existing) return existing;

    const [newDraft] = await db.insert(proposalDrafts).values({
      id: uuidv7(),
      projectId,
      userId,
      currentStep: 1,
      draftPayload: {},
    }).returning();

    return newDraft;
  },

  async getDraftByProjectId(projectId: string, user: UserContext) {
    checkPermission(user, "read", "proposal_form");
    return await db.query.proposalDrafts.findFirst({
      where: eq(proposalDrafts.projectId, projectId)
    });
  },

  async getMyDrafts(userId: string) {
    return await db.query.proposalDrafts.findMany({
      where: eq(proposalDrafts.userId, userId),
      orderBy: (drafts, { desc }) => [desc(drafts.updatedAt)],
    });
  },

  // บันทึกแบบร่างอัตโนมัติ (Upsert) -> ถ้าไม่มีให้ Insert, ถ้ามีให้ Update
  async upsertDraft(projectId: string, userId: string, payload: any) {
    await assertUserExists(userId);
    await assertOwnerCanEditProject(projectId, userId);

    const existingDraft = await db.query.proposalDrafts.findFirst({
      where: eq(proposalDrafts.projectId, projectId),
    });
    const incomingFormData = payload.draftPayload || payload;
    const formData = {
      ...(existingDraft?.draftPayload && typeof existingDraft.draftPayload === "object"
        ? existingDraft.draftPayload as Record<string, unknown>
        : {}),
      ...(incomingFormData && typeof incomingFormData === "object"
        ? incomingFormData as Record<string, unknown>
        : {}),
    };
    const summaryData = {
      projectName: payload.projectName !== undefined
        ? payload.projectName || null
        : existingDraft?.projectName ?? null,
      objective: payload.objective !== undefined
        ? payload.objective || null
        : existingDraft?.objective ?? null,
      totalBudget: payload.totalBudget !== undefined
        ? payload.totalBudget === null || payload.totalBudget === "" ? null : String(payload.totalBudget)
        : existingDraft?.totalBudget ?? null,
      currentStep: payload.currentStep !== undefined
        ? payload.currentStep || 1
        : existingDraft?.currentStep ?? 1,
      draftPayload: formData,
      updatedAt: new Date(),
      updatedBy: userId,
    };

    // ใช้ Upsert ประหยัด Query และกันชน
    const [upsertedDraft] = await db.insert(proposalDrafts).values({
      id: uuidv7(),
      projectId,
      userId,
      ...summaryData,
    }).onConflictDoUpdate({
      target: proposalDrafts.projectId,
      set: summaryData
    }).returning();

    return upsertedDraft;
  },

  // ============================================================================
  // 2. ระบบข้อเสนอโครงการตัวจริง (PROPOSALS)
  // ============================================================================

  async getProposalByProjectId(projectId: string, user: UserContext) {
    checkPermission(user, "read", "proposal_form");
    try {
      const proposal = await db.query.proposals.findFirst({
        where: eq(proposals.projectId, projectId),
        with: {
          budgets: true,
          relatedProjects: true,
          manpower: true,
          existingEquipments: true,
          hardwareCosts: true,
          softwareCosts: true,
          personnelCosts: true,
          personnelResponsibilities: true,
          trainings: { with: { speakerCosts: true, foodCosts: true } },
          otherCosts: true,
          ictPersonnel: true,
          cloudRequests: { with: { vms: true } },
        }
      });

      if (process.env.NODE_ENV !== "production" && proposal) {
        console.debug("[proposals] nested collections loaded", {
          proposalId: proposal.id,
          collections: {
            budgets: proposal.budgets.length,
            relatedProjects: proposal.relatedProjects.length,
            manpower: proposal.manpower.length,
            existingEquipments: proposal.existingEquipments.length,
            hardwareCosts: proposal.hardwareCosts.length,
            softwareCosts: proposal.softwareCosts.length,
            personnelCosts: proposal.personnelCosts.length,
            personnelResponsibilities: proposal.personnelResponsibilities.length,
            trainings: proposal.trainings.length,
            otherCosts: proposal.otherCosts.length,
            ictPersonnel: proposal.ictPersonnel.length,
            cloudRequests: proposal.cloudRequests.length,
          },
        });
      }

      return proposal;
    } catch (error) {
      console.error("❌ Error in getProposalByProjectId:", error);
      throw error;
    }
  },

  async patchSubmittedProposal(
    projectId: string,
    user: UserContext,
    payload: Record<string, any>,
  ) {
    if (!user.roles.includes("secretary")) {
      throw new HTTPException(403, {
        message: "Only Secretaries can update submitted proposals",
      });
    }
    checkPermission(user, "update", "proposal_form");

    const [existing] = await db
      .select({ id: proposals.id, projectId: proposals.projectId })
      .from(proposals)
      .where(eq(proposals.projectId, projectId))
      .limit(1);

    if (!existing) {
      throw new HTTPException(404, { message: "Submitted proposal not found" });
    }

    await db.transaction(async (tx) => {
      const scalarUpdates: Record<string, unknown> = {};

      for (const [field, column] of Object.entries(submittedProposalScalarColumns)) {
        if (!hasOwn(payload, field) || payload[field] === undefined) continue;
        scalarUpdates[column.name] = field === "totalBudget" && payload[field] !== null
          ? String(payload[field])
          : payload[field];
      }

      if (Object.keys(scalarUpdates).length > 0) {
        await tx
          .update(proposals)
          .set({
            ...(scalarUpdates as any),
            updatedBy: user.userId,
            updatedAt: new Date(),
          })
          .where(eq(proposals.id, existing.id));
      }

      await syncProposalCollections(tx, existing.id, payload);
    });

    return await this.getProposalByProjectId(projectId, user);
  },

  async submitProposal(user: UserContext, data: any) {
    await assertUserExists(user.userId);

    if (isSecretaryOnlyUser(user)) {
      throw new HTTPException(403, {
        message: "Secretary-only users cannot submit projects as the project owner",
      });
    }

    const project = await assertOwnerCanEditProject(data.projectId, user.userId);
    const targetStatus = project.statusId === PROJECT_STATUS.DRAFT || project.statusId === PROJECT_STATUS.RETURNED_SECRETARY
      ? PROJECT_STATUS.PENDING_SECRETARY
      : PROJECT_STATUS.IN_ANALYSIS;

    return await db.transaction(async (tx) => {
      // 1. จัดการตารางแม่ (Proposals) ด้วย Upsert -> ตัดปัญหา Race Condition 
      const mainProposalData = {
        userId: user.userId,
        status: "submitted" as const,
        projectName: data.projectName,
        agencyName: data.agencyName,
        headOfAgency: data.headOfAgency,
        dcioName: data.dcioName,
        projectManager: data.projectManager,
        totalBudget: data.totalBudget ? String(data.totalBudget) : null,
        background: data.background,
        objective: data.objective,
        target: data.target,
        scope: data.scope,
        projectType: data.projectType,
        currentSystemStatus: data.currentSystemStatus,
        currentProblems: data.currentProblems,
        isBmaPlan: data.isBmaPlan,
        isAgencyPlan: data.isAgencyPlan,
        agencyStrategy: data.agencyStrategy,
        agencyIssue: data.agencyIssue,
        agencyKpi: data.agencyKpi,
        isGovernorPolicy: data.isGovernorPolicy,
        governorPolicyCode: data.governorPolicyCode,
        governorPolicyName: data.governorPolicyName,
        obstacleLaws: data.obstacleLaws,
        appArchitecture: data.appArchitecture,
        dataOwner: data.dataOwner,
        dataExchangePlan: data.dataExchangePlan,
        isReady: data.isReady,
        readinessDetails: data.readinessDetails,
        durationDays: data.durationDays,
        otherReadiness: data.otherReadiness,
        expectedBenefits: data.expectedBenefits,
        isInRoadmap: data.isInRoadmap,
        updatedAt: new Date(),
        updatedBy: user.userId,
      };

      const [upsertedProposal] = await tx.insert(proposals).values({
        id: uuidv7(),
        projectId: data.projectId,
        ...mainProposalData
      }).onConflictDoUpdate({
        target: proposals.projectId, // 🌟 ต้องมี Unique constraint ที่ projectId เสมอ
        set: mainProposalData
      }).returning({ id: proposals.id });

      const proposalId = upsertedProposal.id;

      // เตรียมรวม Personnel Costs 3 ประเภทยัดตารางเดียว


      // ============================================================================
      // 2. จัดการตารางลูกระดับที่ 1 (ยิงขนานกันด้วย Promise.all)
      // ============================================================================


      // ============================================================================
      // 3. 🚀 จัดการตารางลูก 2 ชั้น (Trainings -> Speaker/Food) (Concurrent ระดับ Array)
      // ============================================================================
        // ยิง Sync หลาน (Speaker & Food) พร้อมกัน


      // ============================================================================
      // 4. 🚀 จัดการตารางลูก 2 ชั้น (Cloud Requests -> VMs) (Concurrent ระดับ Array)
      // ============================================================================


      await syncProposalCollections(tx, proposalId, {
        ...data,
        budgetsByYear: data.budgetsByYear ?? data.budgets ?? [],
      });

      await applyProjectStatusTransition(tx, {
        projectId: data.projectId,
        userId: user.userId,
        oldStatusId: project.statusId,
        newStatusId: targetStatus,
      });

      // ============================================================================
      // 5. ปิดท้าย: ลบ Draft ออกเมื่อ Submit ข้อมูลจริงเรียบร้อยแล้ว
      // ============================================================================
      await tx.delete(proposalDrafts).where(eq(proposalDrafts.projectId, data.projectId));

      return { id: proposalId };
    });
  },

  async deleteStaleDrafts(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    return await db.delete(proposalDrafts).where(lt(proposalDrafts.updatedAt, cutoffDate));
  }
};
