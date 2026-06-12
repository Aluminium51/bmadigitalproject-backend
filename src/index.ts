// src/index.ts
import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import userRoutesV1 from './modules/users/user.routes';

const app = new OpenAPIHono();

// แยกกลุ่ม API ของเวอร์ชัน 1 ออกมาอย่างชัดเจน
const v1 = new OpenAPIHono();
v1.route('/users', userRoutesV1);
// ในอนาคตถ้ามีฟีเจอร์อื่นใน v1 ก็ต่อตรงนี้ได้เลย

// ผูกเข้ากับระบบหลัก โดยระบุตําแหน่งเส้นทางเป็น /api/v1
app.route('/api/v1', v1);

// ตั้งค่าเอกสารคู่มือ API แยกตามเวอร์ชัน
app.doc('/openapi-v1.json', {
  openapi: '3.0.0',
  info: { title: 'BMA Platform API (v1)', version: '1.0.0' },
});
app.get('/docs/v1', swaggerUI({ url: '/openapi-v1.json' }));

// 3. เริ่มต้น Server ด้วย Bun
const port = process.env.PORT ? parseInt(process.env.PORT) : 8081;
console.log(`🚀 Backend is running on http://localhost:${port}`);
console.log(`📚 Swagger UI is at http://localhost:${port}/docs/v1`);

export default {
  port,
  fetch: app.fetch,
};