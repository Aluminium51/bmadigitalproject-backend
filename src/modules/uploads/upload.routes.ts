// src/modules/uploads/upload.routes.ts
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { UploadController } from './upload.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const uploadRoutes = new OpenAPIHono();
uploadRoutes.use('*', authMiddleware);

const uploadDocumentRoute = createRoute({
  method: 'post',
  path: '/document',
  summary: 'Upload and compress PDF document',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            file: z.instanceof(File).openapi({
              type: 'string',
              format: 'binary', // สำคัญ : ทำให้ Swagger โชว์ปุ่มเลือกไฟล์
              description: 'เอกสาร PDF ที่ต้องการบีบอัด'
            }),
            projectId: z.string().uuid(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Upload successful',
    },
  },
});

uploadRoutes.openapi(uploadDocumentRoute, UploadController.uploadDocument);

export default uploadRoutes;
