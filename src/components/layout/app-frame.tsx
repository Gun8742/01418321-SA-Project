"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useDemo } from "@/features/demo/context";
import { Banner } from "@/components/ui/primitives";
import type { DemoScenario } from "@/features/demo/fixtures";

const employerNav = [
  {
    href: "/employer/workers",
    label: "รายการลูกจ้าง",
    light: "b011e.svg",
    dark: "179bd.svg",
  },
  {
    href: "/employer/pre-arrival",
    label: "คำขอก่อนเดินทาง",
    light: "ca276.svg",
    dark: "91059.svg",
  },
  {
    href: "/employer/visa",
    label: "จัดชุดเอกสาร Visa",
    light: "c0279.svg",
    dark: "3d260.svg",
  },
  {
    href: "/employer/visa/applications",
    label: "การยื่นและผล Visa",
    light: "c1f07.svg",
    dark: "45a8f.svg",
  },
  {
    href: "/employer/work-permits",
    label: "เตรียม Work Permit",
    light: "c0279.svg",
    dark: "3d260.svg",
  },
  {
    href: "/employer/work-permits/applications",
    label: "คำขอ Work Permit",
    light: "c1f07.svg",
    dark: "45a8f.svg",
  },
];
const workerNav = [
  {
    href: "/worker",
    label: "ภาพรวมของฉัน",
    light: "ba307.svg",
    dark: "e85f1.svg",
  },
  {
    href: "/worker/visa",
    label: "Visa ของฉัน",
    light: "ca276.svg",
    dark: "91059.svg",
  },
  {
    href: "/worker/travel",
    label: "การเดินทาง",
    light: "c84a8.svg",
    dark: "92b02.svg",
  },
  {
    href: "/worker/medical",
    label: "การตรวจสุขภาพ",
    light: "b7def.svg",
    dark: "ff72b.svg",
  },
  {
    href: "/worker/work-permit",
    label: "Work Permit ของฉัน",
    light: "e23ec.svg",
    dark: "67341.svg",
  },
];
function DemoTools() {
  const {
    reset,
    failNext,
    setFailNext,
    grants,
    setGrants,
    readError,
    setReadError,
    pending,
  } = useDemo();
  function resetScenario(event: React.ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    if (
      value !== "initial" &&
      value !== "visa-ready" &&
      value !== "medical" &&
      value !== "permit-ready"
    )
      return;
    const scenario: DemoScenario = value;
    if (
      window.confirm("เริ่มชุดข้อมูลสมมติใหม่? การแก้ไขใน browser นี้จะถูกล้าง")
    )
      reset(scenario);
    event.target.value = "";
  }
  return (
    <details className="demo-tools panel">
      <summary>เครื่องมือสาธิต · ข้อมูลสมมติเท่านั้น</summary>
      <div className="stack-tight">
        <p>
          ไม่ใช่ระบบ Login หรือสิทธิ์จริง การยื่น อนุมัติ เข้าเมือง
          และตรวจสุขภาพเกิดภายนอกระบบ
        </p>
        <div className="field">
          <label htmlFor="demo-scenario">
            เริ่มสถานการณ์ใหม่ (ล้างการแก้ไข)
          </label>
          <select
            id="demo-scenario"
            defaultValue=""
            onChange={resetScenario}
            disabled={pending}
          >
            <option value="" disabled>
              เลือกสถานการณ์
            </option>
            <option value="initial">เริ่มต้น · Visa รอพิจารณา</option>
            <option value="visa-ready">Visa พร้อมรับ</option>
            <option value="medical">อนุญาตเข้าเมือง · เริ่มตรวจสุขภาพ</option>
            <option value="permit-ready">Work Permit พร้อมรับ</option>
          </select>
        </div>
        <label className="row">
          <input
            type="checkbox"
            checked={failNext}
            onChange={(e) => setFailNext(e.target.checked)}
          />
          จำลองบันทึกล้มเหลวครั้งถัดไป
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={readError}
            onChange={(e) => setReadError(e.target.checked)}
          />
          จำลองโหลดข้อมูลล้มเหลว
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={grants}
            onChange={(e) => setGrants(e.target.checked)}
          />
          จำลอง capability บันทึกหลักฐานเข้าเมือง/ผลแพทย์ (O-02
          ยังไม่อนุมัติจริง)
        </label>
      </div>
    </details>
  );
}
export function AppFrame({
  area,
  children,
}: {
  area: "EMPLOYER" | "WORKER";
  children: ReactNode;
}) {
  const demo = useDemo();
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  useEffect(() => {
    if (demo.ready && !demo.actor) router.replace("/login");
  }, [demo.ready, demo.actor, router]);
  if (!demo.ready)
    return (
      <main className="standalone" role="status">
        กำลังโหลดข้อมูล…
      </main>
    );
  if (!demo.actor)
    return (
      <main className="standalone">
        <Link href="/login">เลือกบัญชีสาธิตก่อน</Link>
      </main>
    );
  if (demo.actor.role !== area)
    return (
      <main className="standalone stack">
        <h1>ไม่มีสิทธิ์เข้าพื้นที่นี้</h1>
        <Banner tone="warning">
          บัญชีปัจจุบันไม่ตรงกับ Actor ของหน้าที่ขอ
        </Banner>
        <Link
          className="button"
          href={
            demo.actor.role === "EMPLOYER" ? "/employer/workers" : "/worker"
          }
        >
          กลับพื้นที่ของฉัน
        </Link>
      </main>
    );
  const actor = demo.actor;
  const name =
    actor.role === "EMPLOYER"
      ? "ผู้แทนนายจ้าง"
      : (demo.data.workers.find((w) => w.id === actor.workerId)?.name ??
        "ลูกจ้าง");
  const nav = area === "EMPLOYER" ? employerNav : workerNav;
  async function logout() {
    if (await demo.signOut()) router.replace("/login");
  }
  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">
        ข้ามไปเนื้อหา
      </a>
      <aside className="sidebar">
        <Link className="brand" href={nav[0].href}>
          SA / WORKFORCE
        </Link>
        <p>
          ระบบจัดการเอกสาร
          <br />
          แรงงานต่างด้าว
        </p>
        <span className="badge">
          {area === "EMPLOYER" ? "นายจ้าง / ผู้แทน" : "ลูกจ้างต่างด้าว"}
        </span>
        <nav aria-label="เมนูหลัก">
          {nav.map((item) => {
            const resultPage =
              pathname.endsWith("/application") ||
              pathname.endsWith("/applications");
            const resultItem = item.href.endsWith("/applications");
            const base = resultItem
              ? item.href.slice(0, -"/applications".length)
              : item.href;
            const active =
              item.href === pathname ||
              (resultItem
                ? resultPage && pathname.startsWith(base + "/")
                : item.href !== "/worker" &&
                  pathname.startsWith(item.href + "/") &&
                  !resultPage);
            const href =
              area === "WORKER" && search.get("employmentId")
                ? item.href +
                  "?employmentId=" +
                  encodeURIComponent(search.get("employmentId") ?? "")
                : item.href;
            return (
              <Link
                key={item.href}
                className="nav-link"
                href={href}
                aria-current={active ? "page" : undefined}
              >
                <img
                  src={"/icons/" + (active ? item.dark : item.light)}
                  alt=""
                  width={20}
                  height={20}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <footer>
          <p>
            ข้อมูลตัวอย่างสมมติ
            <br />
            {demo.mode === "mock" ? "MOCK FRONTEND" : "ระบบจัดการเอกสาร"}
          </p>
          <button className="button secondary" onClick={logout}>
            {demo.mode === "backend" ? "ออกจากระบบ" : "ออกจากระบบสาธิต"}
          </button>
        </footer>
      </aside>
      <main id="main-content" className="main stack">
        <div className="topbar">
          <span className="muted">
            WORKSPACE /{" "}
            {area === "EMPLOYER" ? "บริษัทตัวอย่าง จำกัด" : "บัญชีของฉัน"}
          </span>
          <strong>
            {name}
            {demo.mode === "mock" ? " · ข้อมูลสมมติ" : ""}
          </strong>
        </div>
        {demo.notice && (
          <div role="status">
            <Banner>{demo.notice}</Banner>
          </div>
        )}
        {children}
        {demo.mode === "mock" && <DemoTools />}
        <p className="app-footer">
          {demo.mode === "mock"
            ? "ข้อมูลสมมติ · การทำงานและดาวน์โหลดจำลอง · ไม่มีการส่งให้หน่วยงานภายนอก"
            : "ข้อมูลถูกบันทึกในระบบ · การยื่นและพิจารณาดำเนินการผ่านหน่วยงานภายนอก"}
        </p>
      </main>
    </div>
  );
}
