"use client";
import { useState } from "react";
import { Banner } from "@/components/ui/primitives";
export function WorkerCredentials({
  credentials,
  onClose,
}: {
  credentials: { username: string; password: string };
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        `เลข Passport: ${credentials.username}\nรหัสผ่าน: ${credentials.password}`,
      );
      setMessage("คัดลอกแล้ว พร้อมส่งให้ลูกจ้างด้วยตนเอง");
    } catch {
      setMessage("คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกข้อความและคัดลอกเอง");
    }
  }
  return (
    <section className="stack" aria-label="ข้อมูลบัญชีลูกจ้าง">
      <h2>บัญชีลูกจ้างพร้อมใช้งาน</h2>
      <Banner>
        รหัสผ่านแสดงครั้งเดียว กรุณาคัดลอกและส่งให้ลูกจ้างด้วยตนเอง
        ระบบไม่ส่งอีเมลและไม่สามารถเปิดดูรหัสเดิมได้ หากทำหายให้ Generate
        รหัสใหม่
      </Banner>
      <div className="field">
        <label htmlFor="generated-username">เลข Passport สำหรับ Login</label>
        <input id="generated-username" readOnly value={credentials.username} />
      </div>
      <div className="field">
        <label htmlFor="generated-password">รหัสผ่านที่ระบบสร้าง</label>
        <input
          id="generated-password"
          readOnly
          value={credentials.password}
          autoComplete="off"
        />
      </div>
      <p role="status">{message}</p>
      <div className="row">
        <button className="button" type="button" onClick={copy}>
          คัดลอกบัญชีและรหัสผ่าน
        </button>
        <button className="button secondary" type="button" onClick={onClose}>
          เสร็จสิ้น
        </button>
      </div>
    </section>
  );
}
