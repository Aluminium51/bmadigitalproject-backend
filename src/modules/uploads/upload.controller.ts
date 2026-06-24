// src/modules/uploads/upload.controller.ts
import { Context } from "hono";
import { UploadService } from "./upload.service";

export class UploadController {
  static async uploadDocument(c: Context) {
    try {
      const body = await c.req.parseBody();
      const file = body["file"] as File;

      if (!file) {
        return c.json({ error: "No file found" }, 400);
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