import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../../db";
import { agendas, resolutions } from "../../db/schema/meetings";
import { projects } from "../../db/schema/projects"; 
import { HTTPException } from "hono/http-exception";

const STATUS_MAP = {
  APPROVED: 1,
  NEED_REVISION: 2,
  REJECTED: 3,
  ACKNOWLEDGED: 4
};

export const createResolutionAndUpdateProject = async (
  userId: string,
  agendaId: string,
  resolutionStatusId: number,
  comment: string
) => {
  return await db.transaction(async (tx) => {
    // ตรวจสอบว่า Agenda มีอยู่จริงหรือไม่
    const [agenda] = await tx.select().from(agendas).where(eq(agendas.id, agendaId));
    if (!agenda) {
      throw new HTTPException(404, { message: "ไม่พบวาระการประชุมนี้" });
    }

    // สร้าง มติการประชุม ใหม่
    const [newResolution] = await tx.insert(resolutions).values({
      id: uuidv7(),
      agendaId: agenda.id,
      resolutionStatusId,
      comment,
      recordedBy: userId,
    }).returning();

    // ถ้าวาระนี้เกี่ยวข้องกับโครงการ ให้ตรวจสอบและอัปเดตสถานะโครงการด้วย
    if (agenda.projectId) {
      
      let newProjectStatusId = null;
      if (resolutionStatusId === STATUS_MAP.APPROVED) {
        newProjectStatusId = 3; 
      } else if (resolutionStatusId === STATUS_MAP.NEED_REVISION) {
        newProjectStatusId = 4; 
      }

      // อัปเดตสถานะโครงการถ้ามีการเปลี่ยนแปลง
      if (newProjectStatusId) {
        await tx.update(projects)
          .set({ 
            projectStatusId: newProjectStatusId, 
            updatedAt: new Date(),
            updatedBy: userId 
          })
          .where(eq(projects.id, agenda.projectId));
      }
    }

    return newResolution;
  });
};