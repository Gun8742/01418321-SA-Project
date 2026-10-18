"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDemo } from "../demo/context";
import { OperationForm, Banner } from "@/components/ui/primitives";
import type { OperationResult } from "./model";
export function BackendLogin() {
  const { refresh } = useDemo();
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  async function signIn(
    values: Record<string, string>,
  ): Promise<OperationResult> {
    setSaving(true);
    const requestId = crypto.randomUUID();
    try {
      const response = await fetch("/api/auth/sign-in/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: values.username,
          password: values.password,
        }),
        credentials: "same-origin",
      });
      if (response.status >= 500) throw new Error("Authentication unavailable");
      if (!response.ok)
        return {
          ok: false,
          error: {
            code: response.status === 429 ? "RATE_LIMITED" : "UNAUTHENTICATED",
            message:
              response.status === 429
                ? "ลองเข้าสู่ระบบถี่เกินไป กรุณารอแล้วลองใหม่"
                : "ชื่อบัญชีหรือรหัสผ่านไม่ถูกต้อง",
            retryable: false,
          },
          requestId,
        };
      const actor = await refresh();
      if (!actor) throw new Error("Session unavailable");
      router.replace(
        actor.role === "EMPLOYER" ? "/employer/workers" : "/worker",
      );
      return { ok: true, data: { id: actor.accountId }, requestId };
    } catch {
      return {
        ok: false,
        error: {
          code: "SAVE_FAILED",
          message: "ติดต่อระบบไม่ได้ กรุณาลองใหม่",
          retryable: true,
        },
        requestId,
      };
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="login">
      <section className="login-brand">
        <strong>SA / WORKFORCE</strong>
        <h2>ระบบจัดการเอกสารและติดตามการจ้างแรงงานต่างด้าว</h2>
        <p>เข้าสู่ระบบด้วยบัญชีที่ได้รับสิทธิ์</p>
      </section>
      <section className="login-form stack">
        <h1>เข้าสู่ระบบ</h1>
        <Banner>
          ใช้บัญชีที่ผู้ดูแลจัดเตรียมให้ · การยื่นและการพิจารณาเกิดภายนอกระบบ
        </Banner>
        <OperationForm
          key="backend-login"
          fields={[
            { name: "username", label: "ชื่อบัญชี", required: true },
            {
              name: "password",
              label: "รหัสผ่าน",
              type: "password",
              required: true,
            },
          ]}
          disabled={saving}
          submitLabel={saving ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          onSave={signIn}
        />
      </section>
    </main>
  );
}
