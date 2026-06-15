// src/utils/email.service.ts
import { Resend } from 'resend';

// ดึง API Key จาก Environment
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationEmail = async (email: string, token: string, name: string) => {
  const verifyLink = `${process.env.FRONTEND_URL}/verify?token=${token}`;

  try {
    const data = await resend.emails.send({
      from: 'BMA Digital Project <onboarding@resend.dev>', // ตอนเทสต์ใช้ onboarding ของ resend ไปก่อนได้ครับ
      to: email,
      subject: 'ยืนยันการสมัครสมาชิก BMA Digital Project',
      html: `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
          <h2>สวัสดีคุณ ${name}</h2>
          <p>ขอบคุณที่สมัครสมาชิกกับระบบ BMA Digital Project</p>
          <p>กรุณาคลิกที่ปุ่มด้านล่างเพื่อยืนยันอีเมลของคุณและเปิดใช้งานบัญชี:</p>
          <a href="${verifyLink}" style="display: inline-block; padding: 12px 24px; background-color: #0056b3; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            ยืนยันอีเมล
          </a>
          <p>หรือคัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:</p>
          <p><a href="${verifyLink}">${verifyLink}</a></p>
          <p>ลิงก์นี้จะหมดอายุใน 24 ชั่วโมง</p>
        </div>
      `,
    });
    return { success: true, data };
  } catch (error) {
    console.error("Email sending failed:", error);
    return { success: false, error };
  }
};