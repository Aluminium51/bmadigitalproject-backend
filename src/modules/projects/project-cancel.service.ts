import { and, eq, inArray, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { HTTPException } from "hono/http-exception";
import { db } from "../../db";
import { projects } from "../../db/schema/projects";
import { proposalDrafts } from "../../db/schema/proposal_drafts";
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
import { projectStatusLogs } from "../../db/schema/project_status_logs";
import { PROJECT_STATUS } from "./project-workflow";
import type { UserContext } from "../../utils/permission.helper";

type Executor = any;

/**
 * Converts the normalized submitted-proposal rows back into the payload shape
 * understood by the existing proposal wizard. The operation runs with the
 * transaction executor so the draft can never be created from a partial read.
 */
async function buildDraftPayload(tx: Executor, proposalId: string) {
  const [proposal] = await tx
    .select()
    .from(proposals)
    .where(eq(proposals.id, proposalId))
    .limit(1);

  if (!proposal) {
    throw new HTTPException(409, { message: "Submitted proposal not found" });
  }

  const [
    budgets,
    relatedProjects,
    manpower,
    existingEquipments,
    hardwareCosts,
    softwareCosts,
    personnelCosts,
    personnelResponsibilities,
    trainings,
    otherCosts,
    ictPersonnel,
    cloudRequests,
  ] = await Promise.all([
    tx.select().from(proposalBudgets).where(eq(proposalBudgets.proposalId, proposalId)),
    tx.select().from(proposalRelatedProjects).where(eq(proposalRelatedProjects.proposalId, proposalId)),
    tx.select().from(proposalManpower).where(eq(proposalManpower.proposalId, proposalId)),
    tx.select().from(proposalExistingEquipments).where(eq(proposalExistingEquipments.proposalId, proposalId)),
    tx.select().from(proposalHardwareCosts).where(eq(proposalHardwareCosts.proposalId, proposalId)),
    tx.select().from(proposalSoftwareCosts).where(eq(proposalSoftwareCosts.proposalId, proposalId)),
    tx.select().from(proposalPersonnelCosts).where(eq(proposalPersonnelCosts.proposalId, proposalId)),
    tx.select().from(proposalPersonnelResponsibilities).where(eq(proposalPersonnelResponsibilities.proposalId, proposalId)),
    tx.select().from(proposalTrainings).where(eq(proposalTrainings.proposalId, proposalId)),
    tx.select().from(proposalOtherCosts).where(eq(proposalOtherCosts.proposalId, proposalId)),
    tx.select().from(proposalIctPersonnel).where(eq(proposalIctPersonnel.proposalId, proposalId)),
    tx.select().from(proposalCloudRequests).where(eq(proposalCloudRequests.proposalId, proposalId)),
  ]);

  const trainingIds = trainings.map((training: any) => training.id);
  const cloudRequestIds = cloudRequests.map((request: any) => request.id);
  const [nestedSpeakerCosts, nestedFoodCosts, nestedCloudVms] = await Promise.all([
    trainingIds.length
      ? tx.select().from(proposalTrainingSpeakerCosts).where(inArray(proposalTrainingSpeakerCosts.trainingId, trainingIds))
      : Promise.resolve([]),
    trainingIds.length
      ? tx.select().from(proposalTrainingFoodCosts).where(inArray(proposalTrainingFoodCosts.trainingId, trainingIds))
      : Promise.resolve([]),
    cloudRequestIds.length
      ? tx.select().from(proposalCloudVms).where(inArray(proposalCloudVms.cloudRequestId, cloudRequestIds))
      : Promise.resolve([]),
  ]);

  const scalarPayload = {
    projectName: proposal.projectName,
    agencyName: proposal.agencyName,
    headOfAgency: proposal.headOfAgency,
    dcioName: proposal.dcioName,
    projectManager: proposal.projectManager,
    totalBudget: proposal.totalBudget,
    background: proposal.background,
    objective: proposal.objective,
    target: proposal.target,
    scope: proposal.scope,
    projectType: proposal.projectType,
    currentSystemStatus: proposal.currentSystemStatus,
    currentProblems: proposal.currentProblems,
    isBmaPlan: proposal.isBmaPlan,
    isAgencyPlan: proposal.isAgencyPlan,
    agencyStrategy: proposal.agencyStrategy,
    agencyIssue: proposal.agencyIssue,
    agencyKpi: proposal.agencyKpi,
    isGovernorPolicy: proposal.isGovernorPolicy,
    governorPolicyCode: proposal.governorPolicyCode,
    governorPolicyName: proposal.governorPolicyName,
    obstacleLaws: proposal.obstacleLaws,
    appArchitecture: proposal.appArchitecture,
    dataOwner: proposal.dataOwner,
    dataExchangePlan: proposal.dataExchangePlan,
    isReady: proposal.isReady,
    readinessDetails: proposal.readinessDetails,
    durationDays: proposal.durationDays,
    otherReadiness: proposal.otherReadiness,
    expectedBenefits: proposal.expectedBenefits,
    isInRoadmap: proposal.isInRoadmap,
  };

  return {
    ...scalarPayload,
    budgetsByYear: budgets,
    relatedProjects,
    manpower,
    existingEquipment: existingEquipments,
    hardwareCosts,
    softwareCosts,
    personnelCoreCosts: personnelCosts.filter((row: any) => row.personnelType === "CORE"),
    personnelAsstCosts: personnelCosts.filter((row: any) => row.personnelType === "ASST"),
    personnelSuppCosts: personnelCosts.filter((row: any) => row.personnelType === "SUPP"),
    personnelResponsibilities,
    trainingCourses: trainings.map((training: any) => ({
      ...training,
      speakerCosts: nestedSpeakerCosts.filter((row: any) => row.trainingId === training.id),
      foodCosts: nestedFoodCosts.filter((row: any) => row.trainingId === training.id),
    })),
    otherCosts,
    ictPersonnel,
    cloudRequests: cloudRequests.map((request: any) => ({
      ...request,
      vms: nestedCloudVms.filter((row: any) => row.cloudRequestId === request.id),
    })),
  };
}

export async function cancelProjectSubmit(projectId: string, user: UserContext) {
  const [project] = await db
    .select({ id: projects.id, ownerId: projects.userId, statusId: projects.projectStatusId })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) throw new HTTPException(404, { message: "Project not found" });
  if (project.ownerId !== user.userId) {
    throw new HTTPException(403, { message: "Only the project owner can cancel submission" });
  }
  if (project.statusId !== PROJECT_STATUS.PENDING_SECRETARY) {
    throw new HTTPException(409, {
      message: "This project can only be cancelled before Secretary review begins",
    });
  }

  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ id: projects.id, statusId: projects.projectStatusId, projectName: projects.projectName })
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.userId, user.userId),
        eq(projects.projectStatusId, PROJECT_STATUS.PENDING_SECRETARY),
        isNull(projects.deletedAt),
      ))
      .limit(1);

    if (!current) {
      throw new HTTPException(409, {
        message: "Project status changed before cancellation completed",
      });
    }

    const [submitted] = await tx
      .select({ id: proposals.id })
      .from(proposals)
      .where(eq(proposals.projectId, projectId))
      .limit(1);

    if (!submitted) {
      throw new HTTPException(409, { message: "Submitted proposal not found" });
    }

    const submittedPayload = await buildDraftPayload(tx, submitted.id);
    const draftPayload = {
      ...submittedPayload,
      projectName: current.projectName ?? submittedPayload.projectName,
    };
    const now = new Date();

    // Create the complete editable draft first. If any nested read or insert
    // fails, the submitted proposal remains intact because the transaction
    // rolls back.
    await tx.insert(proposalDrafts).values({
      id: uuidv7(),
      projectId,
      userId: user.userId,
      projectName: draftPayload.projectName,
      objective: draftPayload.objective,
      totalBudget: draftPayload.totalBudget === null || draftPayload.totalBudget === undefined
        ? null
        : String(draftPayload.totalBudget),
      currentStep: 1,
      draftPayload,
      updatedBy: user.userId,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: proposalDrafts.projectId,
      set: {
        userId: user.userId,
        projectName: draftPayload.projectName,
        objective: draftPayload.objective,
        totalBudget: draftPayload.totalBudget === null || draftPayload.totalBudget === undefined
          ? null
          : String(draftPayload.totalBudget),
        currentStep: 1,
        draftPayload,
        updatedBy: user.userId,
        updatedAt: now,
      },
    });

    await tx.delete(proposals).where(and(
      eq(proposals.id, submitted.id),
      eq(proposals.projectId, projectId),
    ));

    const updated = await tx
      .update(projects)
      .set({
        projectStatusId: PROJECT_STATUS.DRAFT,
        updatedBy: user.userId,
        updatedAt: now,
      })
      .where(and(
        eq(projects.id, projectId),
        eq(projects.userId, user.userId),
        eq(projects.projectStatusId, PROJECT_STATUS.PENDING_SECRETARY),
        isNull(projects.deletedAt),
      ))
      .returning({ id: projects.id });

    if (updated.length === 0) {
      throw new HTTPException(409, {
        message: "Project status changed before cancellation completed",
      });
    }

    await tx.insert(projectStatusLogs).values({
      projectId,
      userId: user.userId,
      oldStatusId: PROJECT_STATUS.PENDING_SECRETARY,
      newStatusId: PROJECT_STATUS.DRAFT,
      remark: "Owner cancelled project submission",
      createdAt: now,
    });
  });
}
