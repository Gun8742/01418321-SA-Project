"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { z } from "zod";
import { DemoContext } from "../demo/context";
import {
  actorSchema,
  demoDataSchema,
  type Actor,
  type OperationName,
  type OperationResult,
} from "./model";
import { emptyData } from "./empty";

const resultSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    data: z.object({ id: z.string() }),
    requestId: z.string(),
  }),
  z.object({
    ok: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
      retryable: z.boolean(),
      fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
    }),
    requestId: z.string(),
  }),
]);
function failed(
  requestId: string,
  message = "ติดต่อ Server ไม่สำเร็จ กรุณาตรวจสถานะก่อนลองใหม่",
): OperationResult {
  return {
    ok: false,
    error: { code: "SAVE_FAILED", message, retryable: true },
    requestId,
  };
}
const snapshotSchema = z.object({
  actor: actorSchema,
  data: demoDataSchema,
  capabilities: z.array(
    z.object({ employmentId: z.string(), capability: z.string() }),
  ),
});
async function post(path: string, body: unknown) {
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
}
export function BackendProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(emptyData);
  const [actor, setActor] = useState<Actor | null>(null);
  const [capabilities, setCapabilities] = useState<
    z.infer<typeof snapshotSchema>["capabilities"]
  >([]);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [readError, setReadError] = useState(false);
  const [notice, setNotice] = useState("");
  const inFlight = useRef(false);
  const retry = useRef<{ digest: string; requestId: string } | null>(null);
  async function refresh() {
    try {
      const response = await fetch("/api/workforce", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (response.status === 401) {
        setActor(null);
        setData(emptyData());
        setCapabilities([]);
        setReadError(false);
        return null;
      }
      if (!response.ok) throw new Error("Read failed");
      const snapshot = snapshotSchema.parse(await response.json());
      setActor(snapshot.actor);
      setData(snapshot.data);
      setCapabilities(snapshot.capabilities);
      setReadError(false);
      return snapshot.actor;
    } catch {
      setReadError(true);
      return null;
    } finally {
      setReady(true);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function mutate(
    name: OperationName,
    input: Record<string, unknown>,
  ): Promise<OperationResult> {
    const digest = JSON.stringify({ name, input });
    const requestId =
      typeof input.requestId === "string"
        ? input.requestId
        : retry.current?.digest === digest
          ? retry.current.requestId
          : crypto.randomUUID();
    if (inFlight.current)
      return failed(requestId, "กำลังบันทึก กรุณารอสักครู่");
    retry.current = { digest, requestId };
    inFlight.current = true;
    setPending(true);
    setNotice("");
    try {
      const response = await post("/api/workforce", {
        operation: name,
        input: { ...input, requestId },
      });
      const result = resultSchema.parse(await response.json());
      if (result.ok) {
        retry.current = null;
        await refresh();
        setNotice("บันทึกบน Server แล้ว");
      } else if (!result.error.retryable) retry.current = null;
      return result;
    } catch {
      await refresh();
      return failed(requestId);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  const uploadRetry = useRef<{
    file: File;
    employmentId: string;
    ownerKind: string;
    requestId: string;
  } | null>(null);
  async function uploadFile(
    file: File,
    employmentId: string,
    ownerKind: "WORKER" | "EMPLOYER",
  ): Promise<OperationResult> {
    const previous = uploadRetry.current;
    const requestId =
      previous?.file === file &&
      previous.employmentId === employmentId &&
      previous.ownerKind === ownerKind
        ? previous.requestId
        : crypto.randomUUID();
    if (inFlight.current)
      return failed(requestId, "กำลังบันทึก กรุณารอสักครู่");
    uploadRetry.current = { file, employmentId, ownerKind, requestId };
    inFlight.current = true;
    setPending(true);
    try {
      const init = await post("/api/documents/uploads", {
        employmentId,
        ownerKind,
        originalName: file.name,
        declaredMime: file.type,
        declaredSize: file.size,
        requestId,
      });
      const raw: unknown = await init.json();
      if (!init.ok) return resultSchema.parse(raw);
      const reservation = z
        .object({
          data: z.object({
            uploadId: z.uuid(),
            uploadUrl: z.string().startsWith("/api/documents/uploads/"),
          }),
        })
        .parse(raw).data;
      const sent = await fetch(reservation.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
        credentials: "same-origin",
      });
      if (!sent.ok) return resultSchema.parse(await sent.json());
      const complete = await post(
        "/api/documents/uploads/" + reservation.uploadId + "/complete",
        { requestId },
      );
      const result = resultSchema.parse(await complete.json());
      if (result.ok) {
        uploadRetry.current = null;
        await refresh();
        setNotice("จัดเก็บไฟล์บน Server แล้ว");
      } else if (!result.error.retryable) uploadRetry.current = null;
      return result;
    } catch {
      return failed(requestId, "อัปโหลดไม่สำเร็จ ไฟล์ยังไม่ถูกใช้เป็นหลักฐาน");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  async function signOut() {
    try {
      const response = await post("/api/auth/sign-out", {});
      if (!response.ok) throw new Error("Sign-out failed");
      setActor(null);
      setData(emptyData());
      setCapabilities([]);
      retry.current = null;
      uploadRetry.current = null;
      return true;
    } catch {
      setNotice("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่");
      return false;
    }
  }
  return (
    <DemoContext.Provider
      value={{
        mode: "backend",
        data,
        actor,
        ready,
        pending,
        notice,
        readError,
        failNext: false,
        grants: false,
        refresh,
        mutate,
        signOut,
        uploadFile,
        hasCapability: (capability, employmentId) =>
          capabilities.some(
            (g) =>
              g.capability === capability && g.employmentId === employmentId,
          ),
        signIn: () => false,
        reset: () => {},
        setFailNext: () => {},
        setGrants: () => {},
        setReadError: (value) => {
          if (!value) void refresh();
          else setReadError(true);
        },
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}
