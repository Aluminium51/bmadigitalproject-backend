# start phase
docker-compose up -d postgres
bun run dev
bunx prisma migrate dev --name init_database
bunx prisma generate

# all in one
docker-compose up -d --build

# view database http://localhost:5555
bunx prisma studio
docker-compose ps

# stop phase
docker-compose down
docker-compose down -v