# ใช้ Official Image ของ Bun ที่เบาและเร็ว
FROM oven/bun:1-alpine AS base
WORKDIR /app

# 1. Copy ไฟล์ที่จำเป็นสำหรับการลง Packages
COPY package.json bun.lock ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# 2. ลง Dependencies (ใช้ --frozen-lockfile เพื่อความเสถียร)
RUN bun install --frozen-lockfile

# 3. Copy Source Code ทั้งหมด
COPY . .

# 4. สร้าง Prisma Client ใหม่ภายใน Docker
RUN bunx prisma generate

# 5. เปิด Port 8081
EXPOSE 8081

# 6. สั่งรัน Production
CMD ["sh", "-c", "bunx prisma migrate deploy && bun run src/index.ts"]