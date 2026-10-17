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
        <h1>โหมดสาธิตปิดอยู่</h1>
        <p>
          แอปนี้เป็น Mock Frontend เท่านั้น หากต้องการทดลองในเครื่อง ให้กำหนด
          NEXT_PUBLIC_ENABLE_MOCK=true แล้วเริ่มแอปใหม่
        </p>
        <p>ยังไม่ได้เปิดโหมด Backend กรุณาตรวจการตั้งค่าตาม README</p>
      </main>
    );
  return <DemoProvider>{children}</DemoProvider>;
}
