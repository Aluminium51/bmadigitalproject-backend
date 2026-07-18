import { compressPdf } from "../../utils/pdf-compressor";
import { db } from "../../db";
import { projectAttachments, projects } from "../../db/schema/projects";
import { projectAttachmentTypes } from "../../db/schema/lookups";
import { eq, like } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { OWNER_EDITABLE_STATUS_IDS } from "../projects/project-workflow";
import { join, basename } from "node:path";
import { mkdir, unlink } from "node:fs/promises";
import { v7 as uuidv7 } from "uuid";

export const MAX_PDF_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENT_UPLOAD_BYTES = 25 * 1024 * 1024;
export const UPLOAD_STORAGE_DIR = process.env.UPLOAD_STORAGE_DIR ?? join(process.cwd(), "uploads");

export class UploadValidationError extends Error {
  status = 413 as const;
}

export class UploadService {
  static async uploadDocument(file: File, projectId: string, userId: string, docTypeId: number) {
    const [project] = await db
      .select({ ownerId: projects.userId, statusId: projects.projectStatusId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) throw new HTTPException(404, { message: "Project not found" });
    if (project.ownerId !== userId) {
      throw new HTTPException(403, { message: "Only the project owner can upload project files" });
    }
    if (!OWNER_EDITABLE_STATUS_IDS.includes(project.statusId as typeof OWNER_EDITABLE_STATUS_IDS[number])) {
      throw new HTTPException(409, { message: "Project uploads are locked at the current project stage" });
    }

    const [documentType] = await db
      .select({ id: projectAttachmentTypes.id })
      .from(projectAttachmentTypes)
      .where(eq(projectAttachmentTypes.id, docTypeId))
      .limit(1);
    if (!documentType) throw new HTTPException(400, { message: "Invalid project attachment type" });

    const processed = await this.processAndUploadDocument(file);
    try {
      await db.insert(projectAttachments).values({
        id: uuidv7(),
        projectId,
        docTypeId,
        uploadedBy: userId,
        fileName: processed.fileName,
        fileUrl: processed.url,
        fileType: processed.contentType,
      });
    } catch (error) {
      await unlink(processed.storagePath).catch(() => undefined);
      throw error;
    }

    const { storagePath: _storagePath, ...result } = processed;
    return result;
  }

  static async processAndUploadDocument(file: File) {
    if (file.type === "application/pdf" && file.size > MAX_PDF_UPLOAD_BYTES) {
      throw new UploadValidationError("PDF files must be smaller than 20 MB");
    }
    if (file.type.startsWith("image/") && file.size > MAX_IMAGE_UPLOAD_BYTES) {
      throw new UploadValidationError("Images must be smaller than 10 MB");
    }
    if (!file.type.startsWith("image/") && file.type !== "application/pdf" && file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
      throw new UploadValidationError("Documents must be smaller than 25 MB");
    }

    let finalBuffer = await file.arrayBuffer();
    let compressionApplied = false;

    if (file.type === "application/pdf") {
      try {
        const compressedBuffer = await compressPdf(finalBuffer, "/ebook");
        if (compressedBuffer.byteLength < finalBuffer.byteLength) {
          finalBuffer = compressedBuffer;
          compressionApplied = true;
        }
      } catch (error) {
        // Ghostscript is optional in some deployments. The strict size limit
        // still protects the API, while the original PDF remains usable.
        console.warn("PDF compression unavailable; keeping the original PDF", error);
      }
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storedFileName = `${crypto.randomUUID()}-${safeName}`;
    await mkdir(UPLOAD_STORAGE_DIR, { recursive: true });
    const storagePath = join(UPLOAD_STORAGE_DIR, storedFileName);
    await Bun.write(storagePath, finalBuffer);
    const publicApiBase = process.env.PUBLIC_API_URL ?? `http://localhost:${process.env.PORT ?? 8081}/api/v1`;

    return {
      fileName: file.name,
      storedFileName,
      storagePath,
      fileSize: finalBuffer.byteLength,
      contentType: file.type || "application/octet-stream",
      compressionApplied,
      url: `${publicApiBase}/uploads/files/${encodeURIComponent(storedFileName)}`,
    };
  }

  static async getStoredDocument(fileName: string) {
    if (basename(fileName) !== fileName) {
      throw new HTTPException(400, { message: "Invalid file name" });
    }

    const [attachment] = await db
      .select({ fileName: projectAttachments.fileName, fileType: projectAttachments.fileType })
      .from(projectAttachments)
      .where(like(projectAttachments.fileUrl, `%/uploads/files/${fileName}`))
      .limit(1);
    if (!attachment) throw new HTTPException(404, { message: "Uploaded file not found" });

    const file = Bun.file(join(UPLOAD_STORAGE_DIR, fileName));
    if (!(await file.exists())) throw new HTTPException(404, { message: "Uploaded file is unavailable" });
    return { file, fileName: attachment.fileName, contentType: attachment.fileType };
  }
}
