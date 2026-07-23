// src/modules/projects/project.controller.ts
import type { Context } from "hono";
import { getUserContext } from "../../utils/controller-helper";
import * as projectService from "./project.service";
import type {
  AssignProjectDTO,
  CreateProjectDTO,
  SecretaryPendingProjectQueryDTO,
  SecretaryReviewDTO,
  UpdateProjectDTO,
  UpdateProjectStatusDTO,
  UpdateProjectTypeDTO,
} from "./project.schema";

export const getProjects = async (c: Context, query: any) => {
  const user = getUserContext(c);
  const result = await projectService.findAllProjects(user, query);
  return c.json(result, 200);
};

export const getProjectById = async (c: Context, id: string) => {
  const user = getUserContext(c);
  const project = await projectService.findProjectById(id, user);
  return c.json(project, 200);
};

export const getPendingSecretaryProjects = async (
  c: Context,
  query: SecretaryPendingProjectQueryDTO,
) => {
  const user = getUserContext(c);
  const result = await projectService.getPendingSecretaryProjects(query, user);
  return c.json(result, 200);
};

export const createProject = async (c: Context, body: CreateProjectDTO) => {
  const user = getUserContext(c);
  const newProject = await projectService.createProject(user, body);
  return c.json({ message: "สร้างโครงการสำเร็จ", project: newProject }, 201);
};

export const updateProject = async (
  c: Context,
  id: string,
  body: UpdateProjectDTO,
) => {
  const user = getUserContext(c);
  const updatedProject = await projectService.updateProject(id, body, user);
  return c.json({ message: "อัปเดตข้อมูลโครงการสำเร็จ", project: updatedProject }, 200);
};

export const updateProjectStatus = async (c: Context, id: string, body: UpdateProjectStatusDTO) => {
  const user = getUserContext(c);
  const updatedProject = await projectService.updateProjectStatus(id, body, user);
  return c.json({ message: "อัปเดตสถานะโครงการสำเร็จ", project: updatedProject }, 200);
};

export const reviewSecretaryProject = async (
  c: Context,
  id: string,
  body: SecretaryReviewDTO,
) => {
  const user = getUserContext(c);
  const result = await projectService.reviewSecretaryProject(id, body, user);
  return c.json({
    message: "Secretary review completed successfully",
    ...result,
  }, 200);
};

export const updateProjectType = async (c: Context, id: string, body: UpdateProjectTypeDTO) => {
  const user = getUserContext(c);
  const updatedProject = await projectService.updateProjectType(id, body, user);
  return c.json({ message: "อัปเดตประเภทโครงการสำเร็จ", project: updatedProject }, 200);
};

export const assignProject = async (c: Context, id: string, body: AssignProjectDTO) => {
  const user = getUserContext(c);
  const updatedProject = await projectService.assignProject(id, body, user);
  return c.json({ message: "มอบหมายโครงการสำเร็จ", project: updatedProject }, 200); 
};

export const deleteProject = async (c: Context, id: string) => {
  const user = getUserContext(c); 
  await projectService.removeProject(id, user);
  return c.json({ message: "ลบโครงการสำเร็จ" }, 200);
};
