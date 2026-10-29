"use client";
import { useState } from "react";
import { z } from "zod";
import { Banner, OperationForm } from "@/components/ui/primitives";
import { useDemo } from "@/features/demo/context";
import type { OperationResult } from "@/features/workforce/model";
import { WorkerCredentials } from "./credentials";
const responseSchema = z.object({
  credentials: z.object({ username: z.string(), password: z.string() }),
});
export function WorkerAccounts() {
  const { data, mode } = useDemo();
  const [credentials, setCredentials] = useState<
    z.infer<typeof responseSchema>["credentials"] | null
  >(null);
  const [saving, setSaving] = useState(false);
  async function submit(
    values: Record<string, string>,
  ): Promise<OperationResult> {
    const requestId = crypto.randomUUID();
    if (
      values.action === "reset" &&
      !window.confirm(
        "Generate รหัสใหม่จะยกเลิกรหัสเดิมและออกจากระบบทุกอุปกรณ์ของลูกจ้าง ยืนยันดำเนินการ?",
      )
    )
      return {
        ok: false,
        requestId,
        error: {
          code: "CANCELLED",
          message: "ยกเลิกการ Generate รหัสใหม่แล้ว",
          retryable: false,
        },
      };
    setSaving(true);
    try {
      const response = await fetch("/api/accounts/" + values.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ workerId: values.workerId }),
      });
      const raw: unknown = await response.json();
      if (!response.ok) {
        const result = z
          .object({ error: z.object({ message: z.string() }) })
          .safeParse(raw);
        return {
          ok: false,
          requestId,
          error: {
            code: "SAVE_FAILED",
            message: result.success
              ? result.data.error.message
              : "ดำเนินการไม่สำเร็จ กรุณาตรวจข้อมูลแล้วลองใหม่",
            retryable: true,
          },
        };
      }
      setCredentials(responseSchema.parse(raw).credentials);
      return { ok: true, requestId, data: { id: values.workerId } };
    } catch {
      return {
        ok: false,
        requestId,
        error: {
          code: "SAVE_FAILED",
          message:
            "ไม่สามารถยืนยันผลได้ กรุณาตรวจบัญชี หากรหัสสูญหายให้ Generate รหัสใหม่",
          retryable: true,
        },
      };
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="panel stack">
      <h1>บัญชีลูกจ้าง</h1>
      {mode !== "backend" ? (
        <Banner>หน้านี้ใช้กับระบบ Backend</Banner>
      ) : credentials ? (
        <WorkerCredentials
          credentials={credentials}
          onClose={() => setCredentials(null)}
        />
      ) : (
        <>
          <p>
            เมื่อเพิ่มลูกจ้างใหม่ ระบบจะสร้างบัญชีให้อัตโนมัติ
            ใช้หน้านี้สำหรับลูกจ้างเดิมที่ยังไม่มีบัญชี หรือ Generate
            รหัสผ่านใหม่ให้นายจ้างส่งต่อเอง
          </p>
          <Banner>
            การ Generate รหัสใหม่จะยกเลิกรหัสเดิมและ Session
            ของลูกจ้างทุกอุปกรณ์
          </Banner>
          <OperationForm
            disabled={saving}
            fields={[
              {
                name: "workerId",
                label: "ลูกจ้าง",
                type: "select",
                required: true,
                options: data.workers.map((w) => ({
                  value: w.id,
                  label: w.name + " · " + w.passportNo,
                })),
              },
              {
                name: "action",
                label: "การดำเนินการ",
                type: "select",
                required: true,
                options: [
                  {
                    value: "create",
                    label: "สร้างบัญชีสำหรับลูกจ้างที่ยังไม่มีบัญชี",
                  },
                  {
                    value: "reset",
                    label: "Generate รหัสผ่านใหม่ / เปลี่ยนมาใช้ Passport",
                  },
                ],
              },
            ]}
            onSave={submit}
            submitLabel="สร้างข้อมูลสำหรับ Login"
          />
        </>
      )}
    </section>
  );
}
