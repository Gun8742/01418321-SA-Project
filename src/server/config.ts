import "server-only";
import { OperationError } from "../features/workforce/operations";
export function requireBackend() {
  if (
    process.env.BACKEND_ENABLED !== "true" ||
    process.env.NEXT_PUBLIC_ENABLE_MOCK === "true"
  )
    throw new OperationError("NOT_FOUND", "Backend ไม่ได้เปิดใช้งาน");
}
