import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { v7 as uuidv7 } from "uuid";
import { db } from "../../db";
import { agendas, meetings, resolutions } from "../../db/schema/meetings";
import { projects } from "../../db/schema/projects";
import { meetingStatuses, meetingTypes } from "../../db/schema/lookups";
import { users } from "../../db/schema/users";
import { PROJECT_STATUS, applyProjectStatusTransition } from "../projects/project-workflow";
import type {
  CreateAgendaDTO,
  CreateMeetingDTO,
  RecordResolutionDTO,
  UpdateAgendaDTO,
  UpdateMeetingDTO,
} from "./meeting.schema";

const PROJECT_AGENDA_TYPES = new Set([3, 4]);

function isConstraintViolation(error: unknown, code: string) {
  return (error as { code?: unknown } | null)?.code === code;
}

async function assertProjectExists(executor: any, projectId: string) {
  const [project] = await executor
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) {
    throw new HTTPException(400, { message: "The selected project does not exist or is no longer active" });
  }
}

async function validateAgendaPayload(
  executor: any,
  input: { agendaTypeId: number; projectId?: string | null },
) {
  if (input.agendaTypeId < 1 || input.agendaTypeId > 5) {
    throw new HTTPException(400, { message: "Invalid agenda type" });
  }

  if (PROJECT_AGENDA_TYPES.has(input.agendaTypeId)) {
    if (!input.projectId) {
      throw new HTTPException(400, {
        message: "A project is required for agenda types 3 and 4",
      });
    }
    await assertProjectExists(executor, input.projectId);
  }
}

async function getNextSortOrder(executor: any, meetingId: string) {
  const [result] = await executor
    .select({ maxSortOrder: sql<number>`coalesce(max(${agendas.sortOrder}), 0)` })
    .from(agendas)
    .where(eq(agendas.meetingId, meetingId));

  return Number(result?.maxSortOrder ?? 0) + 1;
}

export const meetingService = {
  async createMeeting(data: CreateMeetingDTO, userId: string) {
    const [newMeeting] = await db.insert(meetings).values({
      id: uuidv7(),
      meetingNo: data.meetingNo,
      title: data.title,
      meetingTypeId: data.meetingTypeId,
      meetingDate: new Date(data.meetingDate),
      location: data.location ?? null,
      meetingStatusId: data.meetingStatusId,
      createdBy: userId,
    }).returning();

    return newMeeting;
  },

  async getAllMeetings() {
    return await db.select({
      id: meetings.id,
      meetingNo: meetings.meetingNo,
      title: meetings.title,
      meetingTypeId: meetings.meetingTypeId,
      meetingDate: meetings.meetingDate,
      location: meetings.location,
      meetingStatusId: meetings.meetingStatusId,
      createdBy: meetings.createdBy,
      createdAt: meetings.createdAt,
      updatedAt: meetings.updatedAt,
      updatedBy: meetings.updatedBy,
      meetingType: { id: meetingTypes.id, name: meetingTypes.name },
      meetingStatus: { id: meetingStatuses.id, name: meetingStatuses.name },
      creator: { userId: users.userId, firstName: users.firstName, lastName: users.lastName },
    })
      .from(meetings)
      .leftJoin(meetingTypes, eq(meetings.meetingTypeId, meetingTypes.id))
      .leftJoin(meetingStatuses, eq(meetings.meetingStatusId, meetingStatuses.id))
      .leftJoin(users, eq(meetings.createdBy, users.userId))
      .orderBy(desc(meetings.meetingDate), asc(meetings.id));
  },

  async getMeetingById(id: string) {
    const [meeting] = await db.select({
      id: meetings.id,
      meetingNo: meetings.meetingNo,
      title: meetings.title,
      meetingTypeId: meetings.meetingTypeId,
      meetingDate: meetings.meetingDate,
      location: meetings.location,
      meetingStatusId: meetings.meetingStatusId,
      createdBy: meetings.createdBy,
      createdAt: meetings.createdAt,
      updatedAt: meetings.updatedAt,
      updatedBy: meetings.updatedBy,
      meetingType: { id: meetingTypes.id, name: meetingTypes.name },
      meetingStatus: { id: meetingStatuses.id, name: meetingStatuses.name },
      creator: { userId: users.userId, firstName: users.firstName, lastName: users.lastName },
    })
      .from(meetings)
      .leftJoin(meetingTypes, eq(meetings.meetingTypeId, meetingTypes.id))
      .leftJoin(meetingStatuses, eq(meetings.meetingStatusId, meetingStatuses.id))
      .leftJoin(users, eq(meetings.createdBy, users.userId))
      .where(eq(meetings.id, id));
    if (!meeting) {
      throw new HTTPException(404, { message: "Meeting not found" });
    }
    return meeting;
  },

  async updateMeeting(id: string, data: UpdateMeetingDTO, userId: string) {
    await this.getMeetingById(id);

    const [updatedMeeting] = await db.update(meetings).set({
      ...(data.meetingNo !== undefined ? { meetingNo: data.meetingNo } : {}),
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.meetingTypeId !== undefined ? { meetingTypeId: data.meetingTypeId } : {}),
      ...(data.meetingDate !== undefined ? { meetingDate: new Date(data.meetingDate) } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.meetingStatusId !== undefined ? { meetingStatusId: data.meetingStatusId } : {}),
      updatedBy: userId,
      updatedAt: new Date(),
    }).where(eq(meetings.id, id)).returning();

    return updatedMeeting;
  },

  async deleteMeeting(id: string) {
    await this.getMeetingById(id);
    await db.delete(meetings).where(eq(meetings.id, id));
    return { success: true };
  },

  async createAgenda(data: CreateAgendaDTO) {
    return await db.transaction(async (tx) => {
      const [meeting] = await tx
        .select({ id: meetings.id })
        .from(meetings)
        .where(eq(meetings.id, data.meetingId))
        .limit(1);

      if (!meeting) {
        throw new HTTPException(404, { message: "Meeting not found" });
      }

      await validateAgendaPayload(tx, data);
      const sortOrder = data.sortOrder ?? await getNextSortOrder(tx, data.meetingId);

      const [newAgenda] = await tx.insert(agendas).values({
        id: uuidv7(),
        meetingId: data.meetingId,
        projectId: data.projectId ?? null,
        agendaNumber: data.agendaNumber,
        sortOrder,
        agendaTypeId: data.agendaTypeId,
        title: data.title,
        description: data.description ?? null,
      }).returning();

      return newAgenda;
    });
  },

  async getAgendasByMeetingId(meetingId: string) {
    return await db
      .select({
        id: agendas.id,
        meetingId: agendas.meetingId,
        projectId: agendas.projectId,
        agendaNumber: agendas.agendaNumber,
        sortOrder: agendas.sortOrder,
        agendaTypeId: agendas.agendaTypeId,
        title: agendas.title,
        description: agendas.description,
        createdAt: agendas.createdAt,
        updatedAt: agendas.updatedAt,
        project: {
          id: projects.id,
          projectCode: projects.projectCode,
          projectName: projects.projectName,
          initialRequestedBudget: projects.initialRequestedBudget,
        },
      })
      .from(agendas)
      .leftJoin(projects, eq(agendas.projectId, projects.id))
      .where(eq(agendas.meetingId, meetingId))
      .orderBy(asc(agendas.agendaTypeId), asc(agendas.sortOrder), asc(agendas.id));
  },

  async updateAgenda(id: string, data: UpdateAgendaDTO) {
    return await db.transaction(async (tx) => {
      const [agenda] = await tx.select().from(agendas).where(eq(agendas.id, id)).limit(1);
      if (!agenda) {
        throw new HTTPException(404, { message: "Agenda not found" });
      }

      const agendaTypeId = data.agendaTypeId ?? agenda.agendaTypeId;
      const projectId = data.projectId !== undefined ? data.projectId : agenda.projectId;
      await validateAgendaPayload(tx, { agendaTypeId, projectId });

      const [updatedAgenda] = await tx.update(agendas).set({
        ...(data.projectId !== undefined ? { projectId: data.projectId } : {}),
        ...(data.agendaNumber !== undefined ? { agendaNumber: data.agendaNumber } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.agendaTypeId !== undefined ? { agendaTypeId: data.agendaTypeId } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        updatedAt: new Date(),
      }).where(eq(agendas.id, id)).returning();

      return updatedAgenda;
    });
  },

  async deleteAgenda(id: string) {
    const [agenda] = await db.select({ id: agendas.id }).from(agendas).where(eq(agendas.id, id));
    if (!agenda) {
      throw new HTTPException(404, { message: "Agenda not found" });
    }

    await db.delete(agendas).where(eq(agendas.id, id));
    return { success: true };
  },

  async recordResolution(agendaId: string, data: RecordResolutionDTO, userId: string) {
    const remark = data.comment?.trim() || null;
    if ((data.resolutionStatusId === 2 || data.resolutionStatusId === 3) && !remark) {
      throw new HTTPException(400, { message: "A remark is required for returned or rejected resolutions" });
    }

    try {
      return await db.transaction(async (tx) => {
        const [context] = await tx
          .select({
            projectId: agendas.projectId,
            meetingTypeId: meetings.meetingTypeId,
            projectStatusId: projects.projectStatusId,
          })
          .from(agendas)
          .innerJoin(meetings, eq(agendas.meetingId, meetings.id))
          .leftJoin(projects, eq(agendas.projectId, projects.id))
          .where(eq(agendas.id, agendaId))
          .limit(1);

        if (!context) throw new HTTPException(404, { message: "Agenda not found" });
        if (!context.projectId) {
          throw new HTTPException(400, { message: "Only project agendas can receive resolutions" });
        }
        if (context.meetingTypeId !== 1 && context.meetingTypeId !== 2) {
          throw new HTTPException(409, { message: "The meeting is not a project review committee" });
        }

        const isSmallBoard = context.meetingTypeId === 1;
        const expectedStatus = isSmallBoard
          ? PROJECT_STATUS.PENDING_SMALL_BOARD
          : PROJECT_STATUS.PENDING_BIG_BOARD;

        if (context.projectStatusId !== expectedStatus) {
          throw new HTTPException(409, {
            message: "Resolutions can only be recorded for actively pending committee reviews",
          });
        }

        const targetStatus = isSmallBoard
          ? ({
              1: PROJECT_STATUS.PENDING_BIG_BOARD,
              2: PROJECT_STATUS.RETURNED_SMALL_BOARD,
              3: PROJECT_STATUS.REJECTED_SMALL_BOARD,
              4: PROJECT_STATUS.PENDING_BIG_BOARD,
            } as Record<number, number>)[data.resolutionStatusId]
          : ({
              1: PROJECT_STATUS.APPROVED,
              2: PROJECT_STATUS.RETURNED_BIG_BOARD,
              3: PROJECT_STATUS.REJECTED_BIG_BOARD,
              4: PROJECT_STATUS.APPROVED,
            } as Record<number, number>)[data.resolutionStatusId];

        const [resolution] = await tx
          .insert(resolutions)
          .values({
            id: uuidv7(),
            agendaId,
            resolutionStatusId: data.resolutionStatusId,
            comment: remark,
            recordedBy: userId,
          })
          .onConflictDoUpdate({
            target: resolutions.agendaId,
            set: {
              resolutionStatusId: data.resolutionStatusId,
              comment: remark,
              recordedBy: userId,
              updatedAt: new Date(),
            },
          })
          .returning();

        await applyProjectStatusTransition(tx, {
          projectId: context.projectId,
          userId,
          oldStatusId: expectedStatus,
          newStatusId: targetStatus,
          remark,
        });

        return resolution;
      });
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      if (isConstraintViolation(error, "23505")) {
        throw new HTTPException(409, {
          message: "A resolution has already been recorded for this agenda. Please try again.",
        });
      }
      throw error;
    }
  },
};
