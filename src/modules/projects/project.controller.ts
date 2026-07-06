import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import * as projectService from "./project.service";
import type { CreateProjectDTO, UpdateProjectDTO } from "./project.schema";

export const getProjects = async (c: Context) => {
  const result = await projectService.findAllProjects();
  return c.json(result, 200);
};

export const getProjectById = async (c: Context, id: string) => {
  const project = await projectService.findProjectById(id);
  return c.json(project, 200);
};

export const createProject = async (c: Context, body: CreateProjectDTO) => {
  const user = c.get("user");
  if (!user?.id) throw new HTTPException(401, { message: "Unauthorized" });

  const newProject = await projectService.createProject(user.id, body);
  return c.json({ message: "สร้างโครงการสำเร็จ", project: newProject }, 201);
};

export const updateProject = async (
  c: Context,
  id: string,
  body: UpdateProjectDTO,
) => {
  const user = c.get("user");
  if (!user?.id) throw new HTTPException(401, { message: "Unauthorized" });

  const updatedProject = await projectService.updateProject(id, body, user.id);
  return c.json({ message: "อัปเดตข้อมูลโครงการสำเร็จ", project: updatedProject }, 200);
};

export const deleteProject = async (c: Context, id: string) => {
  const user = c.get("user");
  if (!user?.id) throw new HTTPException(401, { message: "Unauthorized" });

  await projectService.removeProject(id);
  return c.json({ message: "ลบโครงการสำเร็จ" }, 200);
};
