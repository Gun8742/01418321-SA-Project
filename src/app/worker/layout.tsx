import { Suspense } from "react";
import { AppFrame } from "@/components/layout/app-frame";
export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main className="standalone" role="status">
          กำลังโหลดพื้นที่ลูกจ้าง…
        </main>
      }
    >
      <AppFrame area="WORKER">{children}</AppFrame>
    </Suspense>
  );
}
