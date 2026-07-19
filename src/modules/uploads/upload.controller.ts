import type { Context } from "hono";
import { getUserContext } from "../../utils/controller-helper";
import { UploadService, UploadValidationError } from "./upload.service";

export const uploadDocument = async (c: Context) => {
  const user = getUserContext(c);
  const body = await c.req.parseBody();
  const file = body.file as File | undefined;
  const projectId = typeof body.projectId === "string" ? body.projectId : undefined;
  const docTypeId = Number(body.docTypeId);
  const description = typeof body.description === "string" ? body.description : undefined;

  if (!file || !projectId || !Number.isInteger(docTypeId) || docTypeId < 1) {
    return c.json({ error: "File, projectId, and docTypeId are required" }, 400);
  }

  try {
    const result = await UploadService.uploadDocument(file, projectId, user, docTypeId, description);
    return c.json(
      {
        success: true,
        message: "File compressed and uploaded successfully",
        data: result,
      },
      201,
    );
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return c.json({ error: error.message }, 413);
    }
    throw error;
  }
};

export const deleteUploadedFile = async (c: Context) => {
  const user = getUserContext(c);
  await UploadService.deleteDocument(c.req.param("fileId"), user);
  return c.json({ success: true, message: "File deleted successfully" }, 200);
};

export const getUploadedFile = async (c: Context) => {
  const result = await UploadService.getStoredDocument(c.req.param("fileName"));
  const canRenderInline = result.contentType.startsWith("image/") || result.contentType === "application/pdf";
  return new Response(result.file, {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `${canRenderInline ? "inline" : "attachment"}; filename="${result.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
};
