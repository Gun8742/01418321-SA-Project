"use client";
import Link from "next/link";
import { useDemo } from "@/features/demo/context";
import {
  Badge,
  Banner,
  DocumentLibrary,
  DocumentPreview,
  Heading,
  NotFound,
  OperationForm,
  Panel,
  documentOptions,
} from "@/components/ui/primitives";
import type { Employment } from "@/features/demo/model";
import { medicalStatusLabel } from "../status";
export function MedicalView({
  employment,
  entryId,
}: {
  employment: Employment;
  entryId?: string;
}) {
  const { data, actor, mode, mutate, hasCapability } = useDemo();
  const employer = actor?.role === "EMPLOYER";
  const grants = hasCapability("medical:record-evidence", employment.id);
  const entries = data.entries.filter(
    (e) => e.employmentId === employment.id && e.entryResult === "ALLOWED",
  );
  const entry = entryId
    ? entries.find((e) => e.id === entryId)
    : entries.length === 1
      ? entries[0]
      : undefined;
  if (entryId && !entry) return <NotFound />;
  if (entries.length > 1 && !entryId)
    return (
      <Panel title="เลือกผลเข้าประเทศที่ต้องการใช้">
        {entries.map((e) => (
          <Link
            key={e.id}
            href={
              (employer ? "/employer/evidence" : "/worker/medical") +
              "?employmentId=" +
              employment.id +
              "&entryId=" +
              e.id +
              (employer ? "&section=medical" : "")
            }
          >
            Entry {e.id} · {e.actualArrivalAt}
          </Link>
        ))}
      </Panel>
    );
  if (!entry)
    return (
      <>
        <Heading title="การตรวจสุขภาพ" description="UC-09" />
        <Banner tone="warning">
          ต้องมีผลอนุญาตเข้าประเทศพร้อมหลักฐานก่อน
          เอกสารแผนเดินทางอย่างเดียวไม่ผ่านเงื่อนไข
        </Banner>
        <Link
          href={
            (employer ? "/employer/evidence" : "/worker/travel") +
            "?employmentId=" +
            employment.id
          }
        >
          กลับการเดินทาง
        </Link>
      </>
    );
  const health = data.healthChecks.find((h) => h.entryId === entry.id);
  const docs = data.documents.filter((d) => d.employmentId === employment.id);
  const certificate = docs.find((d) => d.id === health?.certificateDocumentId);
  const locked =
    !!health &&
    (health.resultStatus !== "PENDING" ||
      !!health.certificateDocumentId ||
      health.evidenceDocumentIds.length > 0);
  return (
    <>
      <Heading
        title="การตรวจสุขภาพ"
        description={
          "UC-09 · การจ้าง " + employment.id + " · Entry " + entry.id
        }
        status={certificate ? "READY" : (health?.resultStatus ?? "PENDING")}
        statusLabel={medicalStatusLabel(entry, health)}
      />
      <Banner>
        โรงพยาบาลตรวจและออกใบรับรอง ระบบบันทึกตามหลักฐาน ไม่วินิจฉัยหรืออนุมัติ
        Work Permit แทนหน่วยงาน
      </Banner>
      <Panel title="ข้อมูลเข้ารับการตรวจ">
        {locked || (mode === "backend" && !grants) ? (
          <Banner>
            {locked
              ? "มีผลหรือหลักฐานแล้ว ไม่เปิดให้เปลี่ยนข้อมูลการตรวจย้อนหลัง"
              : "รอนายจ้างบันทึกข้อมูลเข้ารับการตรวจจากโรงพยาบาล"}
          </Banner>
        ) : (
          <OperationForm
            key={health?.version ?? "new"}
            fields={[
              {
                name: "hospitalName",
                label: "โรงพยาบาล",
                required: true,
                value: health?.hospitalName,
              },
              {
                name: "examDate",
                label: "วันที่ตรวจ / เข้ารับบริการ",
                type: "date",
                required: true,
                value: health?.examDate,
              },
            ]}
            submitLabel="บันทึกและรอผล"
            onSave={(v) =>
              mutate("saveHealthVisit", {
                entryId: entry.id,
                ...(health
                  ? {
                      healthCheckId: health.id,
                      expectedVersion: health.version,
                    }
                  : {}),
                hospitalName: v.hospitalName,
                examDate: v.examDate,
              })
            }
          />
        )}
        {health && (
          <p>
            {health.hospitalName} · {health.examDate}
          </p>
        )}
      </Panel>
      {health && (
        <Panel title="ผลตรวจตามเอกสารโรงพยาบาล">
          <Badge
            status={health.resultStatus}
            label={medicalStatusLabel(entry, health)}
          />
          {health.pendingItems && (
            <Banner tone="warning">รายการคงค้าง: {health.pendingItems}</Banner>
          )}
          {!grants && !certificate && (
            <Banner tone="warning">
              {mode === "mock"
                ? "เปิดจำลอง capability ในเครื่องมือสาธิตเพื่อทดลองบันทึกผล"
                : "รอนายจ้างบันทึกผลตามเอกสารจากโรงพยาบาล"}
            </Banner>
          )}
          {grants && !certificate && (
            <OperationForm
              key={"health-" + health.version}
              fields={[
                {
                  name: "result",
                  label: "ผลตามเอกสารจริง",
                  type: "select",
                  value: health.resultStatus,
                  options: [
                    { value: "PENDING", label: "รอผล" },
                    { value: "ADDITIONAL_TESTS", label: "ต้องตรวจเพิ่มเติม" },
                    { value: "COMPLETE", label: "ผลครบ" },
                  ],
                },
                {
                  name: "pendingItems",
                  label: "รายการรอผล / คำแนะนำตรวจเพิ่มเติม",
                  type: "textarea",
                  value: health.pendingItems,
                  hint: "เมื่อผลครบ ต้องไม่มีรายการคงค้างก่อนยืนยันใบรับรอง",
                },
                {
                  name: "evidence",
                  label: "หลักฐานผลตรวจ",
                  type: "select",
                  options: documentOptions(docs),
                  required: true,
                },
              ]}
              submitLabel={
                mode === "mock" ? "บันทึกผลตรวจ (จำลอง)" : "บันทึกผลตรวจ"
              }
              onSave={(v) =>
                mutate("recordHealthResult", {
                  healthCheckId: health.id,
                  expectedVersion: health.version,
                  result: v.result,
                  pendingItems: v.pendingItems,
                  evidenceDocumentIds: v.evidence ? [v.evidence] : [],
                })
              }
            />
          )}
        </Panel>
      )}
      {health?.resultStatus === "COMPLETE" && (
        <Panel title="ใบรับรองแพทย์">
          {certificate ? (
            <>
              <Banner>
                {mode === "mock"
                  ? "ยืนยันใบรับรองสมมติแล้ว"
                  : "ยืนยันใบรับรองตามหลักฐานแล้ว"}{" "}
                นายจ้างใช้ในชุด Work Permit หลังเข้าประเทศได้
              </Banner>
              <DocumentPreview doc={certificate} />
            </>
          ) : grants ? (
            <OperationForm
              fields={[
                {
                  name: "doctorName",
                  label: "ชื่อแพทย์ตามเอกสาร",
                  required: true,
                },
                {
                  name: "issuedAt",
                  label: "วันที่ออกใบรับรอง",
                  type: "date",
                  required: true,
                },
                { name: "certificateNo", label: "เลขที่ใบรับรอง (เมื่อมี)" },
                {
                  name: "file",
                  label:
                    mode === "mock"
                      ? "ไฟล์ใบรับรอง (ตัวอย่าง)"
                      : "ไฟล์ใบรับรอง",
                  type: "select",
                  options: documentOptions(docs),
                  required: true,
                },
              ]}
              submitLabel={
                mode === "mock"
                  ? "ยืนยันใบรับรองตามหลักฐาน (จำลอง)"
                  : "ยืนยันใบรับรองตามหลักฐาน"
              }
              onSave={(v) =>
                mutate("confirmMedicalCertificate", {
                  healthCheckId: health.id,
                  expectedVersion: health.version,
                  doctorName: v.doctorName,
                  issuedAt: v.issuedAt,
                  certificateNo: v.certificateNo,
                  sourceDocumentId: v.file,
                  fileName: docs.find((d) => d.id === v.file)?.fileName ?? "",
                })
              }
            />
          ) : (
            <Banner tone="warning">
              ยังไม่มีใบรับรองที่ยืนยัน ต้องมีผู้มีสิทธิ์ตรวจหลักฐานก่อน
            </Banner>
          )}
        </Panel>
      )}
      <DocumentLibrary employmentId={employment.id} />
    </>
  );
}
