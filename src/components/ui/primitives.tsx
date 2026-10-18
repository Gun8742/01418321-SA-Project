"use client";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useDemo } from "@/features/demo/context";
import {
  statusLabels,
  type DemoDocument,
  type OperationResult,
} from "@/features/demo/model";
import { validateDemoFile } from "@/features/demo/files";

export function Heading({
  title,
  description,
  status,
  statusLabel,
}: {
  title: string;
  description?: string;
  status?: string;
  statusLabel?: string;
}) {
  return (
    <header className="heading">
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {status && <Badge status={status} label={statusLabel} />}
    </header>
  );
}
export function Panel({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="panel stack-tight">
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}
export function Badge({ status, label }: { status: string; label?: string }) {
  const tone = ["REJECTED", "DENIED", "NOT_READY"].includes(status)
    ? "error"
    : [
          "PENDING",
          "AWAITING_SUBMISSION_CONFIRMATION",
          "ADDITIONAL_DOCUMENTS",
          "ADDITIONAL_TESTS",
          "OPEN",
          "AWAITING_REVIEW",
        ].includes(status)
      ? "warning"
      : [
            "NOT_DECIDED",
            "NOT_SUBMITTED",
            "PLANNED",
            "DRAFT",
            "PENDING_VERIFICATION",
          ].includes(status)
        ? "info"
        : "";
  return (
    <span className={"badge " + tone}>
      {label ?? statusLabels[status] ?? status}
    </span>
  );
}
export function Banner({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "warning" | "error";
}) {
  return <div className={"banner " + tone}>{children}</div>;
}
export function Empty({ children }: { children: ReactNode }) {
  return <p className="muted">{children}</p>;
}
export function NotFound() {
  return (
    <Panel title="ไม่พบข้อมูลที่เข้าถึงได้">
      <p>รายการไม่มีอยู่หรืออยู่นอกขอบเขตบัญชีนี้ กรุณาเลือกจากเมนูใหม่</p>
    </Panel>
  );
}
export function ReadFailure() {
  const { setReadError, mode } = useDemo();
  return (
    <Panel title="โหลดข้อมูลไม่สำเร็จ">
      <Banner tone="error">
        {mode === "mock"
          ? "กำลังจำลองข้อผิดพลาด ข้อมูลเดิมยังไม่เปลี่ยน"
          : "อ่านข้อมูลจาก Server ไม่สำเร็จ กรุณาลองใหม่"}
      </Banner>
      <button className="button" onClick={() => setReadError(false)}>
        ลองโหลดอีกครั้ง
      </button>
    </Panel>
  );
}
export type FieldSpec = {
  name: string;
  label: string;
  value?: string;
  type?: "text" | "email" | "date" | "textarea" | "select" | "password";
  options?: { value: string; label: string }[];
  required?: boolean;
  errorPath?: string;
  group?: string;
  hint?: string;
  fullWidth?: boolean;
  readOnly?: boolean;
};
export type FormValues = Record<string, string>;
export function OperationForm({
  fields,
  submitLabel = "บันทึกข้อมูล",
  onSave,
  onSuccess,
  modes,
  disabled = false,
  children,
}: {
  fields: FieldSpec[];
  submitLabel?: string;
  onSave: (values: FormValues, mode: string) => Promise<OperationResult>;
  onSuccess?: (id: string) => void;
  modes?: { value: string; label: string }[];
  disabled?: boolean;
  children?: ReactNode;
}) {
  const { pending, mode } = useDemo();
  const formId = useId();
  const groups = Array.from(new Set(fields.map((field) => field.group ?? "")));
  const [feedback, setFeedback] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const summary = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const dirty = useRef(false);
  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (dirty.current) {
        event.preventDefault();
      }
    }
    function guardNavigation(event: MouseEvent) {
      const link =
        event.target instanceof Element ? event.target.closest("a") : null;
      if (
        dirty.current &&
        link &&
        link.href !== window.location.href &&
        !window.confirm(
          "มีข้อมูลที่ยังไม่บันทึก ต้องการทิ้งข้อมูลและเปลี่ยนหน้าหรือไม่?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", guardNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", guardNavigation, true);
    };
  }, []);
  useEffect(() => {
    if (feedback) summary.current?.focus();
  }, [feedback]);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || disabled) return;
    const form = event.currentTarget;
    const values: FormValues = {};
    for (const [key, value] of new FormData(form))
      if (typeof value === "string") values[key] = value;
    const submitter =
      event.nativeEvent instanceof SubmitEvent
        ? event.nativeEvent.submitter
        : null;
    const mode =
      submitter instanceof HTMLButtonElement ? submitter.value : "SAVE";
    const nextErrors: Record<string, string[]> = {};
    for (const field of fields)
      if (mode !== "DRAFT" && field.required && !values[field.name]?.trim())
        nextErrors[field.name] = ["กรุณาระบุ" + field.label.replace(" *", "")];
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setFeedback({ message: "กรุณาตรวจช่องที่จำเป็นก่อนบันทึก", error: true });
      return;
    }
    const result = await onSave(values, mode);
    if (!result.ok) {
      setErrors(result.error.fieldErrors ?? {});
      setFeedback({ message: result.error.message, error: true });
      return;
    }
    dirty.current = false;
    setErrors({});
    setFeedback({
      message:
        mode === "mock" ? "บันทึกข้อมูลสมมติแล้ว" : "บันทึกบน Server แล้ว",
      error: false,
    });
    onSuccess?.(result.data.id);
  }
  return (
    <form
      ref={formRef}
      className="stack-tight"
      onSubmit={handleSubmit}
      noValidate
      onChange={() => {
        dirty.current = true;
      }}
    >
      {feedback && (
        <div
          ref={summary}
          role={feedback.error ? "alert" : "status"}
          tabIndex={-1}
          className={"banner " + (feedback.error ? "error" : "")}
        >
          {feedback.message}
        </div>
      )}
      <div className="stack">
        {groups.map((group) => (
          <fieldset
            key={group}
            className="form-section"
            aria-label={group || "ข้อมูลแบบฟอร์ม"}
          >
            {group && <legend>{group}</legend>}
            <div className="form-grid">
              {fields
                .filter((field) => (field.group ?? "") === group)
                .map((field) => {
                  const fieldErrors =
                    errors[field.name] ?? errors[field.errorPath ?? field.name];
                  const fieldId = formId + "-" + field.name;
                  const common = {
                    id: fieldId,
                    name: field.name,
                    defaultValue: field.value ?? "",
                    required: field.required,
                    readOnly: field.readOnly,
                    "aria-label": field.label,
                    "aria-invalid": !!fieldErrors,
                    "aria-describedby": fieldErrors
                      ? fieldId + "-error"
                      : field.hint
                        ? fieldId + "-hint"
                        : undefined,
                    disabled: disabled || pending,
                  };
                  return (
                    <div
                      className={
                        "field " + (field.fullWidth ? "full-width" : "")
                      }
                      key={field.name}
                    >
                      <label htmlFor={fieldId}>
                        {field.label}
                        {field.required && <span aria-hidden="true"> *</span>}
                      </label>
                      {field.type === "select" ? (
                        <select {...common}>
                          {field.options?.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "textarea" ? (
                        <textarea {...common} />
                      ) : (
                        <input {...common} type={field.type ?? "text"} />
                      )}
                      {field.hint && (
                        <small id={fieldId + "-hint"} className="muted">
                          {field.hint}
                        </small>
                      )}
                      {fieldErrors && (
                        <span className="field-error" id={fieldId + "-error"}>
                          {fieldErrors.join(" · ")}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </fieldset>
        ))}
      </div>
      {children}
      <div className="row">
        <button
          className="button"
          type="submit"
          value="SAVE"
          disabled={pending || disabled}
        >
          {pending ? "กำลังบันทึก…" : submitLabel}
        </button>
        {modes?.map((m) => (
          <button
            className="button secondary"
            type="submit"
            key={m.value}
            value={m.value}
            disabled={pending || disabled}
          >
            {m.label}
          </button>
        ))}
      </div>
    </form>
  );
}
export function DocumentPreview({ doc }: { doc: DemoDocument }) {
  const { mode } = useDemo();
  const [downloadError, setDownloadError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const [downloaded, setDownloaded] = useState(false);
  async function downloadSample() {
    if (mode === "backend") {
      setDownloadError("");
      try {
        const response = await fetch("/api/documents/" + doc.id + "/download", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) throw new Error("Download failed");
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement("a");
        link.href = url;
        link.download = doc.fileName;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setDownloaded(true);
      } catch {
        setDownloadError("ดาวน์โหลดไม่สำเร็จ กรุณาตรวจสิทธิ์และลองใหม่");
      }
      return;
    }
    const blob = new Blob(
      [
        "SYNTHETIC DEMO ONLY\nSA / WORKFORCE\n" +
          doc.title +
          "\n" +
          doc.documentNo +
          "\nNot an official document. Downloading does not confirm receipt.",
      ],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SA-DEMO-" + doc.id + ".txt";
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
  }
  return (
    <>
      <button
        className="button secondary"
        type="button"
        aria-label={"ดูเอกสาร " + doc.title + " " + (doc.documentNo || doc.id)}
        onClick={() => dialog.current?.showModal()}
      >
        ดูเอกสาร
      </button>
      <dialog ref={dialog} aria-labelledby={"preview-" + doc.id}>
        <div className="stack">
          <h2 id={"preview-" + doc.id}>{doc.title}</h2>
          <Banner>
            {mode === "mock"
              ? "Preview จำลอง · ไม่ใช่เอกสารราชการ ระบบเก็บเฉพาะ metadata ไม่เก็บไฟล์ที่เลือก"
              : "ข้อมูลไฟล์ที่จัดเก็บบน Server · การดาวน์โหลดไม่ยืนยันการรับเอกสาร"}
          </Banner>
          <dl className="metadata">
            <dt>เลขที่เอกสาร</dt>
            <dd>{doc.documentNo || "ไม่มีเลขที่"}</dd>
            <dt>ผู้ออก</dt>
            <dd>{doc.issuer || "ข้อมูลสมมติ"}</dd>
            <dt>ชื่อไฟล์ที่อ้างอิง</dt>
            <dd>{doc.fileName}</dd>
          </dl>
          {downloadError && <p role="alert">{downloadError}</p>}
          {downloaded && (
            <p role="status">
              {mode === "mock"
                ? "ดาวน์โหลดไฟล์ข้อความสาธิตแล้ว ยังไม่ถือว่ายืนยันการรับ"
                : "ส่งไฟล์ให้ browser แล้ว ยังไม่ถือว่ายืนยันการรับ"}
            </p>
          )}
          <div className="row">
            <button className="button" onClick={downloadSample}>
              {mode === "mock" ? "ดาวน์โหลดตัวอย่างจำลอง" : "ดาวน์โหลดไฟล์"}
            </button>
            <button
              className="button secondary"
              onClick={() => dialog.current?.close()}
            >
              ปิด
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
export function DocumentLibrary({ employmentId }: { employmentId: string }) {
  const { data, actor, mutate, pending, mode, uploadFile } = useDemo();
  const [ownerKind, setOwnerKind] = useState<"WORKER" | "EMPLOYER">("WORKER");
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const docs = data.documents.filter((d) => d.employmentId === employmentId);
  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    setChecking(true);
    try {
      const error = await validateDemoFile(file);
      if (error) {
        setMessage(error);
        return;
      }
      const result =
        mode === "backend" && uploadFile
          ? await uploadFile(file, employmentId, ownerKind)
          : await mutate("addSupportingDocument", {
              employmentId,
              title: file.name,
              fileName: file.name,
            });
      setMessage(
        result.ok
          ? mode === "mock"
            ? "เพิ่มข้อมูลไฟล์ตัวอย่างแล้ว (ไม่อัปโหลดเนื้อหาไฟล์)"
            : "จัดเก็บไฟล์แล้ว"
          : result.error.message,
      );
    } catch {
      setMessage("อ่านไฟล์ไม่ได้ กรุณาเลือกไฟล์ใหม่");
    } finally {
      setChecking(false);
    }
  }
  async function addSample() {
    const result = await mutate("addSupportingDocument", {
      employmentId,
      title: "หลักฐานตัวอย่างสมมติ",
      fileName: "DEMO-evidence.pdf",
    });
    setMessage(
      result.ok ? "เพิ่มหลักฐานตัวอย่างสมมติแล้ว" : result.error.message,
    );
  }
  return (
    <Panel title="เอกสารในบริบทการจ้างนี้">
      <p className="muted small">
        {mode === "mock"
          ? "โหมดสาธิต: เลือก PDF / JPEG / PNG ไม่เกิน 5 MiB เก็บเฉพาะชื่อและ metadata ใน browser"
          : "เลือก PDF / JPEG / PNG ไม่เกิน 5 MiB · จัดเก็บไฟล์แบบ Private และตรวจสิทธิ์ก่อนดาวน์โหลด"}
      </p>
      {mode === "backend" && actor?.role === "EMPLOYER" && (
        <label>
          เจ้าของเอกสาร{" "}
          <select
            value={ownerKind}
            onChange={(event) =>
              setOwnerKind(
                event.target.value === "EMPLOYER" ? "EMPLOYER" : "WORKER",
              )
            }
          >
            <option value="WORKER">ลูกจ้างในการจ้างนี้</option>
            <option value="EMPLOYER">
              บริษัท (ไม่แชร์คลังเอกสารให้ลูกจ้าง)
            </option>
          </select>
        </label>
      )}
      <div className="field">
        <label htmlFor={"upload-" + employmentId}>เพิ่มเอกสารประกอบ</label>
        <input
          id={"upload-" + employmentId}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFile}
          disabled={pending || checking}
        />
      </div>
      {mode === "mock" && (
        <button
          className="button secondary"
          onClick={addSample}
          disabled={pending || checking}
        >
          เพิ่มหลักฐานสมมติสำหรับทดลอง
        </button>
      )}
      {message && <p role="status">{message}</p>}
      {checking && <p role="status">กำลังตรวจไฟล์…</p>}
      {docs.map((d) => (
        <div className="document-row" key={d.id}>
          <div>
            <strong>{d.title}</strong>
            <p className="muted small">
              {d.fileName} · เอกสาร {d.id}
              {d.documentNo ? " · " + d.documentNo : ""}
            </p>
            <p className="muted small">
              การจ้าง {d.employmentId} · ชุด{" "}
              {data.stages
                .filter(
                  (stage) =>
                    stage.items.some((item) => item.documentId === d.id) ||
                    stage.application.issuedDocumentId === d.id,
                )
                .map((stage) => stage.id)
                .join(", ") || "เอกสารประกอบที่ยังไม่ผูกชุด"}
            </p>
          </div>
          <DocumentPreview doc={d} />
        </div>
      ))}
      {!docs.length && (
        <Empty>
          ยังไม่มีเอกสาร เพิ่มไฟล์หรือใช้หลักฐานสมมติเพื่อทดลอง flow
        </Empty>
      )}
    </Panel>
  );
}
export function documentOptions(docs: DemoDocument[], empty = "ยังไม่เลือก") {
  return [
    { value: "", label: empty },
    ...docs.map((d) => ({ value: d.id, label: d.title + " · " + d.id })),
  ];
}
