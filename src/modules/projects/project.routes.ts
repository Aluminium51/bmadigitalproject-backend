import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import { 
  ProjectSchema, 
  CreateProjectSchema, 
  UpdateProjectSchema, 
  ProjectIdParamsSchema, 
  ErrorSchema, 
  UpdateProjectStatusSchema,
  UpdateProjectTypeSchema,
  AssignProjectSchema,
  ProjectQuerySchema,             
  PaginatedProjectResponseSchema,
  SecretaryPendingProjectQuerySchema,
  SecretaryReviewRequestSchema,
  SecretaryReviewResponseSchema,
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
  request: {
    query: ProjectQuerySchema 
  },
  responses: {
    200: {
      content: { 'application/json': { schema: PaginatedProjectResponseSchema } },
      description: 'รายการโครงการทั้งหมด',
    },
    500: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'ข้อผิดพลาดเซิร์ฟเวอร์',
    },
  },
});
// get query parameters and pass to controller
app.openapi(getProjectsRoute, (c) => {
  const query = c.req.valid('query'); 
  return projectController.getProjects(c, query);
});

// --- 2. Secretary Pending Queue ---
const getPendingSecretaryProjectsRoute = createRoute({
  method: 'get',
  path: '/secretary/pending',
  tags: ['Projects', 'Secretary Review'],
  summary: 'ดึงรายชื่อโครงการที่รอการตรวจสอบจากเลขานุการ',
  request: {
    query: SecretaryPendingProjectQuerySchema,
  },
  responses: {
    200: {
      content: { 'application/json': { schema: PaginatedProjectResponseSchema } },
      description: 'Projects pending Secretary review',
    },
    403: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Only Secretaries may access this queue',
    },
  },
});
app.openapi(getPendingSecretaryProjectsRoute, (c) => {
  return projectController.getPendingSecretaryProjects(
    c,
    c.req.valid('query'),
  );
});

// --- 3. Get Project By ID ---
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
app.openapi(getProjectByIdRoute, (c) => {
  const { id } = c.req.valid('param');
  return projectController.getProjectById(c, id);
});

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
app.openapi(createProjectRoute, (c) => {
  const body = c.req.valid('json');
  return projectController.createProject(c, body);
});

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
app.openapi(updateProjectRoute, (c) => {
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');
  return projectController.updateProject(c, id, body);
});

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
app.openapi(deleteProjectRoute, (c) => {
  const { id } = c.req.valid('param');
  return projectController.deleteProject(c, id);
});

// --- 6. Update Project Status ---
app.openapi(createRoute({
  method: 'patch', path: '/{id}/status', tags: ['Projects'], summary: 'อัปเดตสถานะโครงการ (Admin/Head)',
  request: { params: ProjectIdParamsSchema, body: { content: { 'application/json': { schema: UpdateProjectStatusSchema } } } },
  responses: { 200: { description: 'สำเร็จ' } }
}), (c) => {
  return projectController.updateProjectStatus(c, c.req.valid('param').id, c.req.valid('json'));
});

// --- 7. Secretary Review ---
app.openapi(createRoute({
  method: 'post',
  path: '/{id}/secretary-review',
  tags: ['Projects', 'Secretary Review'],
  summary: 'Review a project waiting for Secretary verification',
  request: {
    params: ProjectIdParamsSchema,
    body: {
      content: { 'application/json': { schema: SecretaryReviewRequestSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: SecretaryReviewResponseSchema } },
      description: 'Secretary review completed',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Invalid decision or missing required data',
    },
    403: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Only Secretaries may review projects',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Project not found',
    },
    409: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Project is no longer pending Secretary review',
    },
  },
}), (c) => {
  return projectController.reviewSecretaryProject(
    c,
    c.req.valid('param').id,
    c.req.valid('json'),
  );
});

// --- 8. Update Project Type ---
app.openapi(createRoute({
  method: 'patch', path: '/{id}/type', tags: ['Projects'], summary: 'อัปเดตประเภทโครงการ',
  request: { params: ProjectIdParamsSchema, body: { content: { 'application/json': { schema: UpdateProjectTypeSchema } } } },
  responses: { 200: { description: 'สำเร็จ' } }
}), (c) => {
  return projectController.updateProjectType(c, c.req.valid('param').id, c.req.valid('json'));
});

// --- 9. Assign Project ---
app.openapi(createRoute({
  method: 'patch', path: '/{id}/assign', tags: ['Projects'], summary: 'มอบหมายงานโครงการให้นักวิเคราะห์',
  request: { params: ProjectIdParamsSchema, body: { content: { 'application/json': { schema: AssignProjectSchema } } } },
  responses: { 200: { description: 'สำเร็จ' } }
}), (c) => {
  return projectController.assignProject(c, c.req.valid('param').id, c.req.valid('json'));
});

export default app;
