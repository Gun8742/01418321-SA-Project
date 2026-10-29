"use client";
import type { ReactNode } from "react";
import { BackendProvider } from "../workforce/provider";
import { DemoProvider } from "./context";
export function DemoGate({
  enabled,
  children,
  backendEnabled = false,
}: {
  enabled: boolean;
  backendEnabled?: boolean;
  children: ReactNode;
}) {
  if (backendEnabled && enabled)
    throw new Error("Choose Backend or Mock mode, not both");
  if (backendEnabled) return <BackendProvider>{children}</BackendProvider>;
  if (!enabled)
    return (
      <main className="standalone stack">
        <h1>ยังไม่ได้เปิดใช้งานระบบ</h1>
        <p>
          ตั้งค่า BACKEND_ENABLED=true และเชื่อมต่อฐานข้อมูลตาม README
          แล้วเริ่มแอปใหม่
        </p>
        <p>ยังไม่ได้เปิดโหมด Backend กรุณาตรวจการตั้งค่าตาม README</p>
      </main>
    );
  return <DemoProvider>{children}</DemoProvider>;
}
