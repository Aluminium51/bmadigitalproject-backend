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

# validation (backend)
bunx tsc --noEmit
bun build ./src/index.ts --outdir ./dist --target bun
bun audit

# validation (frontend)
pnpm build
pnpm tsc --noEmit
pnpm audit


# reset docker
docker-compose down -v
docker builder prune -f
