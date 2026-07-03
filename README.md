This is backend project for BMA digital project. It is a full-stack web application that uses Bun as the runtime and package manager, Hono.js as the web framework, Drizzle ORM for database interactions, PostgreSQL as the database, Zod for validation, and Docker for deployment.

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
1. Make sure you have Bun installed on your machine.
2. Clone the repository and navigate to the backend directory.
3. Install dependencies using Bun:
    ```bash
    bun install
    ```
4. Set up the PostgreSQL database and configure the connection in `src/config/database.ts`.
5. Run this command to start the backend server:
    ```bash
    # Migrate the database schema and generate Drizzle ORM types
    bun run db:generate

    # Start the backend server
    docker-compose up -d --build
    ```
6. The backend server should now be running and accessible at `http://localhost:8081`. You can access the API documentation at `http://localhost:8081/docs`.

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

    