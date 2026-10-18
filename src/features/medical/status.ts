import type { Entry, Health } from "@/features/demo/model";
export function medicalStatusLabel(
  entry: Entry | undefined,
  health: Health | undefined,
): string {
  if (!entry || entry.entryResult !== "ALLOWED") return "รอเข้าประเทศ";
  if (!health) return "ยังไม่บันทึกการตรวจ";
  if (health.certificateDocumentId) return "มีใบรับรองแล้ว";
  if (health.resultStatus === "PENDING") return "รอผลตรวจ";
  if (health.resultStatus === "ADDITIONAL_TESTS") return "ต้องตรวจเพิ่มเติม";
  return "ผลครบ รอใบรับรอง";
}
