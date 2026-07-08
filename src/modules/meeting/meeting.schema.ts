import { z } from '@hono/zod-openapi';

// --- Error Schema ---
export const ErrorSchema = z.object({
  message: z.string().openapi({ example: 'เกิดข้อผิดพลาดบางอย่าง' }),
});

// --- Params Schema ---
export const IdParamSchema = z.object({
  id: z.string().uuid().openapi({ example: '018f3a3b-1b2c-7d3e-8f4g-5h6i7j8k9l0m' }),
});

export const MeetingIdParamSchema = z.object({
  meetingId: z.string().uuid().openapi({ example: '018f3a3b-1b2c-7d3e-8f4g-5h6i7j8k9l0m' }),
});

// --- Meeting Schemas ---
export const MeetingSchema = z.object({
  id: z.string().uuid(),
  meetingNo: z.string().max(100),
  title: z.string().max(500),
  meetingTypeId: z.number().int(),
  // ใช้ union เพื่อรองรับ Date Object จาก Drizzle แต่ให้ OpenAPI มองเป็น String
  meetingDate: z.union([z.string(), z.date()]).openapi({ type: 'string', format: 'date-time' }),
  location: z.string().max(500).nullable().optional(),
  meetingStatusId: z.number().int(),
  createdBy: z.string().uuid(),
  createdAt: z.union([z.string(), z.date()]).openapi({ type: 'string', format: 'date-time' }),
  updatedAt: z.union([z.string(), z.date()]).openapi({ type: 'string', format: 'date-time' }),
  updatedBy: z.string().uuid().nullable().optional(),
}).openapi('Meeting');

export const CreateMeetingSchema = z.object({
  meetingNo: z.string().max(100),
  title: z.string().max(500),
  meetingTypeId: z.number().int(),
  meetingDate: z.string().datetime(), // ขาเข้าจาก Frontend จะเป็น String เสมอ
  location: z.string().max(500).optional(),
  meetingStatusId: z.number().int(),
}).openapi('CreateMeeting');

export const UpdateMeetingSchema = CreateMeetingSchema.partial().openapi('UpdateMeeting');

// --- Agenda Schemas ---
export const AgendaSchema = z.object({
  id: z.string().uuid(),
  meetingId: z.string().uuid(),
  projectId: z.string().uuid().nullable().optional(), // Null ได้ถ้าเป็นวาระทั่วไป
  agendaNumber: z.string().max(50),
  agendaTypeId: z.number().int(),
  title: z.string().max(500),
  description: z.string().nullable().optional(),
  createdAt: z.union([z.string(), z.date()]).openapi({ type: 'string', format: 'date-time' }),
  updatedAt: z.union([z.string(), z.date()]).openapi({ type: 'string', format: 'date-time' }),
}).openapi('Agenda');

export const CreateAgendaSchema = z.object({
  meetingId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  agendaNumber: z.string().max(50),
  agendaTypeId: z.number().int(),
  title: z.string().max(500),
  description: z.string().optional(),
}).openapi('CreateAgenda');

export const UpdateAgendaSchema = CreateAgendaSchema.omit({ meetingId: true }).partial().openapi('UpdateAgenda');

// --- Types ---
export type CreateMeetingDTO = z.infer<typeof CreateMeetingSchema>;
export type UpdateMeetingDTO = z.infer<typeof UpdateMeetingSchema>;
export type CreateAgendaDTO = z.infer<typeof CreateAgendaSchema>;
export type UpdateAgendaDTO = z.infer<typeof UpdateAgendaSchema>;