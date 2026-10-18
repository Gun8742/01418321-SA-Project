import "server-only";
import { z } from "zod";
import { OperationError } from "../features/workforce/operations";
export function requireSameOrigin(request: Request) {
  const origin = process.env.BETTER_AUTH_URL;
  if (!origin || request.headers.get("origin") !== new URL(origin).origin)
    throw new OperationError("FORBIDDEN", "Request origin ไม่ถูกต้อง");
}
export async function readBody(request: Request, limit = 256 * 1024) {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > limit)
        throw new OperationError("FILE_TOO_LARGE", "ข้อมูลเกินขนาดที่อนุญาต");
      chunks.push(result.value);
    }
  } catch (error) {
    await reader.cancel();
    throw error;
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  return buffer;
}
export async function readJson(request: Request): Promise<unknown> {
  try {
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(await readBody(request)),
    );
  } catch (error) {
    if (error instanceof OperationError) throw error;
    throw new OperationError("VALIDATION_ERROR", "รูปแบบข้อมูลไม่ถูกต้อง");
  }
}
export function failure(error: unknown, requestId = crypto.randomUUID()) {
  if (error instanceof z.ZodError)
    return Response.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "กรุณาตรวจข้อมูล",
          fieldErrors: Object.fromEntries(
            error.issues.map((issue) => [
              issue.path.join(".") || "_form",
              [issue.message],
            ]),
          ),
          retryable: false,
        },
        requestId,
      },
      { status: 422 },
    );
  const known = error instanceof OperationError;
  const code = known ? error.code : "SAVE_FAILED";
  const statuses: Record<string, number> = {
    UNAUTHENTICATED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    VALIDATION_ERROR: 422,
    CONFLICT: 409,
    PRECONDITION_FAILED: 409,
    FILE_TOO_LARGE: 413,
    UNSUPPORTED_FILE_TYPE: 415,
    FILE_UNAVAILABLE: 503,
    SAVE_FAILED: 503,
  };
  return Response.json(
    {
      ok: false,
      error: {
        code,
        message: known
          ? error.message
          : "บันทึกไม่สำเร็จ กรุณาตรวจสถานะแล้วลองใหม่",
        retryable: ["SAVE_FAILED", "FILE_UNAVAILABLE"].includes(code),
      },
      requestId,
    },
    {
      status: statuses[code] ?? 500,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
