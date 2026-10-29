"use client";
import Link from "next/link";
import { z } from "zod";
import { useState } from "react";
import {
  Banner,
  OperationForm,
  type FieldSpec,
} from "@/components/ui/primitives";
import { useDemo } from "@/features/demo/context";
import type { OperationResult } from "@/features/workforce/model";

type FormKind = "activate" | "forgot" | "reset" | "invite";
export function AccountForm({
  kind,
  token = "",
}: {
  kind: FormKind;
  token?: string;
}) {
  const { data, mode } = useDemo();
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const titles = {
    activate: "ยืนยันอีเมลและตั้งรหัสผ่าน",
    forgot: "ขอลิงก์ตั้งรหัสผ่านใหม่",
    reset: "ตั้งรหัสผ่านใหม่",
    invite: "เชิญลูกจ้างเข้าระบบ",
  };
  const fields: FieldSpec[] =
    kind === "invite"
      ? [
          {
            name: "workerId",
            label: "ลูกจ้าง",
            type: "select",
            required: true,
            options: data.workers.map((w) => ({
              value: w.id,
              label: w.name,
            })),
          },
          {
            name: "email",
            label: "อีเมลของลูกจ้าง",
            type: "email",
            required: true,
          },
        ]
      : kind === "forgot"
        ? [{ name: "email", label: "อีเมล", type: "email", required: true }]
        : [
            {
              name: "password",
              label: "รหัสผ่านใหม่อย่างน้อย 12 ตัวอักษร",
              type: "password",
              required: true,
            },
            {
              name: "confirmation",
              label: "ยืนยันรหัสผ่านใหม่",
              type: "password",
              required: true,
            },
          ];
  async function submit(
    values: Record<string, string>,
  ): Promise<OperationResult> {
    const requestId = crypto.randomUUID();
    if (
      (kind === "activate" || kind === "reset") &&
      (values.password !== values.confirmation || values.password.length < 12)
    )
      return {
        ok: false,
        requestId,
        error: {
          code: "VALIDATION_ERROR",
          message: "รหัสผ่านต้องตรงกันและยาวอย่างน้อย 12 ตัวอักษร",
          retryable: false,
          fieldErrors: { confirmation: ["กรุณาตรวจรหัสผ่านทั้งสองช่อง"] },
        },
      };
    const path =
      kind === "forgot"
        ? "/api/auth/request-password-reset"
        : kind === "reset"
          ? "/api/auth/reset-password"
          : "/api/accounts/" + kind;
    const body =
      kind === "forgot"
        ? { email: values.email, redirectTo: "/reset-password" }
        : kind === "reset"
          ? { token, newPassword: values.password }
          : kind === "activate"
            ? { token, password: values.password }
            : values;
    setSaving(true);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "same-origin",
      });
      if (!response.ok) {
        const result = z
          .object({
            ok: z.literal(false),
            requestId: z.string(),
            error: z.object({
              code: z.string(),
              message: z.string(),
              fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
              retryable: z.boolean(),
            }),
          })
          .safeParse(await response.json());
        if (result.success) return result.data;
        return {
          ok: false,
          requestId,
          error: {
            code: "SAVE_FAILED",
            message: "ดำเนินการไม่สำเร็จ กรุณาตรวจข้อมูลหรือลิงก์ แล้วลองใหม่",
            retryable: true,
          },
        };
      }
      setDone(true);
      return { ok: true, requestId, data: { id: "account" } };
    } catch {
      return {
        ok: false,
        requestId,
        error: {
          code: "SAVE_FAILED",
          message: "ติดต่อระบบไม่ได้ กรุณาลองใหม่",
          retryable: true,
        },
      };
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="panel stack">
      <h1>{titles[kind]}</h1>
      {mode !== "backend" ? (
        <Banner>หน้านี้ใช้กับระบบ Backend กรุณาเปิด Backend mode</Banner>
      ) : done ? (
        <Banner>
          {kind === "activate" || kind === "reset"
            ? "ตั้งค่าบัญชีสำเร็จ สามารถเข้าสู่ระบบด้วยอีเมลและรหัสผ่านใหม่"
            : "ส่งคำขอแล้ว หากอีเมลนี้สามารถใช้งานได้ ระบบจะส่งลิงก์ให้ กรุณาตรวจกล่องจดหมาย"}
        </Banner>
      ) : (
        <OperationForm
          disabled={saving}
          fields={fields}
          submitLabel={
            kind === "activate" || kind === "reset" ? "ตั้งรหัสผ่าน" : "ส่งคำขอ"
          }
          onSave={submit}
        />
      )}
      <Link href="/login">เข้าสู่ระบบ</Link>
    </section>
  );
}
