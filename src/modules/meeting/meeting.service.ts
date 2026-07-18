import { db } from '../../db';
import { meetings, agendas, resolutions } from '../../db/schema/meetings';
import { projects } from '../../db/schema/projects';
import { eq } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { HTTPException } from 'hono/http-exception';
import type { CreateMeetingDTO, UpdateMeetingDTO, CreateAgendaDTO, UpdateAgendaDTO, RecordResolutionDTO } from './meeting.schema';
import { PROJECT_STATUS, applyProjectStatusTransition } from '../projects/project-workflow';

export const meetingService = {
  // --- Meetings ---
  async createMeeting(data: CreateMeetingDTO, userId: string) {
    const id = uuidv7();
    const [newMeeting] = await db.insert(meetings).values({
      id,
      ...data,
      meetingDate: new Date(data.meetingDate),
      createdBy: userId,
    }).returning();
    return newMeeting;
  },

  async getAllMeetings() {
    return await db.select().from(meetings);
  },

  async getMeetingById(id: string) {
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
    if (!meeting) {
      throw new HTTPException(404, { message: 'ไม่พบข้อมูลการประชุม' });
    }
    return meeting;
  },

  async updateMeeting(id: string, data: UpdateMeetingDTO, userId: string) {
    await this.getMeetingById(id); // ตรวจสอบว่ามีอยู่จริง

    const [updatedMeeting] = await db.update(meetings).set({
      ...data,
      meetingDate: data.meetingDate ? new Date(data.meetingDate) : undefined,
      updatedBy: userId,
      updatedAt: new Date(),
    }).where(eq(meetings.id, id)).returning();
    
    return updatedMeeting;
  },

  async deleteMeeting(id: string) {
    await this.getMeetingById(id);
    await db.delete(meetings).where(eq(meetings.id, id));
    // Next feature: if meeting has been deleted, all related agendas , resolutions, and attachments should also be deleted automatically due to cascade delete in the database schema.
    return { success: true };
  },

  // --- Agendas ---
  async createAgenda(data: CreateAgendaDTO) {
    await this.getMeetingById(data.meetingId); // ตรวจสอบว่า Meeting มีอยู่จริง

    const id = uuidv7();
    const [newAgenda] = await db.insert(agendas).values({
      id,
      ...data,
    }).returning();
    return newAgenda;
  },

  async getAgendasByMeetingId(meetingId: string) {
    return await db.select().from(agendas).where(eq(agendas.meetingId, meetingId));
  },

  async updateAgenda(id: string, data: UpdateAgendaDTO) {
    const [agenda] = await db.select().from(agendas).where(eq(agendas.id, id));
    if (!agenda) {
      throw new HTTPException(404, { message: 'ไม่พบวาระการประชุม' });
    }

    const [updatedAgenda] = await db.update(agendas).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(agendas.id, id)).returning();
    
    return updatedAgenda;
  },

  async deleteAgenda(id: string) {
    const [agenda] = await db.select().from(agendas).where(eq(agendas.id, id));
    if (!agenda) {
      throw new HTTPException(404, { message: 'ไม่พบวาระการประชุม' });
    }

    await db.delete(agendas).where(eq(agendas.id, id));
    return { success: true };
  },

  async recordResolution(agendaId: string, data: RecordResolutionDTO, userId: string) {
    const remark = data.comment?.trim() || null;
    if ((data.resolutionStatusId === 2 || data.resolutionStatusId === 3) && !remark) {
      throw new HTTPException(400, { message: 'A remark is required for returned or rejected resolutions' });
    }

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

      if (!context) throw new HTTPException(404, { message: 'Agenda not found' });
      if (!context.projectId) throw new HTTPException(400, { message: 'Only project agendas can receive resolutions' });
      if (context.meetingTypeId !== 1 && context.meetingTypeId !== 2) {
        throw new HTTPException(409, { message: 'The meeting is not a project review committee' });
      }

      const isSmallBoard = context.meetingTypeId === 1;
      const expectedStatus = isSmallBoard ? PROJECT_STATUS.PENDING_SMALL_BOARD : PROJECT_STATUS.PENDING_BIG_BOARD;
      if (context.projectStatusId !== expectedStatus) {
        throw new HTTPException(409, { message: 'Resolutions can only be recorded for actively pending committee reviews' });
      }

      const targetStatus = isSmallBoard
        ? ({ 1: PROJECT_STATUS.PENDING_BIG_BOARD, 2: PROJECT_STATUS.RETURNED_SMALL_BOARD, 3: PROJECT_STATUS.REJECTED_SMALL_BOARD, 4: PROJECT_STATUS.PENDING_BIG_BOARD } as Record<number, number>)[data.resolutionStatusId]
        : ({ 1: PROJECT_STATUS.APPROVED, 2: PROJECT_STATUS.RETURNED_BIG_BOARD, 3: PROJECT_STATUS.REJECTED_BIG_BOARD, 4: PROJECT_STATUS.APPROVED } as Record<number, number>)[data.resolutionStatusId];

      const [resolution] = await tx
        .insert(resolutions)
        .values({ id: uuidv7(), agendaId, resolutionStatusId: data.resolutionStatusId, comment: remark, recordedBy: userId })
        .onConflictDoUpdate({
          target: resolutions.agendaId,
          set: { resolutionStatusId: data.resolutionStatusId, comment: remark, recordedBy: userId, updatedAt: new Date() },
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
  }
};
