import { Hono } from "hono";
import { ProjectController } from "./project.controller";
// อย่าลืม import authMiddleware ของคุณมาด้วย (เพื่อป้องกัน API)
// import { authMiddleware } from "../../middlewares/auth.middleware"; 

export const projectRoutes = new Hono();

// ถ้าต้องการป้องกันทุก Route ให้ใส่ Middleware คั่นตรงนี้
// projectRoutes.use("*", authMiddleware);

projectRoutes.get("/", ProjectController.getAll);
projectRoutes.get("/:id", ProjectController.getById);
projectRoutes.post("/", ProjectController.create);
projectRoutes.patch("/:id", ProjectController.update);