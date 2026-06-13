# ใช้ Official Image ของ Bun ที่เบาและเร็ว
FROM oven/bun:1-alpine AS base
WORKDIR /app

# 1. Copy ไฟล์ที่จำเป็นสำหรับการลง Packages
COPY package.json bun.lock ./

# 2. ลง Dependencies (ใช้ --frozen-lockfile เพื่อความเสถียร)
RUN bun install --frozen-lockfile

# 3. Copy Source Code ทั้งหมด (ระบบจะก๊อปปี้ drizzle.config.ts และโฟลเดอร์ src มาด้วย)
COPY . .

# 4. เปิด Port 8081
EXPOSE 8081

# 5. สั่งรัน Production
CMD ["sh", "-c", "bunx drizzle-kit push && bun run src/index.ts"]
