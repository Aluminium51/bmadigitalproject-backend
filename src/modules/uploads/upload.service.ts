import { compressPdf } from "../../utils/pdf-compressor";
import { db } from "../../db";
import { projectAttachments, projects } from "../../db/schema/projects";
import { divisions, projectAttachmentTypes } from "../../db/schema/lookups";
import { users } from "../../db/schema/users";
import { and, eq, isNull, like } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { OWNER_EDITABLE_STATUS_IDS } from "../projects/project-workflow";
import type { UserContext } from "../../utils/permission.helper";
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

export class UploadTypeValidationError extends Error {
  status = 400 as const;
}

const PRESENTATION_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const PDF_MIME_TYPES = new Set(["application/pdf"]);
const DIAGRAM_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const getFileExtension = (fileName: string) => {
  const extension = fileName.toLowerCase().split(".").pop();
  return extension ? `.${extension}` : "";
};

function getEffectiveContentType(file: File) {
  if (file.type) return file.type;

  const extension = getFileExtension(file.name);
  return (
    {
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".ppt": "application/vnd.ms-powerpoint",
      ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    } as Record<string, string>
  )[extension] ?? "application/octet-stream";
}

function assertDocumentTypeMatchesFile(file: File, docTypeName: string) {
  const extension = getFileExtension(file.name);
  const mimeType = file.type.toLowerCase();
  let allowedExtensions: Set<string> | null = null;
  let allowedMimeTypes: Set<string> | null = null;

  if (docTypeName === "presentation") {
    allowedExtensions = new Set([".pdf", ".ppt", ".pptx"]);
    allowedMimeTypes = PRESENTATION_MIME_TYPES;
  } else if (["quotation", "one_page_summary", "bma_dc_usage"].includes(docTypeName)) {
    allowedExtensions = new Set([".pdf"]);
    allowedMimeTypes = PDF_MIME_TYPES;
  } else if (
    ["system_diagram", "network_diagram", "use_case_diagram", "security_diagram"].includes(docTypeName)
  ) {
    allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);
    allowedMimeTypes = DIAGRAM_MIME_TYPES;
  }

  if (!allowedExtensions) return;

  if (!allowedExtensions.has(extension)) {
    throw new UploadTypeValidationError(
      `The selected file extension is not allowed for ${docTypeName}`,
    );
  }

  // Some clients omit File.type. In that case the extension is still checked;
  // a reported MIME type must always match the selected document category.
  if (mimeType && !allowedMimeTypes?.has(mimeType)) {
    throw new UploadTypeValidationError(
      `The selected file MIME type is not allowed for ${docTypeName}`,
    );
  }
}

export class UploadService {
  private static assertAttachmentPermission(
    user: UserContext,
    project: { ownerId: string; statusId: number; ownerDepartmentId: number | null },
  ) {
    const isSuperAdmin = user.roles.includes("super_admin");
    const isSecretary = user.roles.includes("secretary");
    const isOwner = project.ownerId === user.userId;
    const isSameDepartment = project.ownerDepartmentId !== null && project.ownerDepartmentId === user.departmentId;
    const hasAttachmentRole = user.roles.some((role) => ["secretary", "admin", "super_admin"].includes(role));

    if (!isSecretary && !OWNER_EDITABLE_STATUS_IDS.includes(project.statusId as typeof OWNER_EDITABLE_STATUS_IDS[number]) && !isSuperAdmin) {
      throw new HTTPException(409, { message: "Project attachments are read-only at the current project stage" });
    }
    if (!isSuperAdmin && !isOwner && !isSameDepartment && !hasAttachmentRole) {
      throw new HTTPException(403, { message: "You do not have permission to manage attachments for this project" });
    }
  }

  static async uploadDocument(file: File, projectId: string, user: UserContext, docTypeName: string, description?: string) {
    const [project] = await db
      .select({ ownerId: projects.userId, statusId: projects.projectStatusId, ownerDepartmentId: divisions.departmentId })
      .from(projects)
      .leftJoin(divisions, eq(projects.divisionId, divisions.divisionId))
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) throw new HTTPException(404, { message: "Project not found" });
    this.assertAttachmentPermission(user, project);

    const [documentType] = await db
      .select({ id: projectAttachmentTypes.id, name: projectAttachmentTypes.docTypeName })
      .from(projectAttachmentTypes)
      .where(eq(projectAttachmentTypes.docTypeName, docTypeName))
      .limit(1);
    if (!documentType) throw new HTTPException(400, { message: "Invalid project attachment type" });

    assertDocumentTypeMatchesFile(file, documentType.name);

    const processed = await this.processAndUploadDocument(file);
    const attachmentId = uuidv7();
    try {
      await db.insert(projectAttachments).values({
        id: attachmentId,
        projectId,
        docTypeId: documentType.id,
        uploadedBy: user.userId,
        fileName: processed.fileName,
        fileUrl: processed.url,
        fileType: processed.contentType,
        fileSize: processed.fileSize,
        description: description?.trim() || null,
      });
    } catch (error) {
      await unlink(processed.storagePath).catch(() => undefined);
      throw error;
    }

    const [uploader] = await db
      .select({ userId: users.userId, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.userId, user.userId))
      .limit(1);
    const { storagePath: _storagePath, ...result } = processed;
    return {
      attachmentId,
      docTypeId: documentType.id,
      docTypeName: documentType.name,
      ...result,
      canDelete:
        documentType.name !== "approval_document" ||
        user.roles.some((role) => ["admin", "super_admin"].includes(role)),
      uploader: uploader ?? null,
    };
  }

  static async deleteDocument(fileId: string, user: UserContext) {
    const [attachment] = await db
      .select({
        id: projectAttachments.id,
        fileUrl: projectAttachments.fileUrl,
        projectId: projectAttachments.projectId,
        docTypeId: projectAttachments.docTypeId,
        docTypeName: projectAttachmentTypes.docTypeName,
        ownerId: projects.userId,
        statusId: projects.projectStatusId,
        ownerDepartmentId: divisions.departmentId,
      })
      .from(projectAttachments)
      .innerJoin(projects, eq(projectAttachments.projectId, projects.id))
      .innerJoin(projectAttachmentTypes, eq(projectAttachments.docTypeId, projectAttachmentTypes.id))
      .leftJoin(divisions, eq(projects.divisionId, divisions.divisionId))
      .where(and(eq(projectAttachments.id, fileId), isNull(projects.deletedAt)))
      .limit(1);
    if (!attachment) throw new HTTPException(404, { message: "Uploaded file not found" });

    if (
      attachment.docTypeName === "approval_document" &&
      !user.roles.some((role) => ["admin", "super_admin"].includes(role))
    ) {
      throw new HTTPException(403, {
        message: "Only Admin or Super Admin can delete Approval Document versions",
      });
    }

    if (attachment.docTypeName !== "approval_document") {
      this.assertAttachmentPermission(user, attachment);
    }
    await db.delete(projectAttachments).where(eq(projectAttachments.id, fileId));

    const rawName = attachment.fileUrl.split("/").pop() || "";
    const fileName = decodeURIComponent(rawName);
    if (basename(fileName) === fileName) {
      await unlink(join(UPLOAD_STORAGE_DIR, fileName)).catch(() => undefined);
    }
  }

  static async processAndUploadDocument(file: File) {
    const contentType = getEffectiveContentType(file);

    if (contentType === "application/pdf" && file.size > MAX_PDF_UPLOAD_BYTES) {
      throw new UploadValidationError("PDF files must be smaller than 20 MB");
    }
    if (contentType.startsWith("image/") && file.size > MAX_IMAGE_UPLOAD_BYTES) {
      throw new UploadValidationError("Images must be smaller than 10 MB");
    }
    if (!contentType.startsWith("image/") && contentType !== "application/pdf" && file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
      throw new UploadValidationError("Documents must be smaller than 25 MB");
    }

    let finalBuffer = await file.arrayBuffer();
    let compressionApplied = false;

    if (contentType === "application/pdf") {
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
      contentType,
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
      .innerJoin(projects, eq(projectAttachments.projectId, projects.id))
      .where(and(like(projectAttachments.fileUrl, `%/uploads/files/${fileName}`), isNull(projects.deletedAt)))
      .limit(1);
    if (!attachment) throw new HTTPException(404, { message: "Uploaded file not found" });

    const file = Bun.file(join(UPLOAD_STORAGE_DIR, fileName));
    if (!(await file.exists())) throw new HTTPException(404, { message: "Uploaded file is unavailable" });
    return { file, fileName: attachment.fileName, contentType: attachment.fileType };
  }
}
