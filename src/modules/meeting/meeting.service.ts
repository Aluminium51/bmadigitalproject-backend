import { and, asc, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { v7 as uuidv7 } from "uuid";
import { basename, join } from "node:path";
import { unlink } from "node:fs/promises";
import { db } from "../../db";
import { agendas, meetingAttachments, meetings, resolutions } from "../../db/schema/meetings";
import { meetingResolutionRevisions } from "../../db/schema/meeting_resolution_revisions";
import { workflowAuditEvents } from "../../db/schema/workflow_audit_events";
import { projects } from "../../db/schema/projects";
import { proposalDrafts } from "../../db/schema/proposal_drafts";
import { proposalBudgets, proposals } from "../../db/schema/proposals";
import { meetingStatuses, meetingTypes } from "../../db/schema/lookups";
import { users } from "../../db/schema/users";
import type { UserContext } from "../../shared/auth/permission.helper";
import type { PdfCompressor } from "../../shared/app/services";
import { UploadService, UPLOAD_STORAGE_DIR } from "../uploads/upload.service";
import { sumProposalBudgets } from "../proposals/proposal-budget.util";
import { submitProposalSchema } from "../proposals/proposal.schema";
import { buildDraftPayload } from "../projects/project-cancel.service";
import {
  PROJECT_STATUS,
  applyProjectStatusReconciliation,
  applyProjectStatusTransition,
  type ProjectReturnStage,
} from "../projects/project-workflow";
import type {
  CancelMeetingDTO,
  CorrectResolutionDTO,
  CreateAgendaDTO,
  CreateMeetingDTO,
  EditResolutionDTO,
  RecordResolutionDTO,
  ReorderAgendasDTO,
  TransitionMeetingStatusDTO,
  UpdateAgendaDTO,
  UpdateMeetingDTO,
} from "./meeting.schema";

export const MEETING_STATUS = { SCHEDULED: 1, IN_PROGRESS: 2, COMPLETED: 3, CANCELLED: 4, DRAFT: 5 } as const;
export const MEETING_TYPE = { SMALL_BOARD: 1, BIG_BOARD: 2 } as const;
export type ResolutionType = RecordResolutionDTO["resolutionType"];

const RESOLUTION_LEGACY_STATUS_ID: Record<ResolutionType, number> = {
  APPROVED: 1,
  CONDITIONAL_APPROVAL: 2,
  NOT_APPROVED: 3,
  ACKNOWLEDGED: 4,
  RECONSIDER: 6,
  NOT_CONSIDERED: 7,
};

export const MEETING_TRANSITIONS: Readonly<Record<number, readonly number[]>> = {
  [MEETING_STATUS.DRAFT]: [MEETING_STATUS.SCHEDULED, MEETING_STATUS.CANCELLED],
  [MEETING_STATUS.SCHEDULED]: [MEETING_STATUS.IN_PROGRESS, MEETING_STATUS.CANCELLED],
  [MEETING_STATUS.IN_PROGRESS]: [MEETING_STATUS.COMPLETED, MEETING_STATUS.CANCELLED],
};

function roles(user: UserContext) {
  return user.roles.map((role) => String(role).toLowerCase());
}

function assertSecretary(user: UserContext) {
  if (!roles(user).includes("secretary")) {
    throw new HTTPException(403, { message: "Only users with the SECRETARY role may perform this meeting operation" });
  }
}

function assertSuperAdmin(user: UserContext) {
  if (!roles(user).includes("super_admin")) {
    throw new HTTPException(403, { message: "Only Super Admin may perform this correction" });
  }
}

function isSecretary(user: UserContext) {
  return roles(user).includes("secretary");
}

function isConstraintViolation(error: unknown, code: string) {
  return (error as { code?: unknown } | null)?.code === code;
}

function boardExpectedStatus(meetingTypeId: number) {
  if (meetingTypeId === MEETING_TYPE.SMALL_BOARD) return PROJECT_STATUS.PENDING_SMALL_BOARD;
  if (meetingTypeId === MEETING_TYPE.BIG_BOARD) return PROJECT_STATUS.PENDING_BIG_BOARD;
  throw new HTTPException(409, { message: "Meeting type is not a supported board stage" });
}

export function resolutionOutcome(meetingTypeId: number, resolutionType: ResolutionType) {
  const isReturn = resolutionType === "CONDITIONAL_APPROVAL" || resolutionType === "RECONSIDER";
  const isReject = resolutionType === "NOT_APPROVED" || resolutionType === "NOT_CONSIDERED";
  if (meetingTypeId === MEETING_TYPE.SMALL_BOARD) {
    return {
      statusId: isReturn
        ? PROJECT_STATUS.RETURNED_FROM_SMALL_BOARD
        : isReject
          ? PROJECT_STATUS.REJECTED_BY_SMALL_BOARD
          : PROJECT_STATUS.PENDING_BIG_BOARD,
      returnStage: isReturn ? "SMALL_BOARD" as const : null,
      successfulBigBoard: false,
    };
  }
  if (meetingTypeId === MEETING_TYPE.BIG_BOARD) {
    return {
      statusId: resolutionType === "APPROVED"
        ? PROJECT_STATUS.APPROVED
        : resolutionType === "ACKNOWLEDGED"
          ? PROJECT_STATUS.ACKNOWLEDGED
          : isReturn
            ? PROJECT_STATUS.RETURNED_FROM_BIG_BOARD
            : PROJECT_STATUS.REJECTED_BY_BIG_BOARD,
      returnStage: isReturn ? "BIG_BOARD" as const : null,
      successfulBigBoard: resolutionType === "APPROVED" || resolutionType === "ACKNOWLEDGED",
    };
  }
  throw new HTTPException(409, { message: "Meeting type is not a supported board stage" });
}

async function getLatestSubmittedProposal(executor: any, projectId: string, lock = false) {
  let query = executor.select({ id: proposals.id, totalBudget: proposals.totalBudget })
    .from(proposals)
    .where(and(eq(proposals.projectId, projectId), eq(proposals.status, "submitted")))
    .orderBy(desc(proposals.updatedAt))
    .limit(1);
  if (lock) query = query.for("update");
  const [proposal] = await query;
  if (!proposal) throw new HTTPException(409, { message: "Latest submitted proposal was not found" });
  return proposal;
}

async function getExactProposalBudget(executor: any, projectId: string, lock = false) {
  const proposal = await getLatestSubmittedProposal(executor, projectId, lock);
  let query = executor.select({ amount: proposalBudgets.amount })
    .from(proposalBudgets)
    .where(eq(proposalBudgets.proposalId, proposal.id));
  if (lock) query = query.for("update");
  const rows = await query;
  return sumProposalBudgets(rows.length > 0 ? rows : [{ amount: proposal.totalBudget }]);
}

async function persistRestoredDraft(executor: any, project: { id: string; ownerId: string; projectName: string | null }, actorId: string) {
  const proposal = await getLatestSubmittedProposal(executor, project.id, true);
  const restored = await buildDraftPayload(executor, proposal.id);
  const payload = { ...restored, projectName: project.projectName ?? restored.projectName };
  const validated = submitProposalSchema.safeParse(payload);
  if (!validated.success) {
    throw new HTTPException(409, { message: "Submitted proposal cannot be restored as an editable draft" });
  }
  const now = new Date();
  const [draft] = await executor.insert(proposalDrafts).values({
    id: uuidv7(), projectId: project.id, userId: project.ownerId,
    projectName: payload.projectName, objective: payload.objective,
    totalBudget: String(sumProposalBudgets(validated.data.budgetsByYear.length
      ? validated.data.budgetsByYear
      : [{ amount: validated.data.totalBudget }])),
    currentStep: 1, draftPayload: validated.data, updatedBy: actorId, updatedAt: now,
  }).onConflictDoUpdate({
    target: proposalDrafts.projectId,
    set: {
      userId: project.ownerId, projectName: payload.projectName, objective: payload.objective,
      totalBudget: String(sumProposalBudgets(validated.data.budgetsByYear.length
        ? validated.data.budgetsByYear
        : [{ amount: validated.data.totalBudget }])),
      currentStep: 1, draftPayload: validated.data, updatedBy: actorId, updatedAt: now,
    },
  }).returning({ id: proposalDrafts.id, draftPayload: proposalDrafts.draftPayload });
  if (!draft || !submitProposalSchema.safeParse(draft.draftPayload).success) {
    throw new HTTPException(409, { message: "Restored proposal draft failed verification" });
  }
}

async function audit(executor: any, input: { actorId: string; action: string; entityType: string; entityId: string; reason?: string | null; metadata?: unknown }) {
  await executor.insert(workflowAuditEvents).values({
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    reason: input.reason?.trim() || null,
    metadata: input.metadata ?? null,
  });
}

async function assertMeetingReadAccess(meetingId: string, user: UserContext) {
  if (isSecretary(user)) return;
  const [accessible] = await db.select({ id: meetings.id })
    .from(meetings)
    .innerJoin(agendas, eq(agendas.meetingId, meetings.id))
    .innerJoin(projects, eq(projects.id, agendas.projectId))
    .where(and(
      eq(meetings.id, meetingId),
      or(eq(projects.userId, user.userId), eq(projects.analystId, user.userId)),
      isNull(projects.deletedAt),
    )).limit(1);
  if (!accessible) throw new HTTPException(404, { message: "Meeting not found" });
}

async function meetingRow(meetingId: string) {
  const [row] = await db.select({
    meeting: meetings,
    meetingType: { id: meetingTypes.id, code: meetingTypes.code, name: meetingTypes.name },
    meetingStatus: { id: meetingStatuses.id, code: meetingStatuses.code, name: meetingStatuses.name },
    creator: { userId: users.userId, firstName: users.firstName, lastName: users.lastName },
    unresolvedResolutionCount: sql<number>`(
      select count(*)::int from agendas a
      left join resolutions r on r.agenda_id = a.id
      where a.meeting_id = ${meetings.id} and a.project_id is not null and r.id is null
    )`,
  }).from(meetings)
    .leftJoin(meetingTypes, eq(meetings.meetingTypeId, meetingTypes.id))
    .leftJoin(meetingStatuses, eq(meetings.meetingStatusId, meetingStatuses.id))
    .leftJoin(users, eq(meetings.createdBy, users.userId))
    .where(eq(meetings.id, meetingId)).limit(1);
  if (!row) throw new HTTPException(404, { message: "Meeting not found" });
  return { ...row.meeting, meetingType: row.meetingType?.id ? row.meetingType : null, meetingStatus: row.meetingStatus?.id ? row.meetingStatus : null, creator: row.creator?.userId ? row.creator : null, unresolvedResolutionCount: Number(row.unresolvedResolutionCount ?? 0) };
}

async function lockMeeting(executor: any, meetingId: string) {
  const [meeting] = await executor.select().from(meetings).where(eq(meetings.id, meetingId)).for("update").limit(1);
  if (!meeting) throw new HTTPException(404, { message: "Meeting not found" });
  return meeting;
}

async function assertAgendaEditable(meeting: { meetingStatusId: number }) {
  if (
    !([MEETING_STATUS.DRAFT, MEETING_STATUS.SCHEDULED] as number[]).includes(
      meeting.meetingStatusId,
    )
  ) {
    throw new HTTPException(409, { message: "Meeting agendas are locked after the meeting starts" });
  }
}

async function assertProjectAssignmentAllowed(executor: any, meeting: { id: string; meetingTypeId: number }, projectId: string) {
  const [project] = await executor.select({ id: projects.id, statusId: projects.projectStatusId })
    .from(projects).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).for("update").limit(1);
  if (!project) throw new HTTPException(400, { message: "Selected project does not exist" });
  const expectedStatus = boardExpectedStatus(meeting.meetingTypeId);
  if (project.statusId !== expectedStatus) {
    throw new HTTPException(409, { message: "Project is not pending for this board stage" });
  }
  const [unresolved] = await executor.select({ agendaId: agendas.id })
    .from(agendas)
    .innerJoin(meetings, eq(meetings.id, agendas.meetingId))
    .leftJoin(resolutions, eq(resolutions.agendaId, agendas.id))
    .where(and(
      eq(agendas.projectId, projectId),
      eq(meetings.meetingTypeId, meeting.meetingTypeId),
      ne(meetings.meetingStatusId, MEETING_STATUS.CANCELLED),
      isNull(resolutions.id),
      ne(meetings.id, meeting.id),
    )).limit(1);
  if (unresolved) throw new HTTPException(409, { message: "Project already has an unresolved assignment for this board stage" });
}

async function scopedAgendas(meetingId: string, user: UserContext) {
  const conditions = [eq(agendas.meetingId, meetingId)];
  if (!isSecretary(user)) {
    conditions.push(or(eq(projects.userId, user.userId), eq(projects.analystId, user.userId))!);
  }
  return db.select({
    id: agendas.id, meetingId: agendas.meetingId, projectId: agendas.projectId,
    agendaNumber: agendas.agendaNumber, sortOrder: agendas.sortOrder,
    agendaTypeId: agendas.agendaTypeId, title: agendas.title, description: agendas.description,
    createdAt: agendas.createdAt, updatedAt: agendas.updatedAt,
    project: { id: projects.id, projectCode: projects.projectCode, projectName: projects.projectName, latestApprovedBudget: projects.latestApprovedBudget, projectStatusId: projects.projectStatusId },
    resolution: { id: resolutions.id, resolutionType: resolutions.resolutionType, remark: resolutions.remark, version: resolutions.version, resolvedAt: resolutions.resolvedAt },
  }).from(agendas)
    .leftJoin(projects, eq(projects.id, agendas.projectId))
    .leftJoin(resolutions, eq(resolutions.agendaId, agendas.id))
    .where(and(...conditions))
    .orderBy(asc(agendas.sortOrder), asc(agendas.id));
}

async function resolutionContext(executor: any, meetingId: string, agendaId: string) {
  const meeting = await lockMeeting(executor, meetingId);
  const [agenda] = await executor.select().from(agendas)
    .where(and(eq(agendas.id, agendaId), eq(agendas.meetingId, meetingId))).for("update").limit(1);
  if (!agenda) throw new HTTPException(404, { message: "Agenda not found" });
  if (!agenda.projectId) throw new HTTPException(400, { message: "General agendas cannot receive project resolutions" });
  const [project] = await executor.select({
    id: projects.id, ownerId: projects.userId, statusId: projects.projectStatusId,
    analystId: projects.analystId, projectName: projects.projectName,
    latestApprovedBudget: projects.latestApprovedBudget,
  }).from(projects).where(and(eq(projects.id, agenda.projectId), isNull(projects.deletedAt))).for("update").limit(1);
  if (!project) throw new HTTPException(404, { message: "Project not found" });
  return { meeting, agenda, project };
}

async function downstreamDependencies(executor: any, context: Awaited<ReturnType<typeof resolutionContext>>, current: { id: string; updatedAt: Date }) {
  const dependencies: string[] = [];
  const [ownerDraft] = await executor.select({ id: proposalDrafts.id }).from(proposalDrafts)
    .where(and(
      eq(proposalDrafts.projectId, context.project.id),
      eq(proposalDrafts.updatedBy, context.project.ownerId),
      sql`${proposalDrafts.updatedAt} > ${current.updatedAt}`,
    )).limit(1);
  if (ownerDraft) dependencies.push("owner_draft_modified");
  const [laterAgenda] = await executor.select({ id: agendas.id }).from(agendas)
    .innerJoin(meetings, eq(meetings.id, agendas.meetingId))
    .where(and(
      eq(agendas.projectId, context.project.id),
      ne(agendas.id, context.agenda.id),
      sql`${agendas.createdAt} > ${current.updatedAt}`,
    )).limit(1);
  if (laterAgenda) dependencies.push("later_agenda_exists");
  return dependencies;
}

export const meetingService = {
  async createMeeting(data: CreateMeetingDTO, user: UserContext) {
    assertSecretary(user);
    const [meeting] = await db.insert(meetings).values({
      id: uuidv7(), meetingNo: data.meetingNo, title: data.title,
      meetingTypeId: data.meetingTypeId, meetingDate: new Date(data.meetingDate),
      startTime: new Date(data.startTime ?? data.meetingDate),
      endTime: data.endTime ? new Date(data.endTime) : null,
      location: data.location ?? null, description: data.description ?? null,
      meetingStatusId: MEETING_STATUS.DRAFT, createdBy: user.userId,
    }).returning();
    await audit(db, { actorId: user.userId, action: "MEETING_CREATED", entityType: "MEETING", entityId: meeting.id });
    return meetingRow(meeting.id);
  },

  async getAllMeetings(user: UserContext) {
    let ids: string[] | undefined;
    if (!isSecretary(user)) {
      const rows = await db.selectDistinct({ id: meetings.id }).from(meetings)
        .innerJoin(agendas, eq(agendas.meetingId, meetings.id))
        .innerJoin(projects, eq(projects.id, agendas.projectId))
        .where(and(or(eq(projects.userId, user.userId), eq(projects.analystId, user.userId)), isNull(projects.deletedAt)));
      ids = rows.map((row) => row.id);
      if (ids.length === 0) return [];
    }
    const rows = await db.select({ id: meetings.id }).from(meetings)
      .where(ids ? inArray(meetings.id, ids) : undefined)
      .orderBy(desc(meetings.meetingDate));
    return Promise.all(rows.map((row) => meetingRow(row.id)));
  },

  async getMeetingById(id: string, user: UserContext) {
    await assertMeetingReadAccess(id, user);
    return { ...(await meetingRow(id)), agendas: await scopedAgendas(id, user) };
  },

  async updateMeeting(id: string, data: UpdateMeetingDTO, user: UserContext) {
    assertSecretary(user);
    return db.transaction(async (tx) => {
      const current = await lockMeeting(tx, id);
      if (![MEETING_STATUS.DRAFT, MEETING_STATUS.SCHEDULED].includes(current.meetingStatusId)) {
        throw new HTTPException(409, { message: "Completed, cancelled, or active meetings cannot be edited" });
      }
      const [updated] = await tx.update(meetings).set({
        ...(data.meetingNo !== undefined ? { meetingNo: data.meetingNo } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.meetingTypeId !== undefined ? { meetingTypeId: data.meetingTypeId } : {}),
        ...(data.meetingDate !== undefined ? { meetingDate: new Date(data.meetingDate) } : {}),
        ...(data.startTime !== undefined ? { startTime: new Date(data.startTime) } : {}),
        ...(data.endTime !== undefined ? { endTime: data.endTime ? new Date(data.endTime) : null } : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        updatedBy: user.userId, updatedAt: new Date(),
      }).where(and(eq(meetings.id, id), eq(meetings.meetingStatusId, current.meetingStatusId))).returning();
      if (!updated) throw new HTTPException(409, { message: "Meeting changed before the update completed" });
      await audit(tx, { actorId: user.userId, action: "MEETING_UPDATED", entityType: "MEETING", entityId: id });
      return updated;
    });
  },

  async transitionStatus(id: string, data: TransitionMeetingStatusDTO, user: UserContext) {
    assertSecretary(user);
    const target = MEETING_STATUS[data.status];
    await db.transaction(async (tx) => {
      const current = await lockMeeting(tx, id);
      if (!MEETING_TRANSITIONS[current.meetingStatusId]?.includes(target)) {
        throw new HTTPException(409, { message: "Invalid meeting status transition" });
      }
      if (target === MEETING_STATUS.COMPLETED) {
        const [unresolved] = await tx.select({ id: agendas.id }).from(agendas)
          .leftJoin(resolutions, eq(resolutions.agendaId, agendas.id))
          .where(and(
            eq(agendas.meetingId, id),
            sql`${agendas.projectId} is not null`,
            isNull(resolutions.id),
          )).limit(1);
        if (unresolved) {
          throw new HTTPException(409, { message: "Every project-linked agenda must have a resolution before completion" });
        }
      }
      const now = new Date();
      const [updated] = await tx.update(meetings).set({
        meetingStatusId: target,
        completedAt: target === MEETING_STATUS.COMPLETED ? now : current.completedAt,
        updatedBy: user.userId, updatedAt: now,
      }).where(and(eq(meetings.id, id), eq(meetings.meetingStatusId, current.meetingStatusId))).returning({ id: meetings.id });
      if (!updated) throw new HTTPException(409, { message: "Meeting status changed before this request completed" });
      await audit(tx, { actorId: user.userId, action: `MEETING_${data.status}`, entityType: "MEETING", entityId: id });
    });
    return meetingRow(id);
  },

  async cancelMeeting(id: string, data: CancelMeetingDTO, user: UserContext) {
    assertSecretary(user);
    await db.transaction(async (tx) => {
      const current = await lockMeeting(tx, id);
      if (!MEETING_TRANSITIONS[current.meetingStatusId]?.includes(MEETING_STATUS.CANCELLED)) {
        throw new HTTPException(409, { message: "Meeting cannot be cancelled from its current state" });
      }
      if (current.meetingStatusId === MEETING_STATUS.IN_PROGRESS) {
        const [existingResolution] = await tx.select({ id: resolutions.id }).from(resolutions)
          .innerJoin(agendas, eq(agendas.id, resolutions.agendaId))
          .where(eq(agendas.meetingId, id)).limit(1);
        if (existingResolution) throw new HTTPException(409, { message: "An in-progress meeting with resolutions cannot be cancelled" });
      }
      const now = new Date();
      const [updated] = await tx.update(meetings).set({
        meetingStatusId: MEETING_STATUS.CANCELLED,
        cancelledAt: now, cancelReason: data.reason,
        updatedBy: user.userId, updatedAt: now,
      }).where(and(eq(meetings.id, id), eq(meetings.meetingStatusId, current.meetingStatusId))).returning({ id: meetings.id });
      if (!updated) throw new HTTPException(409, { message: "Meeting changed before cancellation completed" });
      await audit(tx, { actorId: user.userId, action: "MEETING_CANCELLED", entityType: "MEETING", entityId: id, reason: data.reason });
    });
    return meetingRow(id);
  },

  async getAgendas(meetingId: string, user: UserContext) {
    await assertMeetingReadAccess(meetingId, user);
    return scopedAgendas(meetingId, user);
  },

  async createAgenda(meetingId: string, data: CreateAgendaDTO, user: UserContext) {
    assertSecretary(user);
    try {
      return await db.transaction(async (tx) => {
        const meeting = await lockMeeting(tx, meetingId);
        await assertAgendaEditable(meeting);
        if (data.projectId) await assertProjectAssignmentAllowed(tx, meeting, data.projectId);
        const [{ nextOrder }] = await tx.select({ nextOrder: sql<number>`coalesce(max(${agendas.sortOrder}), 0) + 1` })
          .from(agendas).where(eq(agendas.meetingId, meetingId));
        const [agenda] = await tx.insert(agendas).values({
          id: uuidv7(), meetingId, projectId: data.projectId ?? null,
          agendaNumber: data.agendaNumber, sortOrder: data.sortOrder ?? Number(nextOrder),
          agendaTypeId: data.agendaTypeId, title: data.title, description: data.description ?? null,
        }).returning();
        await audit(tx, { actorId: user.userId, action: "AGENDA_CREATED", entityType: "AGENDA", entityId: agenda.id });
        return agenda;
      });
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      if (isConstraintViolation(error, "23505")) throw new HTTPException(409, { message: "Duplicate agenda sequence or project assignment" });
      throw error;
    }
  },

  async updateAgenda(meetingId: string, agendaId: string, data: UpdateAgendaDTO, user: UserContext) {
    assertSecretary(user);
    return db.transaction(async (tx) => {
      const meeting = await lockMeeting(tx, meetingId);
      await assertAgendaEditable(meeting);
      const [current] = await tx.select().from(agendas)
        .where(and(eq(agendas.id, agendaId), eq(agendas.meetingId, meetingId))).for("update").limit(1);
      if (!current) throw new HTTPException(404, { message: "Agenda not found" });
      if (data.projectId && data.projectId !== current.projectId) await assertProjectAssignmentAllowed(tx, meeting, data.projectId);
      const [updated] = await tx.update(agendas).set({
        ...(data.projectId !== undefined ? { projectId: data.projectId } : {}),
        ...(data.agendaNumber !== undefined ? { agendaNumber: data.agendaNumber } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.agendaTypeId !== undefined ? { agendaTypeId: data.agendaTypeId } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        updatedAt: new Date(),
      }).where(eq(agendas.id, agendaId)).returning();
      await audit(tx, { actorId: user.userId, action: "AGENDA_UPDATED", entityType: "AGENDA", entityId: agendaId });
      return updated;
    });
  },

  async deleteAgenda(meetingId: string, agendaId: string, user: UserContext) {
    assertSecretary(user);
    await db.transaction(async (tx) => {
      const meeting = await lockMeeting(tx, meetingId);
      await assertAgendaEditable(meeting);
      const [resolution] = await tx.select({ id: resolutions.id }).from(resolutions).where(eq(resolutions.agendaId, agendaId)).limit(1);
      if (resolution) throw new HTTPException(409, { message: "An agenda with a resolution cannot be deleted" });
      const [deleted] = await tx.delete(agendas).where(and(eq(agendas.id, agendaId), eq(agendas.meetingId, meetingId))).returning({ id: agendas.id });
      if (!deleted) throw new HTTPException(404, { message: "Agenda not found" });
      await audit(tx, { actorId: user.userId, action: "AGENDA_DELETED", entityType: "AGENDA", entityId: agendaId });
    });
    return { success: true };
  },

  async reorderAgendas(meetingId: string, data: ReorderAgendasDTO, user: UserContext) {
    assertSecretary(user);
    await db.transaction(async (tx) => {
      const meeting = await lockMeeting(tx, meetingId);
      await assertAgendaEditable(meeting);
      const ids = data.items.map((item) => item.agendaId);
      const owned = await tx.select({ id: agendas.id }).from(agendas).where(and(eq(agendas.meetingId, meetingId), inArray(agendas.id, ids))).for("update");
      if (owned.length !== ids.length) throw new HTTPException(404, { message: "One or more agendas were not found in this meeting" });
      await tx.update(agendas).set({ sortOrder: sql`${agendas.sortOrder} + 100000` }).where(and(eq(agendas.meetingId, meetingId), inArray(agendas.id, ids)));
      for (const item of data.items) {
        await tx.update(agendas).set({ sortOrder: item.sortOrder, updatedAt: new Date() }).where(eq(agendas.id, item.agendaId));
      }
      await audit(tx, { actorId: user.userId, action: "AGENDAS_REORDERED", entityType: "MEETING", entityId: meetingId, metadata: data.items });
    });
    return scopedAgendas(meetingId, user);
  },

  async eligibleProjects(meetingId: string, user: UserContext) {
    assertSecretary(user);
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, meetingId)).limit(1);
    if (!meeting) throw new HTTPException(404, { message: "Meeting not found" });
    const expectedStatus = boardExpectedStatus(meeting.meetingTypeId);
    return db.select({
      id: projects.id, projectCode: projects.projectCode, projectName: projects.projectName,
      latestApprovedBudget: projects.latestApprovedBudget, projectStatusId: projects.projectStatusId,
    }).from(projects).where(and(
      eq(projects.projectStatusId, expectedStatus), isNull(projects.deletedAt),
      sql`not exists (
        select 1 from agendas a
        join meetings m on m.id = a.meeting_id
        left join resolutions r on r.agenda_id = a.id
        where a.project_id = ${projects.id}
          and m.meeting_type_id = ${meeting.meetingTypeId}
          and m.meeting_status_id <> ${MEETING_STATUS.CANCELLED}
          and r.id is null
          and m.id <> ${meetingId}
      )`,
    )).orderBy(asc(projects.projectCode));
  },

  async recordResolution(meetingId: string, agendaId: string, data: RecordResolutionDTO, user: UserContext) {
    assertSecretary(user);
    try {
      return await db.transaction(async (tx) => {
        const context = await resolutionContext(tx, meetingId, agendaId);
        if (context.meeting.meetingStatusId !== MEETING_STATUS.IN_PROGRESS) {
          throw new HTTPException(409, { message: "Resolutions may be recorded only while the meeting is in progress" });
        }
        const expectedStatus = boardExpectedStatus(context.meeting.meetingTypeId);
        if (context.project.statusId !== expectedStatus) throw new HTTPException(409, { message: "Project is no longer pending for this board" });
        const [existing] = await tx.select({ id: resolutions.id }).from(resolutions).where(eq(resolutions.agendaId, agendaId)).limit(1);
        if (existing) throw new HTTPException(409, { message: "A resolution already exists for this agenda" });

        const outcome = resolutionOutcome(context.meeting.meetingTypeId, data.resolutionType);
        const exactBudget = context.meeting.meetingTypeId === MEETING_TYPE.BIG_BOARD
          ? await getExactProposalBudget(tx, context.project.id, true)
          : undefined;
        const now = new Date();
        const resolutionId = uuidv7();
        const [resolution] = await tx.insert(resolutions).values({
          id: resolutionId, agendaId, resolutionStatusId: RESOLUTION_LEGACY_STATUS_ID[data.resolutionType],
          resolutionType: data.resolutionType, comment: data.remark ?? null, remark: data.remark ?? null,
          recordedBy: user.userId, resolvedAt: now, version: 1, createdAt: now, updatedAt: now,
        }).returning();

        await applyProjectStatusTransition(tx, {
          projectId: context.project.id, userId: user.userId,
          oldStatusId: expectedStatus, newStatusId: outcome.statusId,
          remark: data.remark, sourceOperation: "BOARD_RESOLUTION_CREATED",
          meetingId, agendaId, resolutionId,
          returnStage: outcome.returnStage,
          latestApprovedBudget: exactBudget,
        });

        if (outcome.returnStage) {
          await persistRestoredDraft(tx, { id: context.project.id, ownerId: context.project.ownerId, projectName: context.project.projectName }, user.userId);
        }
        await audit(tx, { actorId: user.userId, action: "RESOLUTION_CREATED", entityType: "RESOLUTION", entityId: resolutionId, reason: data.remark, metadata: { projectId: context.project.id, outcome } });
        return resolution;
      });
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      if (isConstraintViolation(error, "23505")) throw new HTTPException(409, { message: "A resolution already exists for this agenda" });
      throw error;
    }
  },

  async editResolution(meetingId: string, agendaId: string, data: EditResolutionDTO, user: UserContext) {
    assertSecretary(user);
    return this.reconcileResolution(meetingId, agendaId, data, user, "SECRETARY_EDIT");
  },

  async correctResolution(resolutionId: string, data: CorrectResolutionDTO, user: UserContext) {
    assertSuperAdmin(user);
    const [context] = await db.select({ meetingId: agendas.meetingId, agendaId: agendas.id })
      .from(resolutions).innerJoin(agendas, eq(agendas.id, resolutions.agendaId))
      .where(eq(resolutions.id, resolutionId)).limit(1);
    if (!context) throw new HTTPException(404, { message: "Resolution not found" });
    return this.reconcileResolution(context.meetingId, context.agendaId, data, user, "SUPER_ADMIN_CORRECTION");
  },

  async reconcileResolution(meetingId: string, agendaId: string, data: EditResolutionDTO | CorrectResolutionDTO, user: UserContext, mode: "SECRETARY_EDIT" | "SUPER_ADMIN_CORRECTION") {
    return db.transaction(async (tx) => {
      const context = await resolutionContext(tx, meetingId, agendaId);
      const [current] = await tx.select().from(resolutions).where(eq(resolutions.agendaId, agendaId)).for("update").limit(1);
      if (!current) throw new HTTPException(404, { message: "Resolution not found" });
      if (!current.resolutionType) throw new HTTPException(409, { message: "Legacy resolution must be mapped before it can be edited" });
      if (current.version !== data.version) throw new HTTPException(409, { message: "Resolution changed before this request completed" });

      const previousOutcome = resolutionOutcome(context.meeting.meetingTypeId, current.resolutionType);
      if (context.project.statusId !== previousOutcome.statusId) {
        throw new HTTPException(409, { message: "Project is no longer in the exact state produced by this resolution" });
      }
      const dependencies = await downstreamDependencies(tx, context, current);
      if (dependencies.length > 0) {
        throw new HTTPException(409, { message: `Resolution cannot be changed because downstream processing exists: ${dependencies.join(", ")}` });
      }

      const nextOutcome = resolutionOutcome(context.meeting.meetingTypeId, data.resolutionType);
      const exactBudget = context.meeting.meetingTypeId === MEETING_TYPE.BIG_BOARD
        ? await getExactProposalBudget(tx, context.project.id, true)
        : context.project.latestApprovedBudget;
      const nextVersion = current.version + 1;
      const now = new Date();
      const [updated] = await tx.update(resolutions).set({
        resolutionStatusId: RESOLUTION_LEGACY_STATUS_ID[data.resolutionType],
        resolutionType: data.resolutionType, comment: data.remark ?? null, remark: data.remark ?? null,
        recordedBy: user.userId, resolvedAt: now, version: nextVersion, updatedAt: now,
      }).where(and(eq(resolutions.id, current.id), eq(resolutions.version, data.version))).returning();
      if (!updated) throw new HTTPException(409, { message: "Resolution changed before this request completed" });

      await applyProjectStatusReconciliation(tx, {
        projectId: context.project.id, userId: user.userId,
        expectedStatusId: previousOutcome.statusId, newStatusId: nextOutcome.statusId,
        remark: data.remark, sourceOperation: mode,
        meetingId, agendaId, resolutionId: current.id,
        returnStage: nextOutcome.returnStage,
        latestApprovedBudget: exactBudget,
      });

      const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(meetingResolutionRevisions).where(eq(meetingResolutionRevisions.resolutionId, current.id));
      await tx.insert(meetingResolutionRevisions).values({
        resolutionId: current.id, projectId: context.project.id, revisionNumber: Number(count) + 1,
        previousResolutionType: current.resolutionType, newResolutionType: data.resolutionType,
        previousRemark: current.remark ?? current.comment, newRemark: data.remark ?? null,
        previousProjectStatusId: previousOutcome.statusId, newProjectStatusId: nextOutcome.statusId,
        previousLatestApprovedBudget: context.project.latestApprovedBudget,
        newLatestApprovedBudget: exactBudget,
        reason: "reason" in data ? data.reason : null,
        changedBy: user.userId, changeMode: mode, changedAt: now,
      });
      if (nextOutcome.returnStage) {
        await persistRestoredDraft(tx, { id: context.project.id, ownerId: context.project.ownerId, projectName: context.project.projectName }, user.userId);
      }
      await audit(tx, { actorId: user.userId, action: mode, entityType: "RESOLUTION", entityId: current.id, reason: "reason" in data ? data.reason : data.remark, metadata: { previousOutcome, nextOutcome, previousBudget: context.project.latestApprovedBudget, nextBudget: exactBudget } });
      return updated;
    });
  },

  async resolutionHistory(meetingId: string, agendaId: string, user: UserContext) {
    await assertMeetingReadAccess(meetingId, user);
    const [resolution] = await db.select({ id: resolutions.id }).from(resolutions)
      .innerJoin(agendas, eq(agendas.id, resolutions.agendaId))
      .where(and(eq(agendas.id, agendaId), eq(agendas.meetingId, meetingId))).limit(1);
    if (!resolution) return [];
    return db.select().from(meetingResolutionRevisions)
      .where(eq(meetingResolutionRevisions.resolutionId, resolution.id))
      .orderBy(desc(meetingResolutionRevisions.revisionNumber));
  },

  async uploadFile(meetingId: string, file: File, documentType: "MEETING_DOCUMENT" | "MEETING_MINUTES", user: UserContext, pdfCompressor: PdfCompressor) {
    assertSecretary(user);
    await meetingRow(meetingId);
    const processed = await UploadService.processAndUploadDocument(file, pdfCompressor);
    const id = uuidv7();
    const documentTypeId = documentType === "MEETING_MINUTES" ? 2 : 1;
    try {
      await db.insert(meetingAttachments).values({
        id, meetingId, agendaId: null, meetingDocTypeId: documentTypeId,
        uploadedBy: user.userId, fileName: processed.fileName,
        fileUrl: `/api/v1/meetings/${meetingId}/files/${id}/download`, fileType: processed.contentType,
        documentType, originalFileName: processed.fileName, storedFileName: processed.storedFileName,
        storagePath: processed.storagePath, mimeType: processed.contentType, sizeBytes: processed.fileSize,
      });
    } catch (error) {
      await unlink(processed.storagePath).catch(() => undefined);
      throw error;
    }
    await audit(db, { actorId: user.userId, action: "MEETING_FILE_UPLOADED", entityType: "MEETING_FILE", entityId: id, metadata: { meetingId, documentType } });
    return { id, meetingId, documentType, originalFileName: processed.fileName, mimeType: processed.contentType, sizeBytes: processed.fileSize, uploadedBy: user.userId, createdAt: new Date() };
  },

  async listFiles(meetingId: string, user: UserContext) {
    assertSecretary(user);
    await meetingRow(meetingId);
    return db.select({
      id: meetingAttachments.id, meetingId: meetingAttachments.meetingId,
      documentType: meetingAttachments.documentType,
      originalFileName: meetingAttachments.originalFileName,
      mimeType: meetingAttachments.mimeType, sizeBytes: meetingAttachments.sizeBytes,
      uploadedBy: meetingAttachments.uploadedBy, createdAt: meetingAttachments.createdAt,
    }).from(meetingAttachments).where(eq(meetingAttachments.meetingId, meetingId)).orderBy(desc(meetingAttachments.createdAt));
  },

  async downloadFile(meetingId: string, fileId: string, user: UserContext) {
    assertSecretary(user);
    const [attachment] = await db.select().from(meetingAttachments)
      .where(and(eq(meetingAttachments.id, fileId), eq(meetingAttachments.meetingId, meetingId))).limit(1);
    if (!attachment) throw new HTTPException(404, { message: "Meeting file not found" });
    const storedName = attachment.storedFileName ?? attachment.fileUrl.split("/").pop() ?? "";
    if (!storedName || basename(storedName) !== storedName) throw new HTTPException(400, { message: "Invalid stored file name" });
    const file = Bun.file(join(UPLOAD_STORAGE_DIR, storedName));
    if (!(await file.exists())) throw new HTTPException(404, { message: "Meeting file is unavailable" });
    return { file, fileName: attachment.originalFileName ?? attachment.fileName, contentType: attachment.mimeType ?? attachment.fileType };
  },

  async deleteFile(meetingId: string, fileId: string, user: UserContext) {
    assertSecretary(user);
    const [attachment] = await db.select().from(meetingAttachments)
      .where(and(eq(meetingAttachments.id, fileId), eq(meetingAttachments.meetingId, meetingId))).limit(1);
    if (!attachment) throw new HTTPException(404, { message: "Meeting file not found" });
    await db.delete(meetingAttachments).where(eq(meetingAttachments.id, fileId));
    const storedName = attachment.storedFileName ?? attachment.fileUrl.split("/").pop() ?? "";
    if (storedName && basename(storedName) === storedName) {
      await unlink(join(UPLOAD_STORAGE_DIR, storedName)).catch(() => undefined);
    }
    await audit(db, { actorId: user.userId, action: "MEETING_FILE_DELETED", entityType: "MEETING_FILE", entityId: fileId, metadata: { meetingId } });
    return { success: true };
  },
};
