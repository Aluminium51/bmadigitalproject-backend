// src/modules/proposals/proposal.service.ts
import { db } from "../../db";
import { eq, inArray, lt } from "drizzle-orm";
import {
  proposals, proposalBudgets, proposalRelatedProjects, proposalManpower,
  proposalExistingEquipments, proposalHardwareCosts, proposalSoftwareCosts,
  proposalPersonnelCosts, proposalPersonnelResponsibilities,
  proposalTrainings, proposalTrainingSpeakerCosts, proposalTrainingFoodCosts,
  proposalOtherCosts, proposalIctPersonnel,
  proposalCloudRequests, proposalCloudVms
} from "../../db/schema/proposals";
import { proposalDrafts } from "../../db/schema/proposal_drafts";
import { projects } from "../../db/schema/projects";
import { users } from "../../db/schema/users";
import { HTTPException } from "hono/http-exception";
import { v7 as uuidv7 } from "uuid";

// ============================================================================
// Helper Function: สำหรับจัดการ Update, Insert, Delete ตารางลูกแบบอัตโนมัติ
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
  // 1. ดึง ID ของเดิมทั้งหมดที่มีในระบบ
  const existingRecords = await tx.select({ id: idColumn }).from(table).where(eq(parentIdColumn, parentIdValue));
  const existingIds = new Set(existingRecords.map((r: any) => r.id));

  // 2. แยกชุดข้อมูล
  const payloadIds = new Set(payloadArray.filter(i => i.id).map(i => i.id));
  
  const toDelete = [...existingIds].filter(id => !payloadIds.has(id));
  const toInsert = payloadArray.filter(i => !i.id); // ไม่มี ID แปลว่าสร้างใหม่
  const toUpdate = payloadArray.filter(i => i.id && existingIds.has(i.id));

  // 3. รันคำสั่ง SQL
  if (toDelete.length > 0) {
    await tx.delete(table).where(inArray(idColumn, toDelete));
  }
  if (toInsert.length > 0) {
    await tx.insert(table).values(toInsert.map(mapInsert));
  }
  for (const item of toUpdate) {
    await tx.update(table).set(mapUpdate(item)).where(eq(idColumn, item.id));
  }
}

export const proposalService = {

  // ============================================================================
  // 1. ระบบแบบร่าง (DRAFTS)
  // ============================================================================

  async initializeDraft(projectId: string, userId: string) {
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

  async getDraftByProjectId(projectId: string) {
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

  async upsertDraft(projectId: string, userId: string, payload: any) {
    const existing = await db.query.proposalDrafts.findFirst({
      where: eq(proposalDrafts.projectId, projectId)
    });

    const summaryData = {
      projectName: payload.projectName || null,
      objective: payload.objective || null,
      totalBudget: payload.totalBudget ? String(payload.totalBudget) : null,
      currentStep: payload.currentStep || 1,
      draftPayload: payload,
      updatedAt: new Date(),
      updatedBy: userId,
    };

    if (existing) {
      const [updated] = await db.update(proposalDrafts)
        .set(summaryData)
        .where(eq(proposalDrafts.projectId, projectId))
        .returning();
      return updated;
    } else {
      const [inserted] = await db.insert(proposalDrafts).values({
        id: uuidv7(),
        projectId,
        userId,
        ...summaryData,
      }).returning();
      return inserted;
    }
  },

  // ============================================================================
  // 2. ระบบข้อเสนอโครงการตัวจริง (PROPOSALS)
  // ============================================================================

  async getProposalByProjectId(projectId: string) {
    try {
      return await db.query.proposals.findFirst({
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
          trainings: {
            with: { speakerCosts: true, foodCosts: true }
          },
          otherCosts: true,
          ictPersonnel: true,
          cloudRequests: {
            with: { vms: true }
          },
        }
      });
    } catch (error) {
      console.error("❌ Error in getProposalByProjectId:", error);
      throw error;
    }
  },

  async submitProposal(userId: string, data: any) {
    return await db.transaction(async (tx) => {
      let proposalId = "";

      // 1. จัดการตารางแม่ (Proposals)
      const existingProposal = await tx.query.proposals.findFirst({
        where: eq(proposals.projectId, data.projectId)
      });

      const mainProposalData = {
        userId,
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
        updatedBy: userId,
      };

      if (existingProposal) {
        proposalId = existingProposal.id;
        await tx.update(proposals).set(mainProposalData).where(eq(proposals.id, proposalId));
      } else {
        proposalId = uuidv7();
        await tx.insert(proposals).values({
          id: proposalId,
          projectId: data.projectId,
          ...mainProposalData
        });
      }

      // ============================================================================
      // 2. จัดการตารางลูก 1 ชั้น ด้วย syncSubTable
      // ============================================================================

      // 2.1 Budgets
      await syncSubTable(
        tx, proposalBudgets, proposalBudgets.proposalId, proposalId, proposalBudgets.id,
        data.budgets || [],
        (b) => ({ id: uuidv7(), proposalId, year: b.year, amount: String(b.amount), budgetType: b.budgetType }),
        (b) => ({ year: b.year, amount: String(b.amount), budgetType: b.budgetType })
      );

      // 2.2 Related Projects
      await syncSubTable(
        tx, proposalRelatedProjects, proposalRelatedProjects.proposalId, proposalId, proposalRelatedProjects.id,
        data.relatedProjects || [],
        (p) => ({ id: uuidv7(), proposalId, projectName: p.projectName, agency: p.agency, fiscalYear: p.fiscalYear, relationType: p.relationType, remark: p.remark }),
        (p) => ({ projectName: p.projectName, agency: p.agency, fiscalYear: p.fiscalYear, relationType: p.relationType, remark: p.remark })
      );

      // 2.3 Manpower
      await syncSubTable(
        tx, proposalManpower, proposalManpower.proposalId, proposalId, proposalManpower.id,
        data.manpower || [],
        (m) => ({ id: uuidv7(), proposalId, agencyPart: m.agencyPart, positionLimit: m.positionLimit, occupied: m.occupied, vacant: m.vacant }),
        (m) => ({ agencyPart: m.agencyPart, positionLimit: m.positionLimit, occupied: m.occupied, vacant: m.vacant })
      );

      // 2.4 Existing Equipments
      await syncSubTable(
        tx, proposalExistingEquipments, proposalExistingEquipments.proposalId, proposalId, proposalExistingEquipments.id,
        data.existingEquipment || [], // Map จาก payload เดิม
        (e) => ({ id: uuidv7(), proposalId, itemName: e.itemName, ageYears: String(e.ageYears), quantity: e.quantity, user: e.user, location: e.location, remark: e.remark }),
        (e) => ({ itemName: e.itemName, ageYears: String(e.ageYears), quantity: e.quantity, user: e.user, location: e.location, remark: e.remark })
      );

      // 2.5 Hardware Costs
      await syncSubTable(
        tx, proposalHardwareCosts, proposalHardwareCosts.proposalId, proposalId, proposalHardwareCosts.id,
        data.hardwareCosts || [],
        (h) => ({ id: uuidv7(), proposalId, itemName: h.itemName, quantity: h.quantity, unitPrice: String(h.unitPrice), referenceType: h.referenceType, mdesMonth: h.mdesMonth, mdesYear: h.mdesYear, mdesItemNo: h.mdesItemNo, marketCount: h.marketCount, marketCompany: h.marketCompany, prevProject: h.prevProject, prevYear: h.prevYear, otherDetail: h.otherDetail }),
        (h) => ({ itemName: h.itemName, quantity: h.quantity, unitPrice: String(h.unitPrice), referenceType: h.referenceType, mdesMonth: h.mdesMonth, mdesYear: h.mdesYear, mdesItemNo: h.mdesItemNo, marketCount: h.marketCount, marketCompany: h.marketCompany, prevProject: h.prevProject, prevYear: h.prevYear, otherDetail: h.otherDetail })
      );

      // 2.6 Software Costs
      await syncSubTable(
        tx, proposalSoftwareCosts, proposalSoftwareCosts.proposalId, proposalId, proposalSoftwareCosts.id,
        data.softwareCosts || [],
        (s) => ({ id: uuidv7(), proposalId, itemName: s.itemName, quantity: s.quantity, unitPrice: String(s.unitPrice), referenceType: s.referenceType, mdesMonth: s.mdesMonth, mdesYear: s.mdesYear, mdesItemNo: s.mdesItemNo, marketCount: s.marketCount, marketCompany: s.marketCompany, prevProject: s.prevProject, prevYear: s.prevYear, otherDetail: s.otherDetail }),
        (s) => ({ itemName: s.itemName, quantity: s.quantity, unitPrice: String(s.unitPrice), referenceType: s.referenceType, mdesMonth: s.mdesMonth, mdesYear: s.mdesYear, mdesItemNo: s.mdesItemNo, marketCount: s.marketCount, marketCompany: s.marketCompany, prevProject: s.prevProject, prevYear: s.prevYear, otherDetail: s.otherDetail })
      );

      // 2.7 Personnel Costs (รวม CORE, ASST, SUPP ก่อน Sync)
      const allPersonnelCosts = [
        ...(data.personnelCoreCosts || []).map((p: any) => ({ ...p, personnelType: "CORE" })),
        ...(data.personnelAsstCosts || []).map((p: any) => ({ ...p, personnelType: "ASST" })),
        ...(data.personnelSuppCosts || []).map((p: any) => ({ ...p, personnelType: "SUPP" }))
      ];
      await syncSubTable(
        tx, proposalPersonnelCosts, proposalPersonnelCosts.proposalId, proposalId, proposalPersonnelCosts.id,
        allPersonnelCosts,
        (p) => ({ id: uuidv7(), proposalId, personnelType: p.personnelType, position: p.position, degree: p.degree, fieldOfStudy: p.fieldOfStudy, experienceYears: p.experienceYears ? String(p.experienceYears) : null, baseSalary: p.baseSalary ? String(p.baseSalary) : null, multiplier: p.multiplier ? String(p.multiplier) : null, personCount: p.personCount, durationMonths: p.durationMonths }),
        (p) => ({ personnelType: p.personnelType, position: p.position, degree: p.degree, fieldOfStudy: p.fieldOfStudy, experienceYears: p.experienceYears ? String(p.experienceYears) : null, baseSalary: p.baseSalary ? String(p.baseSalary) : null, multiplier: p.multiplier ? String(p.multiplier) : null, personCount: p.personCount, durationMonths: p.durationMonths })
      );

      // 2.8 Personnel Responsibilities
      await syncSubTable(
        tx, proposalPersonnelResponsibilities, proposalPersonnelResponsibilities.proposalId, proposalId, proposalPersonnelResponsibilities.id,
        data.personnelResponsibilities || [],
        (r) => ({ id: uuidv7(), proposalId, position: r.position, responsibility: r.responsibility }),
        (r) => ({ position: r.position, responsibility: r.responsibility })
      );

      // 2.9 Other Costs
      await syncSubTable(
        tx, proposalOtherCosts, proposalOtherCosts.proposalId, proposalId, proposalOtherCosts.id,
        data.otherCosts || [],
        (o) => ({ id: uuidv7(), proposalId, itemName: o.itemName, quantity: o.quantity, unitPrice: String(o.unitPrice), remark: o.remark, costType: o.costType }),
        (o) => ({ itemName: o.itemName, quantity: o.quantity, unitPrice: String(o.unitPrice), remark: o.remark, costType: o.costType })
      );

      // 2.10 ICT Personnel
      await syncSubTable(
        tx, proposalIctPersonnel, proposalIctPersonnel.proposalId, proposalId, proposalIctPersonnel.id,
        data.ictPersonnel || [],
        (i) => ({ id: uuidv7(), proposalId, position: i.position, level: i.level, count: i.count }),
        (i) => ({ position: i.position, level: i.level, count: i.count })
      );

      // ============================================================================
      // 3. จัดการตารางลูก 2 ชั้น (Trainings -> Speaker/Food)
      // ============================================================================
      const payloadTrainings = data.trainingCourses || [];
      const existingTrainings = await tx.select({ id: proposalTrainings.id }).from(proposalTrainings).where(eq(proposalTrainings.proposalId, proposalId));
      const existingTrainingIds = new Set(existingTrainings.map((r: any) => r.id));
      const payloadTrainingIds = new Set(payloadTrainings.filter((t: any) => t.id).map((t: any) => t.id));

      // ลบ Trainings ที่ถูกดึงออก (Cascade จะลบ Speaker/Food ให้อัตโนมัติถ้าตั้งไว้ที่ Schema, ไม่งั้นต้องลบเอง)
      const trainingsToDelete = [...existingTrainingIds].filter(id => !payloadTrainingIds.has(id));
      if (trainingsToDelete.length > 0) {
        await tx.delete(proposalTrainings).where(inArray(proposalTrainings.id, trainingsToDelete));
      }

      for (const t of payloadTrainings) {
        let trainingId = t.id;
        // Upsert ตัวแม่ (Training)
        if (!trainingId || !existingTrainingIds.has(trainingId)) {
          trainingId = uuidv7();
          await tx.insert(proposalTrainings).values({
            id: trainingId, proposalId, courseName: t.courseName, trainingMethod: t.trainingMethod, locationType: t.locationType, hasSpeakerCost: t.hasSpeakerCost, speakerReason: t.speakerReason
          });
        } else {
          await tx.update(proposalTrainings).set({
            courseName: t.courseName, trainingMethod: t.trainingMethod, locationType: t.locationType, hasSpeakerCost: t.hasSpeakerCost, speakerReason: t.speakerReason
          }).where(eq(proposalTrainings.id, trainingId));
        }

        // Sync ตัวหลาน (Speaker Costs)
        await syncSubTable(
          tx, proposalTrainingSpeakerCosts, proposalTrainingSpeakerCosts.trainingId, trainingId, proposalTrainingSpeakerCosts.id,
          t.speakerCosts || [],
          (s) => ({ id: uuidv7(), trainingId, itemName: s.itemName, hours: s.hours, ratePerHour: String(s.ratePerHour), days: s.days }),
          (s) => ({ itemName: s.itemName, hours: s.hours, ratePerHour: String(s.ratePerHour), days: s.days })
        );

        // Sync ตัวหลาน (Food Costs)
        await syncSubTable(
          tx, proposalTrainingFoodCosts, proposalTrainingFoodCosts.trainingId, trainingId, proposalTrainingFoodCosts.id,
          t.foodCosts || [],
          (f) => ({ id: uuidv7(), trainingId, itemName: f.itemName, mealsCount: f.mealsCount, ratePerMeal: String(f.ratePerMeal), traineesCount: f.traineesCount, days: f.days }),
          (f) => ({ itemName: f.itemName, mealsCount: f.mealsCount, ratePerMeal: String(f.ratePerMeal), traineesCount: f.traineesCount, days: f.days })
        );
      }

      // ============================================================================
      // 4. จัดการตารางลูก 2 ชั้น (Cloud Requests -> VMs)
      // ============================================================================
      const payloadClouds = data.cloudRequests || [];
      const existingClouds = await tx.select({ id: proposalCloudRequests.id }).from(proposalCloudRequests).where(eq(proposalCloudRequests.proposalId, proposalId));
      const existingCloudIds = new Set(existingClouds.map((r: any) => r.id));
      const payloadCloudIds = new Set(payloadClouds.filter((c: any) => c.id).map((c: any) => c.id));

      const cloudsToDelete = [...existingCloudIds].filter(id => !payloadCloudIds.has(id));
      if (cloudsToDelete.length > 0) {
        await tx.delete(proposalCloudRequests).where(inArray(proposalCloudRequests.id, cloudsToDelete));
      }

      for (const req of payloadClouds) {
        let cloudReqId = req.id;
        // Upsert ตัวแม่ (Cloud Request)
        if (!cloudReqId || !existingCloudIds.has(cloudReqId)) {
          cloudReqId = uuidv7();
          await tx.insert(proposalCloudRequests).values({
            id: cloudReqId, proposalId, systemName: req.systemName, 
            requestedServiceDate: req.requestedServiceDate ? new Date(req.requestedServiceDate) : null, 
            recordedRequestDate: req.recordedRequestDate ? new Date(req.recordedRequestDate) : null
          });
        } else {
          await tx.update(proposalCloudRequests).set({
            systemName: req.systemName, 
            requestedServiceDate: req.requestedServiceDate ? new Date(req.requestedServiceDate) : null, 
            recordedRequestDate: req.recordedRequestDate ? new Date(req.recordedRequestDate) : null
          }).where(eq(proposalCloudRequests.id, cloudReqId));
        }

        // Sync ตัวหลาน (VMs)
        await syncSubTable(
          tx, proposalCloudVms, proposalCloudVms.cloudRequestId, cloudReqId, proposalCloudVms.id,
          req.vms || [],
          (vm) => ({ id: uuidv7(), cloudRequestId: cloudReqId, vmDescription: vm.vmDescription, osDatabase: vm.osDatabase, vcpu: vm.vcpu, ramGb: vm.ramGb, gpuGb: vm.gpuGb, storageGb: vm.storageGb, price: vm.price ? String(vm.price) : "0" }),
          (vm) => ({ vmDescription: vm.vmDescription, osDatabase: vm.osDatabase, vcpu: vm.vcpu, ramGb: vm.ramGb, gpuGb: vm.gpuGb, storageGb: vm.storageGb, price: vm.price ? String(vm.price) : "0" })
        );
      }

      // ============================================================================
      // 5. ปิดท้าย: ลบ Draft ออกเมื่อ Submit ข้อมูลจริงเรียบร้อยแล้ว
      // ============================================================================
      await tx.delete(proposalDrafts).where(eq(proposalDrafts.projectId, data.projectId));

      return { id: proposalId };
    });
  },

  // Garbage Collection: ลบ Draft ที่ไม่มีการอัปเดตเกิน N วัน
  async deleteStaleDrafts(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await db.delete(proposalDrafts).where(lt(proposalDrafts.updatedAt, cutoffDate));
  }
};
