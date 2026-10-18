import type { Stage } from "./model";

const historicalKeys = new Set(["previousWorkPermit", "taxReturn91"]);

export function visaChecklistItems(stage: Stage): Stage["items"] {
  const items = stage.items.filter(
    (item) => !historicalKeys.has(item.requirementKey),
  );
  if (stage.workHistory !== true) return items;
  const requirements = [
    { requirementKey: "previousWorkPermit", label: "ใบอนุญาตทำงานเดิม" },
  ];
  if (stage.taxEvidenceRequired === true)
    requirements.push({ requirementKey: "taxReturn91", label: "ภ.ง.ด.91" });
  for (const requirement of requirements)
    items.push({
      ...requirement,
      required: true,
      documentId:
        stage.items.find(
          (item) => item.requirementKey === requirement.requirementKey,
        )?.documentId ?? null,
    });
  return items;
}

export function visaReviewBlocker(stage: Stage): string | null {
  if (stage.type !== "VISA") return null;
  if (
    !stage.visaType.trim() ||
    !stage.authority.trim() ||
    !stage.country.trim()
  )
    return "ระบุประเภท Visa สถานทูต และประเทศที่ยื่นก่อนตรวจทาน";
  if (stage.workHistory === null)
    return "ระบุว่าเคยทำงานในประเทศไทยหรือไม่ก่อนตรวจทาน";
  if (stage.workHistory && stage.taxEvidenceRequired === null)
    return "ตรวจรายการของคำร้องและระบุว่าต้องใช้ ภ.ง.ด.91 หรือไม่ก่อนตรวจทาน";
  const items = visaChecklistItems(stage);
  if (items.some((item) => item.required && !item.documentId))
    return "เอกสารไม่ครบ กรุณาเพิ่มรายการที่ขาดก่อนตรวจทาน";
  return null;
}
