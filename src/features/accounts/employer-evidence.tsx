"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDemo } from "@/features/demo/context";
import { Panel, NotFound } from "@/components/ui/primitives";
import { TravelView } from "@/features/travel/components/travel-view";
import { MedicalView } from "@/features/medical/components/medical-view";
export function EmployerEvidence() {
  const { data, actor } = useDemo();
  const query = useSearchParams();
  if (actor?.role !== "EMPLOYER") return <NotFound />;
  const id = query.get("employmentId");
  const employment = data.employments.find((e) => e.id === id);
  if (id && !employment) return <NotFound />;
  if (!employment)
    return (
      <Panel title="เลือกการจ้างเพื่อบันทึกหลักฐาน">
        {data.employments.map((e) => (
          <p key={e.id}>
            <Link href={"/employer/evidence?employmentId=" + e.id}>
              {data.workers.find((w) => w.id === e.workerId)?.name} · {e.job}
            </Link>
          </p>
        ))}
      </Panel>
    );
  return (
    <>
      <Link href="/employer/evidence">เลือกการจ้างอื่น</Link>
      <nav className="row" aria-label="ข้อมูลหลักฐาน">
        <Link href={"/employer/evidence?employmentId=" + employment.id}>
          การเดินทาง
        </Link>
        <Link
          href={
            "/employer/evidence?employmentId=" +
            employment.id +
            "&section=medical"
          }
        >
          การตรวจสุขภาพ
        </Link>
      </nav>
      {query.get("section") === "medical" ? (
        <MedicalView
          employment={employment}
          entryId={query.get("entryId") ?? undefined}
        />
      ) : (
        <TravelView
          employment={employment}
          entryId={query.get("entryId") ?? undefined}
          visaDocumentId={query.get("visaDocumentId") ?? undefined}
        />
      )}
    </>
  );
}
