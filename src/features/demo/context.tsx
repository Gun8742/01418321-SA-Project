"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  actorSchema,
  demoDataSchema,
  type Actor,
  type DemoData,
  type OperationName,
  type OperationResult,
} from "./model";
import { createDemoData, type DemoScenario } from "./fixtures";
import { runOperation } from "./operations";

const DATA_KEY = "sa-workforce-demo-v1";
const ACTOR_KEY = "sa-workforce-demo-actor";
type DemoContextValue = {
  data: DemoData;
  actor: Actor | null;
  ready: boolean;
  pending: boolean;
  notice: string;
  readError: boolean;
  failNext: boolean;
  grants: boolean;
  setFailNext: (v: boolean) => void;
  setGrants: (v: boolean) => void;
  setReadError: (v: boolean) => void;
  signIn: (actor: Actor) => boolean;
  signOut: () => void;
  reset: (scenario: DemoScenario) => void;
  mutate: (
    name: OperationName,
    input: Record<string, unknown>,
  ) => Promise<OperationResult>;
};
const DemoContext = createContext<DemoContextValue | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(createDemoData);
  const latest = useRef(data);
  const [actor, setActor] = useState<Actor | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const [notice, setNotice] = useState("");
  const [failNext, setFailNext] = useState(false);
  const [grants, setGrants] = useState(false);
  const [readError, setReadError] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DATA_KEY);
      if (raw) {
        const parsed = demoDataSchema.safeParse(JSON.parse(raw));
        if (parsed.success) {
          latest.current = parsed.data;
          setData(parsed.data);
        } else
          setNotice("ข้อมูลสาธิตเดิมไม่ตรงเวอร์ชัน เริ่มชุดข้อมูลสมมติใหม่");
      }
      const stored = sessionStorage.getItem(ACTOR_KEY);
      if (stored) {
        const parsed = actorSchema.safeParse(JSON.parse(stored));
        if (parsed.success) setActor(parsed.data);
      }
    } catch {
      setNotice(
        "อ่านข้อมูลใน browser ไม่สำเร็จ คุณยังดูตัวอย่างได้ แต่การบันทึกต้องเปิดใช้งาน storage",
      );
    }
    setReady(true);
  }, []);
  function signIn(next: Actor) {
    try {
      sessionStorage.setItem(ACTOR_KEY, JSON.stringify(next));
      setActor(next);
      setGrants(false);
      return true;
    } catch {
      setNotice("บันทึกบัญชีสาธิตไม่ได้ กรุณาเปิด session storage");
      return false;
    }
  }
  function signOut() {
    try {
      sessionStorage.removeItem(ACTOR_KEY);
    } catch {
      setNotice("ล้างบัญชีสาธิตใน browser ไม่สำเร็จ กรุณาล้าง session storage");
    }
    setActor(null);
    setGrants(false);
  }
  function reset(scenario: DemoScenario) {
    if (inFlight.current) return;
    try {
      const next = createDemoData(scenario);
      localStorage.setItem(DATA_KEY, JSON.stringify(next));
      latest.current = next;
      setData(next);
      setNotice("เริ่มข้อมูลสมมติชุดใหม่แล้ว");
      setReadError(false);
    } catch {
      setNotice("Reset ไม่สำเร็จ กรุณาตรวจพื้นที่ storage");
    }
  }
  async function mutate(
    name: OperationName,
    input: Record<string, unknown>,
  ): Promise<OperationResult> {
    const requestId =
      typeof input.requestId === "string"
        ? input.requestId
        : crypto.randomUUID();
    if (!actor)
      return {
        ok: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "กรุณาเลือกบัญชีสาธิตก่อน",
          retryable: false,
        },
        requestId,
      };
    if (inFlight.current)
      return {
        ok: false,
        error: {
          code: "CONFLICT",
          message: "กำลังบันทึก กรุณารอสักครู่",
          retryable: true,
        },
        requestId,
      };
    inFlight.current = true;
    setPending(true);
    setNotice("");
    try {
      await new Promise((resolve) => setTimeout(resolve, 220));
      const out = runOperation(
        latest.current,
        actor,
        name,
        { ...input, requestId },
        { fail: failNext, grants },
      );
      setFailNext(false);
      if (out.result.ok) {
        localStorage.setItem(DATA_KEY, JSON.stringify(out.state));
        latest.current = out.state;
        setData(out.state);
        setNotice("บันทึกข้อมูลสมมติแล้ว");
      }
      return out.result;
    } catch {
      return {
        ok: false,
        error: {
          code: "SAVE_FAILED",
          message:
            "บันทึกใน browser ไม่สำเร็จ ข้อมูลเดิมยังไม่เปลี่ยน กรุณาตรวจ storage แล้วลองใหม่",
          retryable: true,
        },
        requestId,
      };
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  return (
    <DemoContext.Provider
      value={{
        data,
        actor,
        ready,
        pending,
        notice,
        readError,
        failNext,
        grants,
        setFailNext,
        setGrants,
        setReadError,
        signIn,
        signOut,
        reset,
        mutate,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}
export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("DemoProvider is required");
  return value;
}
