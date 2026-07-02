import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import { 
  ProjectSchema, 
  CreateProjectSchema, 
  UpdateProjectSchema, 
  ProjectIdParamsSchema, 
  ErrorSchema 
} from './project.schema';
import * as projectController from './project.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const app = new OpenAPIHono();
app.use('*', authMiddleware);

// --- 1. Get All Projects ---
const getProjectsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Projects'],
  summary: 'ดึงรายชื่อโครงการทั้งหมด',
  responses: {
    200: {
      content: { 'application/json': { schema: z.array(ProjectSchema) } },
      description: 'รายการโครงการทั้งหมด',
    },
    500: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'ข้อผิดพลาดเซิร์ฟเวอร์',
    },
  },
});
app.openapi(getProjectsRoute, (c) => projectController.getProjects(c));

// --- 2. Get Project By ID ---
const getProjectByIdRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Projects'],
  summary: 'ดึงข้อมูลโครงการตาม ID',
  request: { params: ProjectIdParamsSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: ProjectSchema } },
      description: 'ข้อมูลโครงการรายละเอียด',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'รูปแบบ ID ไม่ถูกต้อง',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'ไม่พบข้อมูลโครงการ',
    },
  },
});
app.openapi(getProjectByIdRoute, (c) => projectController.getProjectById(c));

// --- 3. Create Project ---
const createProjectRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Projects'],
  summary: 'สร้างโครงการใหม่',
  request: {
    body: { content: { 'application/json': { schema: CreateProjectSchema } } },
  },
  responses: {
    201: {
      content: { 
        'application/json': { 
          schema: z.object({ message: z.string(), project: ProjectSchema }) 
        } 
      },
      description: 'สร้างโครงการสำเร็จ',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Unauthorized',
    },
  },
});
app.openapi(createProjectRoute, (c) => projectController.createProject(c));

// --- 4. Update Project ---
const updateProjectRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['Projects'],
  summary: 'อัปเดตข้อมูลโครงการ',
  request: {
    params: ProjectIdParamsSchema,
    body: { content: { 'application/json': { schema: UpdateProjectSchema } } },
  },
  responses: {
    200: {
      content: { 
        'application/json': { 
          schema: z.object({ message: z.string(), project: ProjectSchema }) 
        } 
      },
      description: 'อัปเดตสำเร็จ',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'ไม่พบข้อมูลโครงการ',
    },
  },
});
app.openapi(updateProjectRoute, (c) => projectController.updateProject(c));

// --- 5. Delete Project ---
const deleteProjectRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Projects'],
  summary: 'ลบข้อมูลโครงการ',
  request: { params: ProjectIdParamsSchema },
  responses: {
    200: {
      content: { 
        'application/json': { schema: z.object({ message: z.string() }) } 
      },
      description: 'ลบสำเร็จ',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'ไม่พบข้อมูลโครงการ',
    },
  },
});
app.openapi(deleteProjectRoute, (c) => projectController.deleteProject(c));

export default app;