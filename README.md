This is backend project for BMA digital project. It is a full-stack web application that uses Bun as the runtime and package manager, Hono.js as the web framework, Drizzle ORM for database interactions, PostgreSQL as the database, Zod for validation, and Docker for deployment.

### Tech Stack
- **Runtime & Package Manager:** Bun
- **Framework:** Hono.js (Fast Web Framework)
- **Database ORM:** Drizzle ORM (Type-safe ORM)
- **Database:** PostgreSQL
- **Validation:** Zod + `drizzle-zod`
- **Deployment:** Docker + Docker Compose

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