// src/modules/uploads/upload.controller.ts
import { Context } from "hono";
import { UploadService } from "./upload.service";
import { getUserId } from "../../utils/controller-helper";
import { db } from "../../db";
import { projects } from "../../db/schema/projects";
import { eq } from "drizzle-orm";
import { OWNER_EDITABLE_STATUS_IDS } from "../projects/project-workflow";

export class UploadController {
  static async uploadDocument(c: Context) {
    try {
      const userId = getUserId(c);
      const body = await c.req.parseBody();
      const file = body["file"] as File;
      const projectId = body["projectId"] as string;

      if (!file || !projectId) {
        return c.json({ error: "File and projectId are required" }, 400);
      }

      const [project] = await db
        .select({ ownerId: projects.userId, statusId: projects.projectStatusId })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);
      if (!project) return c.json({ error: "Project not found" }, 404);
      if (project.ownerId !== userId) return c.json({ error: "Only the project owner can upload proposal files" }, 403);
      if (!OWNER_EDITABLE_STATUS_IDS.includes(project.statusId as typeof OWNER_EDITABLE_STATUS_IDS[number])) {
        return c.json({ error: "Proposal uploads are locked at the current project stage" }, 409);
      }

      // โยนให้ Service จัดการ
      const result = await UploadService.processAndUploadDocument(file);

      return c.json({ 
        success: true, 
        message: "File compressed and uploaded successfully",
        data: result
      }, 201);

    } catch (error) {
      console.error("Upload Error:", error);
      return c.json({ error: "Internal Server Error" }, 500);
    }
  }
}
