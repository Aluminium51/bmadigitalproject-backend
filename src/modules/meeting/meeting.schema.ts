import { z } from "@hono/zod-openapi";

export const ErrorSchema = z.object({
  message: z.string().openapi({ example: "An error occurred" }),
});

export const IdParamSchema = z.object({
  id: z.string().uuid().openapi({ example: "018f3a3b-1b2c-7d3e-8f4g-5h6i7j8k9l0m" }),
});

export const MeetingIdParamSchema = z.object({
  meetingId: z.string().uuid().openapi({ example: "018f3a3b-1b2c-7d3e-8f4g-5h6i7j8k9l0m" }),
});

const AgendaTypeIdSchema = z.number().int().min(1).max(5);

export const MeetingSchema = z.object({
  id: z.string().uuid(),
  meetingNo: z.string().max(100),
  title: z.string().max(500),
  meetingTypeId: z.number().int(),
  meetingDate: z.union([z.string(), z.date()]).openapi({ type: "string", format: "date-time" }),
  location: z.string().max(500).nullable().optional(),
  meetingStatusId: z.number().int(),
  createdBy: z.string().uuid(),
  createdAt: z.union([z.string(), z.date()]).openapi({ type: "string", format: "date-time" }),
  updatedAt: z.union([z.string(), z.date()]).openapi({ type: "string", format: "date-time" }),
  updatedBy: z.string().uuid().nullable().optional(),
  meetingType: z.object({ id: z.number().int(), name: z.string() }).nullable().optional(),
  meetingStatus: z.object({ id: z.number().int(), name: z.string() }).nullable().optional(),
  creator: z.object({
    userId: z.string().uuid(),
    firstName: z.string(),
    lastName: z.string(),
  }).nullable().optional(),
}).openapi("Meeting");

export const CreateMeetingSchema = z.object({
  meetingNo: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(500),
  meetingTypeId: z.number().int().positive(),
  meetingDate: z.string().datetime(),
  location: z.string().trim().max(500).nullable().optional(),
  meetingStatusId: z.number().int().positive(),
}).openapi("CreateMeeting");

export const UpdateMeetingSchema = CreateMeetingSchema.partial().openapi("UpdateMeeting");

export const AgendaSchema = z.object({
  id: z.string().uuid(),
  meetingId: z.string().uuid(),
  projectId: z.string().uuid().nullable().optional(),
  agendaNumber: z.string().max(50),
  sortOrder: z.number().int(),
  agendaTypeId: AgendaTypeIdSchema,
  title: z.string().max(500),
  description: z.string().nullable().optional(),
  project: z.object({
    id: z.string().uuid(),
    projectCode: z.string().nullable().optional(),
    projectName: z.string().nullable().optional(),
    initialRequestedBudget: z.string().nullable().optional(),
  }).nullable().optional(),
  createdAt: z.union([z.string(), z.date()]).openapi({ type: "string", format: "date-time" }),
  updatedAt: z.union([z.string(), z.date()]).openapi({ type: "string", format: "date-time" }),
}).openapi("Agenda");

export const CreateAgendaSchema = z.object({
  meetingId: z.string().uuid(),
  projectId: z.string().uuid().nullable().optional(),
  agendaNumber: z.string().trim().min(1).max(50),
  sortOrder: z.number().int().positive().optional(),
  agendaTypeId: AgendaTypeIdSchema,
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().max(5000).nullable().optional(),
}).openapi("CreateAgenda");

export const UpdateAgendaSchema = CreateAgendaSchema.omit({ meetingId: true }).partial().openapi("UpdateAgenda");

export const RecordResolutionSchema = z.object({
  resolutionStatusId: z.number().int().min(1).max(4),
  comment: z.string().optional(),
}).openapi("RecordResolution");

export type CreateMeetingDTO = z.infer<typeof CreateMeetingSchema>;
export type UpdateMeetingDTO = z.infer<typeof UpdateMeetingSchema>;
export type CreateAgendaDTO = z.infer<typeof CreateAgendaSchema>;
export type UpdateAgendaDTO = z.infer<typeof UpdateAgendaSchema>;
export type RecordResolutionDTO = z.infer<typeof RecordResolutionSchema>;
