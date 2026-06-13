# start phase
docker-compose up -d postgres
bunx drizzle-kit push
bun run dev

# all in one
docker-compose up -d --build
bunx drizzle-kit push

# stop phase
docker-compose down
docker-compose down -v

# validation
bunx tsc --noEmit
bun build ./src/index.ts --outdir ./dist --target bun

# reset docker
docker-compose down -v
docker builder prune -f
