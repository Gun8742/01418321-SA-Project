import { expect, it } from "vitest";
import { createDemoData } from "../demo/fixtures";
import { medicalStatusLabel } from "./status";
it("labels the entry prerequisite rather than medical consideration", () => {
  expect(medicalStatusLabel(undefined, undefined)).toBe("รอเข้าประเทศ");
});
it("labels a visit that has not been recorded", () => {
  const entry = createDemoData("medical").entries.find((e) => e.id === "501");
  expect(medicalStatusLabel(entry, undefined)).toBe("ยังไม่บันทึกการตรวจ");
});
it("labels pending results and existing certificates without changing global enums", () => {
  const data = createDemoData();
  const health = data.healthChecks[0];
  const entry = data.entries.find((e) => e.id === health.entryId);
  expect(medicalStatusLabel(entry, health)).toBe("มีใบรับรองแล้ว");
  expect(
    medicalStatusLabel(entry, {
      ...health,
      certificateDocumentId: null,
      resultStatus: "PENDING",
    }),
  ).toBe("รอผลตรวจ");
  expect(
    medicalStatusLabel(entry, {
      ...health,
      certificateDocumentId: null,
      resultStatus: "COMPLETE",
    }),
  ).toBe("ผลครบ รอใบรับรอง");
});
