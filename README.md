This is backend project for BMA digital project. It is a full-stack web application that uses Bun as the runtime and package manager, Hono.js as the web framework, Drizzle ORM for database interactions, PostgreSQL as the database, Zod for validation, and Docker for deployment.

## Core Features (Backend)

*   **RESTful API & OpenAPI Standard:** ให้บริการ API ที่มีโครงสร้างชัดเจน พร้อมสร้าง Document อัตโนมัติผ่าน Swagger UI (`/docs`) ด้วย OpenAPIHono
*   **Transaction-Safe Mutations:** จัดการฟอร์มข้อเสนอโครงการ (Proposal) ขนาดใหญ่ที่มีความสัมพันธ์กว่า 12 ตารางลูก ด้วย Atomic Operations และ `Promise.all` เพื่อประสิทธิภาพขั้นสุดและป้องกัน Data Inconsistency
*   **Centralized Authentication & RBAC:** ตรวจสอบสิทธิ์ผู้ใช้ผ่าน JWT Middleware และแยกแยะ Role (เช่น User, Admin, Board) ก่อนอนุญาตให้เข้าถึง Resource 
*   **Automated Background Jobs (Cron):** มีระบบตั้งเวลาเพื่อลบข้อมูลขยะ (Garbage Collection) เช่น แบบร่างที่ไม่มีการอัปเดตเกิน 30 วัน
*   **PDF Compression & Storage:** รองรับการอัปโหลดไฟล์ บีบอัด PDF อัตโนมัติ และจัดการ Storage อย่างปลอดภัย

### Tech Stack
- **Runtime & Package Manager:** Bun
- **Framework:** Hono.js (Fast Web Framework)
- **Database ORM:** Drizzle ORM (Type-safe ORM)
- **Database:** PostgreSQL
- **Validation:** Zod + `drizzle-zod`
- **Deployment:** Docker + Docker Compose
- **Swagger/OpenAPI:** OpenAPIHono (Auto-generate API Documentation)

---

### How to run the backend project
1. **Prerequisites**
   Make sure you have Bun and Docker / Docker Compose installed on your machine.
2. **Install dependencies:**
   Clone the repository, navigate to the backend directory, and install packages:
    ```bash
    git clone <repository-url>
    cd <backend-directory>
    bun install
    ```
3. **Environment Variables:**
   Create a `.env` file in the backend root directory. Configure your database connection and other secrets (e.g., `DATABASE_URL`).
4. **Start the Backend Server (and Database):**
   Use Docker Compose to spin up the database and the backend service:
   ```bash
   docker-compose up -d --build
   ```
5. **Database Migration & Seeding:**
    Once the database container is running, generate the Drizzle ORM types, sync the schema, and seed the initial master data:
    ```bash
    bun run db:generate
    ```
6. **Verify Backend:**
   The backend server should now be running and accessible at `http://localhost:8081`. You can access the API documentation at `http://localhost:8081/docs/`. You can also test the health check endpoint at `http://localhost:8081/health`.

---

## Directory Tree

```text
src/
├── config/             # settings and constants (ex. role.ts for RBAC)
├── db/                 # Database และ Schema
│   ├── index.ts        # Setup การเชื่อมต่อ Drizzle กับ PostgreSQL
│   └── schema.ts       # "Full" Drizzle Schema of "All" Tables
├── modules/            # Main Modules that handle specific features
│   ├── auth/           # Login, Register
│   ├── users/          
│   ├── uploads/        
│   └── health/         # A simple health check endpoint for monitoring the service
├── utils/              # Utility functions and services (used across multiple modules)
│   ├── action-logger.ts  # Audit log system
│   ├── email.service.ts  # Email sending system
│   ├── error-handler.ts  # Standard error and response handling
│   └── pdf-compressor.ts # 
└── index.ts            # Entry Point (configure Hono, register routes, and global plugins)
```

---

## Module Structure
for every module, we have the following structure:
## 1. *.routes.ts (The Router & API Contract)
- หน้าที่: 
    - บอกว่ามีเส้นทาง (Endpoint) ไหนเปิดให้บริการบ้าง 
    - บอกว่าเส้นทางนั้นต้องการข้อมูลอะไร (Input) จะคืนค่าอะไร (Output)
- สิ่งที่ทำ:
    - กำหนด Method (GET, POST, PUT, DELETE) และ Path (เช่น /users)
    - import Schema จาก *.schema.ts มาผูกกับ Request (Body, Query, Params) และ Response
    - ทำตัวเป็น API Documentation (ด้วย OpenAPIHono เพื่อสร้าง Swagger)
    - ส่งต่อ (Delegate) Context (c) และข้อมูลที่ผ่านการ Validate แล้วไปให้ Controller
- ข้อแตกต่าง: 
    - ทำหน้าที่แค่ผูก Endpoint เข้ากับ Schema และ Controller 
    - ห้ามเขียน Business Logic (if-else, วนลูปประมวลผล) หรือเขียนคำสั่ง SQL (Drizzle) ในไฟล์นี้เด็ดขาด

## 2. *.controller.ts (The Orchestrator)
- หน้าที่: 
    - รับของที่ผ่านการตรวจสอบจาก Route มาสั่งการ Service และแพ็กของที่ Service ทำเสร็จกลับไปเป็น HTTP Response
- สิ่งที่ทำ:
    - รับค่าจาก Route (เช่น body, params)
    - ดึงค่าจาก Context (เช่น ดึง User ID จาก Session หรือ JWT)
    - ส่งข้อมูลทั้งหมดไปให้ Service จัดการ
    - รับผลลัพธ์จาก Service แล้วนำมาแปลงเป็น JSON พร้อมกำหนด HTTP Status Code (เช่น c.json(data, 201)) หรือจัดการดักจับ Error เบื้องต้น
- ข้อแตกต่าง: 
    - Controller จะยุ่งเกี่ยวกับการแปลงข้อมูลให้อยู่ในรูป HTTP Response 
    - แต่ จะไม่ไปแตะ Database หรือเขียน Logic คำนวณซับซ้อนโดยตรง (ส่งต่อให้ Service ทำ)

## 3. *.service.ts (The Brain & Business Logic)
- หน้าที่: 
    - เป็น "สมอง" ของระบบ จัดการเงื่อนไขทางธุรกิจ (Business Rules) และคุยกับ Database
- สิ่งที่ทำ:
    - เขียน Business Logic ทั้งหมด (เช่น เช็คสิทธิ์ว่าทำได้ไหม, ตรวจสอบเงื่อนไขการสร้าง Project, อนุมัติ Workflow)
    - Query Database ผ่าน Drizzle ORM (เช่น insert, select, update, delete)
    - ติดต่อ External Service (เช่น อัปโหลดไฟล์ไป S3, ส่งอีเมล, เข้ารหัสผ่าน)
    - โยน Error ออกมา (throw Error) ถ้ามีเงื่อนไขผิดพลาด เพื่อให้ Controller หรือ Global Error Handler ไปจัดการต่อ
- ข้อแตกต่าง: 
    - Service ต้องไม่รู้เรื่อง HTTP Context เลย (ไม่รับตัวแปร c ของ Hono) 
    - รับแค่ Parameters ธรรมดา (เช่น createUser(userData)) 
    - ทำให้เราสามารถเอาฟังก์ชันใน Service ไปใช้ที่อื่นได้ง่าย

## 4. *.schema.ts (The Definition)
- หน้าที่: 
    - เป็นศูนย์กลางในการ "นิยาม" โครงสร้างข้อมูล (Data Shape) กฎเกณฑ์ (Validation Rules) และ Typescript Type
- สิ่งที่ทำ:
    - ใช้ drizzle-zod หรือ zod สร้าง Schema เช่น CreateUserSchema, UserSchema
    - ใช้กำหนด Error Schema แบบมาตรฐาน
    - ดึง Type ออกมาใช้งาน (เช่น export type User = z.infer<typeof UserSchema>)
- ข้อแตกต่าง: 
    - No Business Logic, No Database Query, No HTTP Context (c)


## AI Developer Notes (System Prompt Instructions)

If you are an AI Assistant, Copilot, or Cursor agent working on this backend repository, you MUST strictly adhere to the following **Separation of Concerns (Route -> Controller -> Service -> Schema)** architecture:

1.  **`*.routes.ts` (API Contract ONLY):**
    *   Use `@hono/zod-openapi` to define paths, methods, request validations (params, query, body), and response schemas.
    *   **STRICT RULE:** NO business logic, NO database queries, and NO `if-else` processing here. Just validate and delegate to the Controller.
2.  **`*.controller.ts` (Orchestrator ONLY):**
    *   Extract validated data from the context (`c.req.valid(...)`) and user info (`c.get('user')`).
    *   Pass the clean parameters to the `*.service.ts` function.
    *   Return the standard HTTP JSON response (`return c.json({...}, 200)`).
    *   **STRICT RULE:** Controllers must NOT execute raw database queries.
3.  **`*.service.ts` (Business Logic & Database):**
    *   This is the brain. Handle business rules, data formatting, and Drizzle ORM queries (`db.insert`, `db.select`, etc.).
    *   **STRICT RULE:** Services must NOT know about Hono Context (`c`). Accept standard TypeScript primitives/objects as arguments.
4.  **`*.schema.ts` (Single Source of Truth):**
    *   Define all Drizzle table schemas and Zod validation schemas here. Export inferred types for DTOs.
5.  **Global Error Handling:**
    *   Do NOT return manual error JSONs (e.g., `return c.json({ error: "..." }, 400)`) inside controllers or services.
    *   **STRICT RULE:** Always `throw new HTTPException(STATUS_CODE, { message: "..." })` and let the global error handler (`src/utils/error-handler.ts`) format the response uniformly.
