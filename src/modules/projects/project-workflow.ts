import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { projects } from "../../db/schema/projects";
import { projectStatusLogs } from "../../db/schema/project_status_logs";

export const PROJECT_STATUS = {
  DRAFT: 1,
  PENDING_SECRETARY: 2,
  RETURNED_SECRETARY: 3,
  REJECTED_SECRETARY: 4,
  PENDING_ASSIGNMENT: 5,
  IN_ANALYSIS: 6,
  RETURNED_ANALYST: 7,
  REJECTED_ANALYST: 8,
  PENDING_SMALL_BOARD: 9,
  RETURNED_SMALL_BOARD: 10,
  REJECTED_SMALL_BOARD: 11,
  PENDING_BIG_BOARD: 12,
  RETURNED_BIG_BOARD: 13,
  REJECTED_BIG_BOARD: 14,
  APPROVED: 15,
} as const;

export const OWNER_EDITABLE_STATUS_IDS = [
  PROJECT_STATUS.DRAFT,
  PROJECT_STATUS.RETURNED_SECRETARY,
  PROJECT_STATUS.RETURNED_ANALYST,
  PROJECT_STATUS.RETURNED_SMALL_BOARD,
  PROJECT_STATUS.RETURNED_BIG_BOARD,
] as const;

export const OWNER_LOCKED_STATUS_IDS = [
  PROJECT_STATUS.PENDING_SECRETARY,
  PROJECT_STATUS.PENDING_ASSIGNMENT,
  PROJECT_STATUS.IN_ANALYSIS,
  PROJECT_STATUS.PENDING_SMALL_BOARD,
  PROJECT_STATUS.PENDING_BIG_BOARD,
  PROJECT_STATUS.APPROVED,
] as const;

const TRANSITIONS: Record<number, number[]> = {
  [PROJECT_STATUS.DRAFT]: [PROJECT_STATUS.PENDING_SECRETARY],
  [PROJECT_STATUS.PENDING_SECRETARY]: [
    PROJECT_STATUS.RETURNED_SECRETARY,
    PROJECT_STATUS.REJECTED_SECRETARY,
    PROJECT_STATUS.PENDING_ASSIGNMENT,
  ],
  [PROJECT_STATUS.PENDING_ASSIGNMENT]: [PROJECT_STATUS.IN_ANALYSIS],
  [PROJECT_STATUS.IN_ANALYSIS]: [
    PROJECT_STATUS.RETURNED_ANALYST,
    PROJECT_STATUS.REJECTED_ANALYST,
    PROJECT_STATUS.PENDING_SMALL_BOARD,
  ],
  [PROJECT_STATUS.RETURNED_SECRETARY]: [PROJECT_STATUS.PENDING_SECRETARY],
  [PROJECT_STATUS.RETURNED_ANALYST]: [PROJECT_STATUS.IN_ANALYSIS],
  [PROJECT_STATUS.RETURNED_SMALL_BOARD]: [PROJECT_STATUS.IN_ANALYSIS],
  [PROJECT_STATUS.RETURNED_BIG_BOARD]: [PROJECT_STATUS.IN_ANALYSIS],
  [PROJECT_STATUS.PENDING_SMALL_BOARD]: [PROJECT_STATUS.PENDING_BIG_BOARD, PROJECT_STATUS.RETURNED_SMALL_BOARD, PROJECT_STATUS.REJECTED_SMALL_BOARD],
  [PROJECT_STATUS.PENDING_BIG_BOARD]: [PROJECT_STATUS.APPROVED, PROJECT_STATUS.RETURNED_BIG_BOARD, PROJECT_STATUS.REJECTED_BIG_BOARD],
};

const NEGATIVE_STATUS_IDS = new Set([
  PROJECT_STATUS.RETURNED_SECRETARY,
  PROJECT_STATUS.REJECTED_SECRETARY,
  PROJECT_STATUS.RETURNED_ANALYST,
  PROJECT_STATUS.REJECTED_ANALYST,
  PROJECT_STATUS.RETURNED_SMALL_BOARD,
  PROJECT_STATUS.REJECTED_SMALL_BOARD,
  PROJECT_STATUS.RETURNED_BIG_BOARD,
  PROJECT_STATUS.REJECTED_BIG_BOARD,
]);

export function assertValidProjectTransition(
  oldStatusId: number,
  newStatusId: number,
  remark?: string | null,
) {
  if (!TRANSITIONS[oldStatusId]?.includes(newStatusId)) {
    throw new HTTPException(409, {
      message: `Invalid project status transition: ${oldStatusId} -> ${newStatusId}`,
    });
  }

  const normalizedRemark = remark?.trim() || null;
  if (NEGATIVE_STATUS_IDS.has(newStatusId) && !normalizedRemark) {
    throw new HTTPException(400, {
      message: "A remark is required for returned or rejected transitions",
    });
  }

  return normalizedRemark;
}

export async function applyProjectStatusTransition(
  tx: any,
  input: {
    projectId: string;
    userId: string;
    oldStatusId: number;
    newStatusId: number;
    remark?: string | null;
  },
) {
  const remark = assertValidProjectTransition(
    input.oldStatusId,
    input.newStatusId,
    input.remark,
  );
  const now = new Date();
  const updated = await tx
    .update(projects)
    .set({
      projectStatusId: input.newStatusId,
      updatedBy: input.userId,
      updatedAt: now,
    })
    .where(and(
      eq(projects.id, input.projectId),
      eq(projects.projectStatusId, input.oldStatusId),
    ))
    .returning({ id: projects.id });

  if (updated.length === 0) {
    throw new HTTPException(409, { message: "Project status changed before this request completed" });
  }

  await tx.insert(projectStatusLogs).values({
    projectId: input.projectId,
    userId: input.userId,
    oldStatusId: input.oldStatusId,
    newStatusId: input.newStatusId,
    remark,
    createdAt: now,
  });
}
