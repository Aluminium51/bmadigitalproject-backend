import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { meetingController } from './meeting.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { 
  IdParamSchema, 
  MeetingIdParamSchema, 
  CreateMeetingSchema, 
  UpdateMeetingSchema, 
  MeetingSchema,
  CreateAgendaSchema,
  UpdateAgendaSchema,
  AgendaSchema,
  ErrorSchema
} from './meeting.schema';

const meetingsRouter = new OpenAPIHono();

meetingsRouter.use('*', authMiddleware);

// ==========================================
// MEETINGS ROUTES
// ==========================================

const createMeetingRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Meetings'],
  summary: 'สร้างการประชุมใหม่',
  request: { body: { content: { 'application/json': { schema: CreateMeetingSchema } } } },
  responses: { 
    201: { description: 'สร้างสำเร็จ', content: { 'application/json': { schema: z.object({ data: MeetingSchema }) } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } }
  }
});
meetingsRouter.openapi(createMeetingRoute, (c) => {
  const body = c.req.valid('json');
  return meetingController.createMeeting(c, body);
});

const getAllMeetingsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Meetings'],
  summary: 'ดึงข้อมูลการประชุมทั้งหมด',
  responses: { 
    200: { description: 'รายการการประชุม', content: { 'application/json': { schema: z.object({ data: z.array(MeetingSchema) }) } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } }
  }
});
meetingsRouter.openapi(getAllMeetingsRoute, (c) => {
  return meetingController.getAllMeetings(c);
});

const getMeetingByIdRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Meetings'],
  summary: 'ดึงข้อมูลการประชุมตาม ID',
  request: { params: IdParamSchema },
  responses: { 
    200: { description: 'รายละเอียดการประชุม', content: { 'application/json': { schema: z.object({ data: MeetingSchema }) } } },
    404: { description: 'ไม่พบข้อมูล', content: { 'application/json': { schema: ErrorSchema } } }
  }
});
meetingsRouter.openapi(getMeetingByIdRoute, (c) => {
  const { id } = c.req.valid('param');
  return meetingController.getMeetingById(c, id);
});

const updateMeetingRoute = createRoute({
  method: 'put',
  path: '/{id}',
  tags: ['Meetings'],
  summary: 'อัปเดตข้อมูลการประชุม',
  request: { params: IdParamSchema, body: { content: { 'application/json': { schema: UpdateMeetingSchema } } } },
  responses: { 
    200: { description: 'อัปเดตสำเร็จ', content: { 'application/json': { schema: z.object({ data: MeetingSchema }) } } },
    404: { description: 'ไม่พบข้อมูล', content: { 'application/json': { schema: ErrorSchema } } }
  }
});
meetingsRouter.openapi(updateMeetingRoute, (c) => {
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');
  return meetingController.updateMeeting(c, id, body);
});

const deleteMeetingRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Meetings'],
  summary: 'ลบการประชุม',
  request: { params: IdParamSchema },
  responses: { 
    200: { description: 'ลบสำเร็จ', content: { 'application/json': { schema: z.object({ message: z.string() }) } } },
    404: { description: 'ไม่พบข้อมูล', content: { 'application/json': { schema: ErrorSchema } } }
  }
});
meetingsRouter.openapi(deleteMeetingRoute, (c) => {
  const { id } = c.req.valid('param');
  return meetingController.deleteMeeting(c, id);
});

// ==========================================
// AGENDAS ROUTES
// ==========================================

const createAgendaRoute = createRoute({
  method: 'post',
  path: '/agendas',
  tags: ['Agendas'],
  summary: 'สร้างวาระการประชุม',
  request: { body: { content: { 'application/json': { schema: CreateAgendaSchema } } } },
  responses: { 
    201: { description: 'สร้างวาระสำเร็จ', content: { 'application/json': { schema: z.object({ data: AgendaSchema }) } } },
    404: { description: 'ไม่พบการประชุม', content: { 'application/json': { schema: ErrorSchema } } }
  }
});
meetingsRouter.openapi(createAgendaRoute, (c) => {
  const body = c.req.valid('json');
  return meetingController.createAgenda(c, body);
});

const getAgendasRoute = createRoute({
  method: 'get',
  path: '/{meetingId}/agendas',
  tags: ['Agendas'],
  summary: 'ดึงวาระทั้งหมดในการประชุมหนึ่งๆ',
  request: { params: MeetingIdParamSchema },
  responses: { 
    200: { description: 'รายการวาระการประชุม', content: { 'application/json': { schema: z.object({ data: z.array(AgendaSchema) }) } } } 
  }
});
meetingsRouter.openapi(getAgendasRoute, (c) => {
  const { meetingId } = c.req.valid('param');
  return meetingController.getAgendasByMeetingId(c, meetingId);
});

const updateAgendaRoute = createRoute({
  method: 'put',
  path: '/agendas/{id}',
  tags: ['Agendas'],
  summary: 'อัปเดตข้อมูลวาระการประชุม',
  request: { params: IdParamSchema, body: { content: { 'application/json': { schema: UpdateAgendaSchema } } } },
  responses: { 
    200: { description: 'อัปเดตสำเร็จ', content: { 'application/json': { schema: z.object({ data: AgendaSchema }) } } },
    404: { description: 'ไม่พบข้อมูล', content: { 'application/json': { schema: ErrorSchema } } }
  }
});
meetingsRouter.openapi(updateAgendaRoute, (c) => {
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');
  return meetingController.updateAgenda(c, id, body);
});

const deleteAgendaRoute = createRoute({
  method: 'delete',
  path: '/agendas/{id}',
  tags: ['Agendas'],
  summary: 'ลบวาระการประชุม',
  request: { params: IdParamSchema },
  responses: { 
    200: { description: 'ลบสำเร็จ', content: { 'application/json': { schema: z.object({ message: z.string() }) } } },
    404: { description: 'ไม่พบข้อมูล', content: { 'application/json': { schema: ErrorSchema } } }
  }
});
meetingsRouter.openapi(deleteAgendaRoute, (c) => {
  const { id } = c.req.valid('param');
  return meetingController.deleteAgenda(c, id);
});

export default meetingsRouter;