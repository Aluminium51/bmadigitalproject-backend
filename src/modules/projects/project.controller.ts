// src/modules/projects/project.controller.ts
import type { Context } from "hono";
import { getUserId } from "../../utils/controller-helper";
import * as projectService from "./project.service";
import type { CreateProjectDTO, UpdateProjectDTO } from "./project.schema";

export const getProjects = async (c: Context) => {
  getUserId(c);
  const result = await projectService.findAllProjects();
  return c.json(result, 200);
};

export const getProjectById = async (c: Context, id: string) => {
  getUserId(c);
  const project = await projectService.findProjectById(id);
  return c.json(project, 200);
};

export const createProject = async (c: Context, body: CreateProjectDTO) => {
  const userId = getUserId(c);
  const newProject = await projectService.createProject(userId, body);
  return c.json({ message: "สร้างโครงการสำเร็จ", project: newProject }, 201);
};

export const updateProject = async (
  c: Context,
  id: string,
  body: UpdateProjectDTO,
) => {
  const userId = getUserId(c);
  const updatedProject = await projectService.updateProject(id, body, userId);
  return c.json({ message: "อัปเดตข้อมูลโครงการสำเร็จ", project: updatedProject }, 200);
};

export const deleteProject = async (c: Context, id: string) => {
  const userId = getUserId(c);
  await projectService.removeProject(id, userId);
  return c.json({ message: "ลบโครงการสำเร็จ" }, 200);
};
