import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// 1. สร้าง Pool เชื่อมต่อไปที่ Postgres
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// 2. โยน adapter เข้าไปให้ PrismaClient ทำงาน
export const prisma = new PrismaClient({ adapter });