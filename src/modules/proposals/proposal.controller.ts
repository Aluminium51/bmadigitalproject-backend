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

export const getProposal = async (_c: Context, projectId: string) => {
  const proposal = await proposalService.getProposalByProjectId(projectId);
  if (!proposal) return { data: null, message: "No proposal found" };
  return { data: proposal };
};

export const getDraft = async (_c: Context, projectId: string) => {
  const draft = await proposalService.getDraftByProjectId(projectId);
  if (!draft) {
    return { data: null, message: "ไม่พบข้อมูลแบบร่าง" };
  }
  return { data: draft };
};

export const initializeDraft = async (c: Context, projectId: string) => {
  const userId = getUserId(c);
  const draft = await proposalService.initializeDraft(projectId, userId);
  return { success: true, data: draft };
};

export const autoSaveDraft = async (
  c: Context,
  projectId: string,
  body: DraftProposalDTO,
) => {
  const userId = getUserId(c);
  const savedDraft = await proposalService.upsertDraft(projectId, userId, body);

  return {
    success: true,
    message: "บันทึกแบบร่างอัตโนมัติสำเร็จ",
    data: savedDraft,
  };
};

export const getMyDrafts = async (c: Context) => {
  const userId = getUserId(c);
  const drafts = await proposalService.getMyDrafts(userId);
  return { data: drafts };
};

export const submitProposal = async (c: Context, body: SubmitProposalDTO) => {
  const userId = getUserId(c);
  const proposal = await proposalService.submitProposal(userId, body);

  return {
    success: true,
    message: "ยื่นเสนอโครงการสำเร็จ",
    data: { proposalId: proposal.id },
  };
};
