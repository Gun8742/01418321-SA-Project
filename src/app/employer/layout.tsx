import { Suspense } from "react";
import { AppFrame } from "@/components/layout/app-frame";
export default function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main className="standalone" role="status">
          กำลังโหลดพื้นที่นายจ้าง…
        </main>
      }
    >
      <AppFrame area="EMPLOYER">{children}</AppFrame>
    </Suspense>
  );
}
