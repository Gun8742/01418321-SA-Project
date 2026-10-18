import { z } from "zod";
import {
  applyOperation,
  OperationError,
  requestFields,
} from "../workforce/operations";
import type { Actor, DemoData, OperationName, OperationResult } from "./model";
export { scopedEmployment, preparationBlocker } from "../workforce/operations";
function requireRule(
  condition: unknown,
  message: string,
  code = "PRECONDITION_FAILED",
): asserts condition {
  if (!condition) throw new OperationError(code, message);
}
// shortcut: browser-only simulation, replace with Server operations before using real data.
export function runOperation(
  original: DemoData,
  actor: Actor,
  name: OperationName,
  input: unknown,
  options = { fail: false, grants: false },
): { state: DemoData; result: OperationResult } {
  const parsed = z.object(requestFields).safeParse(input);
  const requestId = parsed.success ? parsed.data.requestId : "invalid";
  try {
    requireRule(parsed.success, "คำขอไม่มี requestId", "VALIDATION_ERROR");
    const key = actor.accountId + ":" + name + ":" + requestId;
    const digest = JSON.stringify(input);
    const previous = original.operationReceipts[key];
    if (previous) {
      requireRule(
        previous.digest === digest,
        "requestId เดิมมี payload ต่างกัน",
        "CONFLICT",
      );
      return {
        state: original,
        result: { ok: true, data: { id: previous.id }, requestId },
      };
    }
    requireRule(
      !options.fail,
      "จำลองการบันทึกล้มเหลว ข้อมูลและสถานะยังเหมือนเดิม",
      "SAVE_FAILED",
    );
    const state = structuredClone(original);
    const id = applyOperation(state, actor, name, input, {
      entry: options.grants,
      medical: options.grants,
    });
    state.operationReceipts[key] = { digest, id };
    return { state, result: { ok: true, data: { id }, requestId } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const key = issue.path.join(".") || "_form";
        (fieldErrors[key] ??= []).push(issue.message);
      }
      return {
        state: original,
        result: {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "ข้อมูลไม่ถูกต้อง กรุณาตรวจช่องที่ระบุ",
            fieldErrors,
            retryable: false,
          },
          requestId,
        },
      };
    }
    if (error instanceof OperationError)
      return {
        state: original,
        result: {
          ok: false,
          error: {
            code: error.code,
            message: error.message,
            retryable: error.code === "SAVE_FAILED",
          },
          requestId,
        },
      };
    throw error;
  }
}
