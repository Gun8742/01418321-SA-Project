"use client";
import { useLayoutEffect, type ReactNode } from "react";
import { DemoProvider } from "./context";
import { installHistoryGuard } from "../../lib/history-guard";
export function DemoGate({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  // Register before Next Router can unmount a dirty form on popstate.
  useLayoutEffect(() => {
    if (enabled) installHistoryGuard();
  }, [enabled]);
  if (!enabled)
    return (
      <main className="standalone stack">
        <h1>โหมดสาธิตปิดอยู่</h1>
        <p>
          แอปนี้เป็น Mock Frontend เท่านั้น หากต้องการทดลองในเครื่อง ให้กำหนด
          NEXT_PUBLIC_ENABLE_MOCK=true แล้วเริ่มแอปใหม่
        </p>
        <p>ไม่มี Authentication หรือ Backend สำหรับข้อมูลจริง</p>
      </main>
    );
  return <DemoProvider>{children}</DemoProvider>;
}
