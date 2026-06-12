# start phase
docker-compose up -d
bun run dev
bunx prisma migrate dev --name init_database
bunx prisma generate

# view database http://localhost:5555
bunx prisma studio
docker-compose ps

# stop phase
docker-compose down -v