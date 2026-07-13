import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { lookupController } from './lookup.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import {
  LookupResponseSchema,
  DivisionResponseSchema,
  ProjectStatusResponseSchema,
  ErrorSchema
} from './lookup.schema';

const lookupsRouter = new OpenAPIHono();

// เรียกใช้ Auth Middleware (หากต้องการบังคับให้ต้องล็อกอินก่อนดึง Lookup)
lookupsRouter.use('*', authMiddleware);

// ==========================================
// LOOKUPS ROUTES
// ==========================================

const getDivisionsRoute = createRoute({
  method: 'get',
  path: '/divisions',
  tags: ['Lookups'],
  summary: 'ดึงข้อมูล Divisions (หน่วยงาน)',
  responses: {
    200: { description: 'รายการ Divisions', content: { 'application/json': { schema: DivisionResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } }
  }
});
lookupsRouter.openapi(getDivisionsRoute, (c) => {
  return lookupController.getDivisions(c);
});

const getFourQuadrantsRoute = createRoute({
  method: 'get',
  path: '/four-quadrants',
  tags: ['Lookups'],
  summary: 'ดึงข้อมูล 4 Quadrants Model',
  responses: {
    200: { description: 'รายการ 4 Quadrants Model', content: { 'application/json': { schema: LookupResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } }
  }
});
lookupsRouter.openapi(getFourQuadrantsRoute, (c) => {
  return lookupController.getFourQuadrants(c);
});

const getDeputyGovernorsRoute = createRoute({
  method: 'get',
  path: '/deputy-governors',
  tags: ['Lookups'],
  summary: 'ดึงข้อมูลรองผู้ว่าฯ ที่กำกับดูแล',
  responses: {
    200: { description: 'รายการรองผู้ว่าฯ', content: { 'application/json': { schema: LookupResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } }
  }
});
lookupsRouter.openapi(getDeputyGovernorsRoute, (c) => {
  return lookupController.getDeputyGovernors(c);
});

const getProjectStatusesRoute = createRoute({
  method: 'get',
  path: '/project-statuses',
  tags: ['Lookups'],
  summary: 'ดึงข้อมูลสถานะโครงการ',
  responses: {
      200: { description: 'รายการสถานะโครงการ', content: { 'application/json': { schema: ProjectStatusResponseSchema } } },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } }
    }
});
lookupsRouter.openapi(getProjectStatusesRoute, (c) => {
  return lookupController.getProjectStatuses(c);
});

export default lookupsRouter;
