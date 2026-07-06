// src/modules/proposals/proposal.routes.ts
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  getProposal,
  autoSaveDraft,
  getDraft,
  getMyDrafts,
  submitProposal,
  initializeDraft,
} from "./proposal.controller";
import {
  draftProposalSchema,
  ProposalProjectParamsSchema,
  submitProposalSchema,
} from "./proposal.schema";
import { authMiddleware } from "../../middlewares/auth.middleware";

const proposalRoutes = new OpenAPIHono();

proposalRoutes.use("*", authMiddleware);

const ErrorSchema = z.object({
  message: z.string(),
});

const DataResponseSchema = z.object({
  data: z.any().nullable().optional(),
  message: z.string().optional(),
  success: z.boolean().optional(),
});

const getMyDraftsRoute = createRoute({
  method: "get",
  path: "/drafts/my",
  tags: ["Proposals"],
  responses: {
    200: {
      content: { "application/json": { schema: DataResponseSchema } },
      description: "Current user's proposal drafts",
    },
  },
});
proposalRoutes.openapi(getMyDraftsRoute, async (c) => {
  const response = await getMyDrafts(c);
  return c.json(response, 200);
});

const getDraftRoute = createRoute({
  method: "get",
  path: "/projects/{projectId}/draft",
  tags: ["Proposals"],
  request: { params: ProposalProjectParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: DataResponseSchema } },
      description: "Proposal draft for a project",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid project id",
    },
  },
});
proposalRoutes.openapi(getDraftRoute, (c) => {
  const { projectId } = c.req.valid("param");
  return getDraft(c, projectId).then((response) => c.json(response, 200));
});

const initializeDraftRoute = createRoute({
  method: "post",
  path: "/projects/{projectId}/draft",
  tags: ["Proposals"],
  request: { params: ProposalProjectParamsSchema },
  responses: {
    201: {
      content: { "application/json": { schema: DataResponseSchema } },
      description: "Initialized proposal draft",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid project id",
    },
  },
});
proposalRoutes.openapi(initializeDraftRoute, (c) => {
  const { projectId } = c.req.valid("param");
  return initializeDraft(c, projectId).then((response) => c.json(response, 201));
});

const autoSaveDraftRoute = createRoute({
  method: "patch",
  path: "/projects/{projectId}/draft",
  tags: ["Proposals"],
  request: {
    params: ProposalProjectParamsSchema,
    body: { content: { "application/json": { schema: draftProposalSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: DataResponseSchema } },
      description: "Auto-saved proposal draft",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid request",
    },
  },
});
proposalRoutes.openapi(autoSaveDraftRoute, (c) => {
  const { projectId } = c.req.valid("param");
  const body = c.req.valid("json");
  return autoSaveDraft(c, projectId, body).then((response) =>
    c.json(response, 200),
  );
});

const getProposalRoute = createRoute({
  method: "get",
  path: "/by-project/{projectId}",
  tags: ["Proposals"],
  request: { params: ProposalProjectParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: DataResponseSchema } },
      description: "Submitted proposal for a project",
    },
  },
});
proposalRoutes.openapi(getProposalRoute, (c) => {
  const { projectId } = c.req.valid("param");
  return getProposal(c, projectId).then((response) => c.json(response, 200));
});

const submitProposalRoute = createRoute({
  method: "post",
  path: "/submit",
  tags: ["Proposals"],
  request: {
    body: { content: { "application/json": { schema: submitProposalSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: DataResponseSchema } },
      description: "Submitted proposal",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid request",
    },
  },
});
proposalRoutes.openapi(submitProposalRoute, (c) => {
  const body = c.req.valid("json");
  return submitProposal(c, body).then((response) => c.json(response, 200));
});

export default proposalRoutes;
