import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { proposalService } from "./proposal.service";
import type { DraftProposalDTO, SubmitProposalDTO } from "./proposal.schema";

const getUserId = (c: Context) => {
  const user = c.get("user");
  const userId = user?.userId ?? user?.id;

  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  return userId;
};

export const getProposal = async (c: Context, projectId: string) => {
  const proposal = await proposalService.getProposalByProjectId(projectId);
  if (!proposal)
    return c.json({ data: null, message: "No proposal found" }, 200);
  return c.json({ data: proposal }, 200);
};

export const getDraft = async (c: Context, projectId: string) => {
  const draft = await proposalService.getDraftByProjectId(projectId);
  if (!draft) return c.json({ data: null, message: "ไม่พบข้อมูลแบบร่าง" }, 200);
  return c.json({ data: draft }, 200);
};

export const initializeDraft = async (c: Context, projectId: string) => {
  const user = c.get("user");
  if (!user?.userId && !user?.id)
    throw new HTTPException(401, { message: "Unauthorized" });

  const userId = user.userId ?? user.id;
  const draft = await proposalService.initializeDraft(projectId, userId);
  return c.json({ success: true, data: draft }, 201);
};

export const autoSaveDraft = async (
  c: Context,
  projectId: string,
  body: DraftProposalDTO,
) => {
  const user = c.get("user");
  if (!user?.userId && !user?.id)
    throw new HTTPException(401, { message: "Unauthorized" });

  const userId = user.userId ?? user.id;
  const savedDraft = await proposalService.upsertDraft(projectId, userId, body);

  return c.json(
    {
      success: true,
      message: "บันทึกแบบร่างอัตโนมัติสำเร็จ",
      data: savedDraft,
    },
    200,
  );
};

export const getMyDrafts = async (c: Context) => {
  const user = c.get("user");
  if (!user?.userId && !user?.id)
    throw new HTTPException(401, { message: "Unauthorized" });

  const userId = user.userId ?? user.id;
  const drafts = await proposalService.getMyDrafts(userId);
  return c.json({ data: drafts }, 200);
};

// recieve projectId from path param and body from request body
export const submitProposal = async (
  c: Context,
  projectId: string,
  body: SubmitProposalDTO,
) => {
  const user = c.get("user");
  if (!user?.userId && !user?.id)
    throw new HTTPException(401, { message: "Unauthorized" });

  const userId = user.userId ?? user.id;
  const proposalData = { ...body, projectId };
  const proposal = await proposalService.submitProposal(userId, proposalData);

  return c.json(
    {
      success: true,
      message: "ยื่นเสนอโครงการสำเร็จ",
      data: { proposalId: proposal.id },
    },
    200,
  );
};
