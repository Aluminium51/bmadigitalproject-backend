// src/index.ts
import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import uploadRoutes from "./modules/uploads/upload.routes";
import userRoutesV1 from './modules/users/user.routes';
import authRoutesV1 from './modules/auth/auth.routes';
import healthRoutes from './modules/health/health.routes';
import { cors } from 'hono/cors';

const app = new OpenAPIHono();

// cors middleware เพื่อให้ frontend ที่รันบน localhost:3000 สามารถเรียก API ได้
app.use('/*', cors({
  origin: 'http://localhost:3000',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.route('/health', healthRoutes);
// ตั้งค่าเอกสารคู่มือ API แยกตามเวอร์ชัน
app.doc('/openapi-v1.json', {
  openapi: '3.0.0',
  info: { title: 'BMA Platform API (v1)', version: '1.0.0' },
});
app.get('/docs/', swaggerUI({ url: '/openapi-v1.json' }));


// ==========================================
// /api/v1/*
// ==========================================
const v1 = new OpenAPIHono();
v1.route('/users', userRoutesV1);
v1.route('/auth', authRoutesV1);
v1.route('/uploads', uploadRoutes);
app.route('/api/v1', v1);


// start Server
const port = process.env.PORT ? parseInt(process.env.PORT) : 8081;
console.log(`🚀 Backend is running on http://localhost:${port}`);
console.log(`📚 Swagger UI is at http://localhost:${port}/docs/`);

export default {
  port,
  fetch: app.fetch,
};