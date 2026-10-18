import type { Metadata } from "next";
import "@fontsource-variable/noto-sans-thai";
import "./globals.css";
import { DemoGate } from "@/features/demo/gate";
export const metadata: Metadata = {
  title: "SA / WORKFORCE",
  description: "ระบบจัดการเอกสารแรงงานต่างด้าว · ข้อมูลสมมติสำหรับสาธิต",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>
        <DemoGate enabled={process.env.NEXT_PUBLIC_ENABLE_MOCK === "true"}>
          {children}
        </DemoGate>
      </body>
    </html>
  );
}
