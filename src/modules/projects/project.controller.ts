import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import * as projectService from "./project.service";

export const getProjects = async (c: Context) => {
  const result = await projectService.findAllProjects();
  return c.json(result, 200);
};

export const getProjectById = async (c: Context) => {
  const { id } = (c.req.valid as any)('param'); 
  const project = await projectService.findProjectById(id);
  
  return c.json(project, 200);
};

export const createProject = async (c: Context) => {
  const user = c.get("user");
  if (!user || !user.id) throw new HTTPException(401, { message: "Unauthorized" });

  const body = (c.req.valid as any)('json');
  const newProject = await projectService.createProject(user.id, body);
  
  return c.json({ message: "สร้างโครงการสำเร็จ", project: newProject }, 201);
};

export const updateProject = async (c: Context) => {
  const user = c.get("user");
  if (!user || !user.id) throw new HTTPException(401, { message: "Unauthorized" });

  const { id } = (c.req.valid as any)('param');
  const body = (c.req.valid as any)('json');

  const updatedProject = await projectService.updateProject(id, body, user.id);
  return c.json({ message: "อัปเดตข้อมูลสำเร็จ", project: updatedProject }, 200);
};

export const deleteProject = async (c: Context) => {
  const user = c.get("user");
  if (!user) throw new HTTPException(401, { message: "Unauthorized" });

  const { id } = (c.req.valid as any)('param');
  await projectService.removeProject(id);
  
  return c.json({ message: "ลบโครงการสำเร็จ" }, 200);
};