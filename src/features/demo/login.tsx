"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackendLogin } from "../workforce/login";
import { useDemo } from "./context";
import { Banner, OperationForm } from "@/components/ui/primitives";
export function DemoLogin() {
  const { mode } = useDemo();
  return mode === "backend" ? <BackendLogin /> : <MockLogin />;
}
function MockLogin() {
  const { ready, actor, signIn } = useDemo();
  const router = useRouter();
  const [role, setRole] = useState<"EMPLOYER" | "WORKER">("EMPLOYER");
  useEffect(() => {
    if (ready && actor)
      router.replace(
        actor.role === "EMPLOYER" ? "/employer/workers" : "/worker",
      );
  }, [ready, actor, router]);
  async function login(values: Record<string, string>) {
    const saved =
      role === "EMPLOYER"
        ? signIn({ role: "EMPLOYER", accountId: "11", employerId: "1" })
        : signIn({
            role: "WORKER",
            accountId: String(Number(values.workerId) + 100),
            workerId: values.workerId,
          });
    if (!saved)
      return {
        ok: false as const,
        error: {
          code: "SAVE_FAILED",
          message:
            "บันทึกบัญชีสาธิตไม่ได้ กรุณาเปิด session storage แล้วลองใหม่",
          retryable: true,
        },
        requestId: "demo-login",
      };
    router.push(role === "EMPLOYER" ? "/employer/workers" : "/worker");
    return { ok: true as const, data: { id: "1" }, requestId: "demo-login" };
  }
  return (
    <main className="login">
      <section className="login-brand">
        <strong>SA / WORKFORCE</strong>
        <h2>ระบบจัดการเอกสารและติดตามการจ้างแรงงานต่างด้าว</h2>
        <p>ข้อมูลตัวอย่างสมมติสำหรับสาธิตโครงการ</p>
      </section>
      <section className="login-form">
        <h1>เข้าสู่ระบบ</h1>
        <h2>
          {role === "EMPLOYER"
            ? "บัญชีนายจ้าง / ผู้กระทำการแทน"
            : "บัญชีลูกจ้างต่างด้าว"}
        </h2>
        <Banner>
          โหมดสาธิต · ไม่มีการยืนยันบัญชีจริง
          ไม่ต้องกรอกรหัสผ่านหรือข้อมูลส่วนบุคคล
        </Banner>
        {!ready ? (
          <p role="status">กำลังเตรียมข้อมูล…</p>
        ) : (
          <OperationForm
            key={role}
            fields={
              role === "WORKER"
                ? [
                    {
                      name: "workerId",
                      label: "บัญชีลูกจ้างสมมติ",
                      type: "select",
                      value: "101",
                      options: [
                        { value: "101", label: "ARUN SAMPLE" },
                        { value: "102", label: "MAYA SAMPLE" },
                        { value: "103", label: "LIN SAMPLE" },
                      ],
                    },
                  ]
                : [
                    {
                      name: "username",
                      label: "อีเมลบัญชีสมมติ",
                      value: "employer@example.invalid",
                      readOnly: true,
                    },
                  ]
            }
            onSave={login}
            submitLabel="เข้าสู่ระบบสาธิต"
          />
        )}
        <button
          className="button secondary"
          onClick={() => setRole(role === "EMPLOYER" ? "WORKER" : "EMPLOYER")}
        >
          {role === "EMPLOYER"
            ? "สำหรับลูกจ้างต่างด้าว"
            : "สำหรับนายจ้าง / ผู้แทน"}
        </button>
        <p className="muted small">
          ข้อมูลสาธิตเก็บใน browser นี้ Reset
          ได้จากเครื่องมือสาธิตหลังเข้าสู่ระบบ
        </p>
      </section>
    </main>
  );
}
