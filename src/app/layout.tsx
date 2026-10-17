import type { Metadata } from "next";
import "@fontsource-variable/noto-sans-thai";
import "./globals.css";
export const metadata: Metadata = { title: "SA / WORKFORCE", description: "ระบบจัดการเอกสารแรงงานต่างด้าว · ข้อมูลสมมติสำหรับสาธิต" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
