"use client";
import type { ReactNode } from "react";
import { DemoProvider } from "./context";
export function DemoGate({enabled,children}:{enabled:boolean;children:ReactNode}) {
  if(!enabled)return <main className="standalone stack"><h1>โหมดสาธิตปิดอยู่</h1><p>แอปนี้เป็น Mock Frontend เท่านั้น หากต้องการทดลองในเครื่อง ให้กำหนด NEXT_PUBLIC_ENABLE_MOCK=true แล้วเริ่มแอปใหม่</p><p>ไม่มี Authentication หรือ Backend สำหรับข้อมูลจริง</p></main>;
  return <DemoProvider>{children}</DemoProvider>;
}
