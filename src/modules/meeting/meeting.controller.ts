import type { Context } from 'hono';
import { HTTPException } from "hono/http-exception";
import { meetingService } from './meeting.service';
import { getUserId } from '../../utils/controller-helper';
import type { CreateMeetingDTO, UpdateMeetingDTO, CreateAgendaDTO, UpdateAgendaDTO } from './meeting.schema';

export const meetingController = {
  // --- Meetings ---
  async createMeeting(c: Context, body: CreateMeetingDTO) {
    const userId = getUserId(c);
    const newMeeting = await meetingService.createMeeting(body, userId);
    return c.json({ data: newMeeting }, 201);
  },

  async getAllMeetings(c: Context) {
    getUserId(c);
    const result = await meetingService.getAllMeetings();
    return c.json({ data: result }, 200);
  },

  async getMeetingById(c: Context, id: string) {
    getUserId(c); // บังคับเช็ค
    const result = await meetingService.getMeetingById(id);
    return c.json({ data: result }, 200);
  },

  async updateMeeting(c: Context, id: string, body: UpdateMeetingDTO) {
    const userId = getUserId(c); // บังคับเช็ค
    const result = await meetingService.updateMeeting(id, body, userId);
    return c.json({ data: result }, 200);
  },

  async deleteMeeting(c: Context, id: string) {
    getUserId(c); // บังคับเช็ค
    await meetingService.deleteMeeting(id);
    return c.json({ message: 'ลบการประชุมสำเร็จ' }, 200);
  },

  // --- Agendas ---
  async createAgenda(c: Context, body: CreateAgendaDTO) {
    getUserId(c); // บังคับเช็ค
    const result = await meetingService.createAgenda(body);
    return c.json({ data: result }, 201);
  },

  async getAgendasByMeetingId(c: Context, meetingId: string) {
    getUserId(c); // บังคับเช็ค
    const result = await meetingService.getAgendasByMeetingId(meetingId);
    return c.json({ data: result }, 200);
  },

  async updateAgenda(c: Context, id: string, body: UpdateAgendaDTO) {
    getUserId(c); // บังคับเช็ค
    const result = await meetingService.updateAgenda(id, body);
    return c.json({ data: result }, 200);
  },

  async deleteAgenda(c: Context, id: string) {
    getUserId(c); // บังคับเช็ค
    await meetingService.deleteAgenda(id);
    return c.json({ message: 'ลบวาระการประชุมสำเร็จ' }, 200);
  }
};