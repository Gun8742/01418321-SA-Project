"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useDemo } from "@/features/demo/context";
import {
  employmentPath,
  stagePath,
  stageStatus,
  visibleEmployments,
  type Employment,
  type Worker,
} from "@/features/demo/model";
import {
  Badge,
  DocumentLibrary,
  Empty,
  Heading,
  NotFound,
  OperationForm,
  Panel,
  type FieldSpec,
  type FormValues,
} from "@/components/ui/primitives";
import { CorrectionPanel } from "@/features/documents/components/corrections";

const profileFields: [string, string, FieldSpec["type"]][] = [
  ["name", "ชื่อ–นามสกุลตามหนังสือเดินทาง", "text"],
  ["birthDate", "วันเกิด", "date"],
  ["nationality", "สัญชาติ", "text"],
  ["passportNo", "เลขหนังสือเดินทาง", "text"],
  ["passportCountry", "ประเทศผู้ออก", "text"],
  ["passportIssuedAt", "วันที่ออกหนังสือเดินทาง", "date"],
  ["passportExpiresAt", "วันหมดอายุหนังสือเดินทาง", "date"],
  ["email", "อีเมล", "email"],
  ["phone", "โทรศัพท์", "text"],
  ["address", "ที่อยู่ปัจจุบัน", "textarea"],
];
const employmentFields: [string, string, FieldSpec["type"]][] = [
  ["companyName", "นายจ้าง / บริษัท", "text"],
  ["registrationNo", "เลขทะเบียนนิติบุคคล", "text"],
  ["employerAddress", "ที่อยู่นายจ้าง", "text"],
  ["employerContact", "ผู้ติดต่อ", "text"],
  ["job", "ตำแหน่ง", "text"],
  ["jobDescription", "ลักษณะงาน", "text"],
  ["location", "สถานที่ทำงาน", "text"],
  ["startDate", "วันที่เริ่มตามสัญญา", "date"],
  ["endDate", "วันสิ้นสุดการจ้าง", "date"],
  ["wage", "ค่าจ้าง", "text"],
  ["wageUnit", "หน่วยค่าจ้าง", "text"],
];
function fieldValues<T extends object>(
  value: T | undefined,
): Record<string, string> {
  if (!value) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}
function selectValues(
  values: FormValues,
  keys: [string, string, FieldSpec["type"]][],
) {
  return Object.fromEntries(keys.map(([name]) => [name, values[name] ?? ""]));
}
function WorkerEditor({
  worker,
  employment,
}: {
  worker?: Worker;
  employment?: Employment;
}) {
  const { mutate, data } = useDemo();
  const [company] = useState(data.employer);
  const router = useRouter();
  const w = fieldValues(worker),
    e = { ...fieldValues(company), ...fieldValues(employment) };
  const fields: FieldSpec[] = [
    ...profileFields.map(([name, label, type]) => ({
      name,
      label,
      type,
      value: w[name],
      required: !["email", "phone", "address"].includes(name),
      errorPath: "profile." + name,
      group: "ข้อมูลลูกจ้าง / หนังสือเดินทาง",
    })),
    ...employmentFields.map(([name, label, type]) => ({
      name,
      label,
      type,
      value:
        e[name] ??
        (name === "companyName"
          ? "บริษัทตัวอย่าง จำกัด"
          : name === "wageUnit"
            ? "บาทต่อเดือน"
            : ""),
      required: true,
      errorPath: "employment." + name,
      group: "ข้อมูลนายจ้างและการจ้าง",
    })),
  ];
  async function save(values: FormValues) {
    return mutate("saveWorkerEmployment", {
      ...(company ? { expectedEmployerVersion: company.version } : {}),
      ...(worker && employment
        ? {
            workerId: worker.id,
            employmentId: employment.id,
            expectedVersions: {
              worker: worker.version,
              employment: employment.version,
            },
          }
        : {}),
      profile: selectValues(values, profileFields),
      employment: selectValues(values, employmentFields),
    });
  }
  return (
    <Panel
      title={
        employment
          ? "แก้ไขข้อมูลการจ้าง " + employment.id
          : "ข้อมูลลูกจ้างและการจ้าง"
      }
    >
      <OperationForm
        fields={fields}
        onSave={save}
        onSuccess={(id) =>
          router.push(
            worker
              ? "/employer/workers/" + worker.id + "/employments/" + id
              : "/employer/workers",
          )
        }
        submitLabel="บันทึกข้อมูลลูกจ้างและการจ้าง"
      />
    </Panel>
  );
}
function WorkerList() {
  const { data, actor } = useDemo();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [draft, setDraft] = useState("");
  if (!actor) return null;
  const employments = visibleEmployments(data, actor);
  const workers = data.workers.filter((w) =>
    employments.some((e) => e.workerId === w.id),
  );
  const results = workers.filter((w) => {
    const ids = employments.filter((e) => e.workerId === w.id).map((e) => e.id);
    const stages = data.stages.filter((s) => ids.includes(s.employmentId));
    return (
      (w.name + " " + w.passportNo)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "ALL" ||
        stages.some((s) => stageStatus(s, data.documents) === filter))
    );
  });
  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(draft);
  }
  return (
    <>
      <Heading
        title="รายการลูกจ้าง"
        description="จัดการข้อมูลการจ้างและติดตามเอกสารของลูกจ้างที่คุณมีสิทธิ์"
        status={"ลูกจ้างตัวอย่าง " + workers.length + " ราย"}
      />
      <Panel title="ค้นหาลูกจ้าง">
        <form onSubmit={search} className="stack-tight">
          <div className="form-grid">
            <div className="field">
              <label htmlFor="worker-search">ชื่อ หรือเลขหนังสือเดินทาง</label>
              <input
                id="worker-search"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={100}
                placeholder="ARUN / DEMO-P001"
              />
            </div>
            <div className="field">
              <label htmlFor="worker-status">สถานะเอกสาร</label>
              <select
                id="worker-status"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="ALL">ทุกสถานะ</option>
                <option value="PENDING">รอพิจารณา</option>
                <option value="NOT_READY">เอกสารไม่ครบ</option>
                <option value="DIGITAL_READY">พร้อมรับ</option>
                <option value="RECEIVED">รับแล้ว</option>
              </select>
            </div>
          </div>
          <div className="row">
            <button className="button">ค้นหา</button>
            <Link className="button secondary" href="/employer/workers/new">
              เพิ่มลูกจ้าง
            </Link>
          </div>
        </form>
      </Panel>
      <Panel title="ลูกจ้างในความดูแล">
        {results.map((w) => {
          const items = employments.filter((e) => e.workerId === w.id);
          const stage = data.stages.find(
            (s) =>
              s.employmentId === items[0]?.id &&
              s.type === (w.id === "103" ? "WORK_PERMIT" : "VISA"),
          );
          return (
            <div key={w.id} className="document-row">
              <div>
                <strong>
                  {w.name} · {w.passportNo}
                </strong>
                <p className="muted small">
                  สัญชาติ{w.nationality} · {items[0]?.job} · การจ้าง{" "}
                  {items.length} รายการ
                </p>
                <Link href={"/employer/workers/" + w.id}>
                  เปิดข้อมูล / เลือกการจ้าง
                </Link>
              </div>
              {stage && <Badge status={stageStatus(stage, data.documents)} />}
            </div>
          );
        })}
        {!results.length && (
          <Empty>
            ไม่พบลูกจ้างในเงื่อนไขนี้ ลองเปลี่ยนคำค้นหรือเพิ่มข้อมูลใหม่
          </Empty>
        )}
      </Panel>
    </>
  );
}
export function WorkersView({
  workerId,
  employmentId,
  mode,
}: {
  workerId?: string;
  employmentId?: string;
  mode?: "new" | "edit";
}) {
  const { data, actor } = useDemo();
  const query = useSearchParams();
  if (!actor) return null;
  if (mode === "new")
    return (
      <>
        <Heading
          title="เพิ่มข้อมูลลูกจ้างและการจ้าง"
          description="UC-04 · ใช้ข้อมูลสมมติเท่านั้น"
        />
        <WorkerEditor />
      </>
    );
  if (!workerId) return <WorkerList />;
  const employments = visibleEmployments(data, actor).filter(
    (e) => e.workerId === workerId,
  );
  const worker = data.workers.find((w) => w.id === workerId);
  if (!worker || !employments.length) return <NotFound />;
  if (!employmentId)
    return (
      <>
        <Heading
          title={worker.name}
          description="เลือกการจ้างที่ต้องการ ไม่เลือกประวัติล่าสุดโดยอัตโนมัติ"
        />
        <Panel title="รายการการจ้าง">
          {employments.map((e) => (
            <div className="document-row" key={e.id}>
              <div>
                <strong>{e.job}</strong>
                <p className="muted">
                  {e.startDate} ถึง {e.endDate} · การจ้าง {e.id}
                </p>
              </div>
              <Link href={employmentPath(e)} className="button secondary">
                เลือกการจ้าง {e.id}
              </Link>
            </div>
          ))}
        </Panel>
      </>
    );
  const employment = employments.find((e) => e.id === employmentId);
  if (!employment) return <NotFound />;
  if (mode === "edit")
    return (
      <>
        <Heading
          title="แก้ไขข้อมูลลูกจ้างและการจ้าง"
          description={worker.name + " · การจ้าง " + employment.id}
        />
        <Link href={employmentPath(employment)}>กลับรายละเอียดการจ้างนี้</Link>
        <WorkerEditor
          key={worker.version + "-" + employment.version}
          worker={worker}
          employment={employment}
        />
        <DocumentLibrary employmentId={employment.id} />
      </>
    );
  const corrections = query.get("tab") === "corrections";
  const openCount = data.corrections.filter(
    (c) => c.employmentId === employment.id && c.status === "OPEN",
  ).length;
  return (
    <>
      <Heading
        title={worker.name}
        description={
          employment.job +
          " · การจ้าง " +
          employment.id +
          " · " +
          worker.passportNo
        }
      />
      <div className="row">
        <Link
          className="button secondary"
          href={"/employer/workers/" + worker.id}
        >
          เลือกการจ้างอื่น
        </Link>
        <Link className="button" href={employmentPath(employment) + "/edit"}>
          แก้ไขข้อมูล
        </Link>
      </div>
      <nav className="tabs" aria-label="รายละเอียดการจ้าง">
        <Link
          href={employmentPath(employment)}
          aria-current={!corrections ? "page" : undefined}
        >
          ข้อมูลและคำขอ
        </Link>
        <Link
          href={employmentPath(employment) + "?tab=corrections"}
          aria-current={corrections ? "page" : undefined}
        >
          คำแจ้งข้อมูลไม่ตรง {openCount > 0 ? "(" + openCount + ")" : ""}
        </Link>
      </nav>
      {corrections ? (
        <CorrectionPanel employmentId={employment.id} />
      ) : (
        <>
          <Panel title="รายละเอียดการจ้าง">
            <dl className="metadata">
              <dt>นายจ้าง</dt>
              <dd>{employment.companyName}</dd>
              <dt>สถานที่ทำงาน</dt>
              <dd>{employment.location}</dd>
              <dt>ระยะเวลาจ้าง</dt>
              <dd>
                {employment.startDate} ถึง {employment.endDate}
              </dd>
              <dt>ค่าจ้าง</dt>
              <dd>
                {employment.wage} {employment.wageUnit}
              </dd>
              <dt>สัญชาติ / วันเกิด</dt>
              <dd>
                {worker.nationality} / {worker.birthDate}
              </dd>
            </dl>
          </Panel>
          <Panel title="ชุดเอกสารและคำขอของการจ้างนี้">
            {data.stages
              .filter((s) => s.employmentId === employment.id)
              .map((s) => (
                <div className="document-row" key={s.id}>
                  <div>
                    <strong>
                      {s.type === "PRE_ARRIVAL" ? "คำขอก่อนเดินทาง" : s.type}
                    </strong>
                    <p className="muted small">
                      ชุด {s.id} · คำร้อง {s.application.id}
                    </p>
                    <Link href={stagePath(s)}>เปิดชุดเอกสาร</Link>
                  </div>
                  <Badge status={stageStatus(s, data.documents)} />
                </div>
              ))}
          </Panel>
          <DocumentLibrary employmentId={employment.id} />
        </>
      )}
    </>
  );
}
