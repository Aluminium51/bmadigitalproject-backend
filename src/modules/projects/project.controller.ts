import type { Context } from "hono";
import { ProjectService } from "./project.service";
import { createProjectSchema, updateProjectSchema, projectIdSchema } from "./project.schema";

export class ProjectController {
  static async getAll(c: Context) {
    const result = await ProjectService.getProjects();
    return c.json({ success: true, data: result }, 200);
  }

  static async getById(c: Context) {
    const { id } = projectIdSchema.parse(c.req.param());
    const project = await ProjectService.getProjectById(id);
    return c.json({ success: true, data: project }, 200);
  }

  static async create(c: Context) {
    // สมมติว่า middleware Auth แนบข้อมูล user ไว้ที่ c.get('user')
    // ถ้าคุณใช้ชื่อตัวแปรอื่นใน middleware ให้แก้ตรงนี้นะครับ
    const user = c.get("user"); 
    if (!user) throw new Error("Unauthorized");

    const body = await c.req.json();
    const data = createProjectSchema.parse(body);

    const newProject = await ProjectService.createProject(user.userId, data);
    return c.json({ success: true, data: newProject, message: "สร้างโครงการสำเร็จ" }, 201);
  }

  static async update(c: Context) {
    const user = c.get("user");
    if (!user) throw new Error("Unauthorized");

    const { id } = projectIdSchema.parse(c.req.param());
    const body = await c.req.json();
    const data = updateProjectSchema.parse(body);

    const updatedProject = await ProjectService.updateProject(id, data, user.userId);
    return c.json({ success: true, data: updatedProject, message: "อัปเดตข้อมูลสำเร็จ" }, 200);
  }
}