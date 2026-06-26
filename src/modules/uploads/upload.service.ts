import { compressPdf } from "../../utils/pdf-compressor";
import { write } from "bun";

export class UploadService {
  static async processAndUploadDocument(file: File) {
    let finalBuffer: ArrayBuffer;

    if (file.type === "application/pdf") {
      const originalBuffer = await file.arrayBuffer();
      finalBuffer = await compressPdf(originalBuffer, "/ebook");
    } else {
      finalBuffer = await file.arrayBuffer();
    }

    // code ชั่วคราวสำหรับทดสอบ: เซฟไฟล์ลง Harddisk ของ Server
    // จะเซฟไปไว้ที่โฟลเดอร์ public (ต้องมั่นใจว่ามีโฟลเดอร์นี้) หรือเซฟไว้ root ชั่วคราวก็ได้
    const tempFileName = `compressed-${Date.now()}.pdf`;
    await Bun.write(tempFileName, finalBuffer);
    console.log(`✅ บันทึกไฟล์ทดสอบไว้ที่: ${tempFileName}`);

    // --- ส่วนนี้รอเชื่อมต่อกับ Cloud (S3/R2) ของจริง ---
    const mockUploadUrl = `https://storage.bma.go.th/${tempFileName}`;

    return {
      fileName: file.name,
      fileSize: finalBuffer.byteLength,
      url: mockUploadUrl,
    };
  }
}