import { db } from '../../db';
import { meetings, agendas } from '../../db/schema/meetings';
import { eq } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { HTTPException } from 'hono/http-exception';
import type { CreateMeetingDTO, UpdateMeetingDTO, CreateAgendaDTO, UpdateAgendaDTO } from './meeting.schema';

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
  }
};