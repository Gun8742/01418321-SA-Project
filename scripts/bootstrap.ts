import "dotenv/config";
import { database } from "../src/server/db";
const db = database();
try {
  await db.casePolicy.upsert({
    where: { version: "INTERNAL-1" },
    update: {},
    create: {
      version: "INTERNAL-1",
      approved: true,
      synthetic: false,
      requirements: [
        {
          requirementKey: "passport",
          label: "หนังสือเดินทางที่ยังมีผล",
          required: true,
        },
        {
          requirementKey: "employment",
          label: "สัญญาจ้างหรือหนังสือรับเข้าทำงาน",
          required: true,
        },
        {
          requirementKey: "company",
          label: "เอกสารนายจ้างและหนังสือมอบอำนาจตามกรณี",
          required: true,
        },
      ],
    },
  });
  console.log(
    "Internal checklist installed; no accounts or synthetic business data created.",
  );
} finally {
  await db.$disconnect();
}
