import "server-only";
import nodemailer from "nodemailer";
import { OperationError } from "../features/workforce/operations";

export async function sendAccountMail(
  to: string,
  subject: string,
  url: string,
) {
  const host = process.env.SMTP_HOST;
  const from = process.env.MAIL_FROM;
  if (!host || !from)
    throw new OperationError("SAVE_FAILED", "ยังไม่ได้ตั้งค่าบริการอีเมล");
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    requireTLS: !["127.0.0.1", "localhost", "mail"].includes(host),
    ...(process.env.SMTP_USER
      ? {
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        }
      : {}),
    connectionTimeout: 10000,
    socketTimeout: 15000,
  });
  try {
    await transport.sendMail({
      from,
      to,
      subject,
      text: `${subject}\n\nเปิดลิงก์เพื่อตั้งค่าบัญชีของคุณ\n${url}\n\nหากไม่ได้เป็นผู้ร้องขอ ไม่ต้องดำเนินการใด ๆ`,
    });
  } finally {
    transport.close();
  }
}
