// src/index.ts
import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import userRoutes from './modules/users/user.routes';

const app = new OpenAPIHono();

// 1. ตั้งค่า OpenAPI (Swagger Docs)
app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'BMA Platform API',
    version: '1.0.0',
    description: 'API สำหรับระบบจัดการส่วนหลังบ้าน',
  },
});

// เปิด UI ให้คนนอกเข้ามาดูและทดสอบ API ได้
app.get('/docs', swaggerUI({ url: '/openapi.json' }));

// 2. เสียบ Module Users เข้าไปในเส้นทาง /api/users
app.route('/api/users', userRoutes);

// 3. เริ่มต้น Server ด้วย Bun
console.log('🚀 Backend is running on http://localhost:3000');
console.log('📚 Swagger UI is at http://localhost:3000/docs');

export default {
  port: 3000,
  fetch: app.fetch,
};