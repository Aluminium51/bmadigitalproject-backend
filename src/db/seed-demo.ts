import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "./index";
import { roleUsers, users } from "./schema/users";
import { seedData } from "./seed-data";
import { seedMockProjects } from "./seed-projects";
import { seedRequiredData } from "./seed-required";

async function seedDemoData() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo seed is disabled when NODE_ENV=production");
  }

  await seedRequiredData();

  for (const userData of seedData.mockUsers) {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, userData.username),
    });

    const userId = existingUser?.userId ?? uuidv7();

    if (!existingUser) {
      const password = await Bun.password.hash(userData.rawPassword);
      await db.insert(users).values({
        userId,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password,
        divisionId: userData.divisionId,
        isVerified: true,
      });
    }

    await db.insert(roleUsers)
      .values({ userId, roleId: userData.roleId })
      .onConflictDoNothing();
  }

  await seedMockProjects();
}

async function main() {
  try {
    console.log("Starting development demo seed...");
    await seedDemoData();
    console.log("Development demo seed completed.");
  } catch (error) {
    console.error("Development demo seed failed:", error);
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  void main();
}

export { seedDemoData };
