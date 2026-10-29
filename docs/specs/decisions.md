# Decisions และ Open questions

เอกสารนี้เป็นรายการ Proposed/Open ยังไม่ใช่ ADR ที่อนุมัติแล้ว
เมื่อทีมตัดสินใจให้บันทึกผู้ตัดสินใจ/วันที่/เหตุผล/ผลกระทบและแก้ contracts, schema, UI, tests ที่เกี่ยวข้องใน PR เดียวกัน

## ข้อตกลงทดลองภายในองค์กร — 29 ตุลาคม 2569

ผู้ใช้ยืนยันล่าสุดให้ใช้นายจ้างเพียงบัญชีเดียวและไม่เปิดสมัครนายจ้างผ่านเว็บ; เชิญ Worker ผ่านอีเมล, นายจ้างบันทึกผลภายนอกทั้งหมด, ทดลองติดตั้งภายในองค์กร, ตั้ง SMTP ผ่าน env และใช้ Mailpit ในเครื่อง พร้อมอนุญาตให้สมมติ Checklist INTERNAL-1 รายละเอียด implementation และข้อจำกัดอยู่ใน [คู่มือทดลอง](../internal-trial.md)

ข้อตกลงนี้แทนค่าเริ่มต้นเดิมของ O-01/O-02 และส่วน Checklist ภายในของ O-03; package setup และ Docker deployment มี implementation แล้วสำหรับ O-08 ยังคงไม่รับรองเอกสารราชการ การใช้ข้อมูลจริงบน Server ยังต้องตั้งและตรวจ infrastructure ขององค์กร ข้อเสนอ/สถานะ local รุ่นก่อนด้านล่างเก็บไว้เป็นประวัติ ไม่ใช่ค่าปัจจุบันของบัญชีใหม่

## Proposed defaults

| ID   | ข้อเสนอ                                                                                                        | เหตุผล / ขอบเขต                                                                                             |
| ---- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| P-01 | Next.js Full-stack TypeScript Modular Monolith ตาม architecture เดิม                                           | เริ่มแอปเดียว, UI/operations แยก boundary; ยังไม่ติดตั้งหรือ pin versions                                   |
| P-02 | ใช้ existing Figma components/tokens, Noto Sans Thai, light/green, Desktop 1440                                | รักษาภาพที่ผู้ใช้เลือก; responsive ตาม frontend spec                                                        |
| P-03 | enum readiness/submission/decision แยกกัน                                                                      | READY mapping จาก COMPLETE/READY; ไม่รวม approved กับ ready/received                                        |
| P-04 | Server Actions first-party + HTTP auth/files                                                                   | ลด API ที่ซ้ำโดยยังตรวจ trust boundary เดียวกัน                                                             |
| P-05 | optimistic version + requestId receipt                                                                         | ป้องกัน lost update และ retry หลัง timeout; ไม่ทำ workflow engine                                           |
| P-06 | private PDF/JPEG/PNG <=5 MiB, download URL 60s, temporary cleanup 24h                                          | เริ่มจาก limit ชัด; ต้องปรับเมื่อพบเอกสารจริงที่ต้องรองรับ                                                  |
| P-07 | capability สำหรับบันทึก evidence แยก Role                                                                      | ไม่สมมติสิทธิ์เจ้าหน้าที่และไม่ให้ Worker เปลี่ยนผลเองเพราะมี form                                          |
| P-08 | null ก่อน event + conditional metadata                                                                         | ไม่เติมวัน/เลขเอกสารปลอมเพื่อผ่าน schema                                                                    |
| P-09 | correction/evidence/history extensions เฉพาะที่ UC/UI ต้องใช้                                                  | รองรับ W10/additional documents/trace result ไม่ทำ event sourcing                                           |
| P-10 | receipt ก่อน travel plan; หลังเข้าประเทศใช้ verified medical certificate ก่อน Work Permit review ตาม checklist | travel receipt gate เป็นข้อเสนอ; UC-02 ก่อนเดินทางยังรองรับตาม Description ไม่บังคับ entry/medical ข้ามกรณี |
| P-11 | no public signup/admin UI ใน v1                                                                                | provision บัญชีทดสอบ/ใช้งานผ่านวิธีที่อนุมัติ ไม่ตีความ Q44/Q45 เป็น signup requirement                     |

## Open issues และ Gate

| ID   | สิ่งที่ต้องสรุป                                                                                                          | Proposed owner             | บล็อกอะไร / สิ่งที่ทำได้ก่อน                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------- | ----------------------------------------------------------------------- |
| O-01 | Better Auth หรือ Auth integration อื่น; custom ER IDs/password/session hashes กับ library tables/semantics mapping       | Tech lead + Backend        | บล็อก Auth schema/integrated login; ทำ mock login/UI contract ได้       |
| O-02 | ใครบันทึก/ยืนยัน entry result และ certificate; provision/revoke scoped grants อย่างไร                                    | ผู้รับผิดชอบ Requirement   | บล็อก production result mutations; mock ระบุว่าจำลองได้                 |
| O-03 | exact form fields/lengths, checklist/แม่แบบ/เวอร์ชันตาม nationality/case/authority; ยอมรับ schema nullability/extensions | Domain owner + Database    | บล็อก final migrations และ review/การยื่นจริง; synthetic case ทำ UI ได้ |
| O-04 | hosting/storage/region, retention, file deletion, access logs, backup/restore, production capacity/SLO                   | Project owner + Operations | บล็อกใช้ข้อมูลจริง/deployment; local synthetic demo ได้                 |
| O-05 | channel การรับเอกสารจริงและหลักฐาน physical/digital, เกณฑ์พร้อมรับตามหน่วยงาน                                            | Domain owner               | บล็อก receipt production policy; mock มีช่องทางสมมติชัดเจน              |
| O-06 | duplicate Worker/Passport/nationality policy, Employment ซ้อนและการแก้ข้อมูลร่วมระหว่าง Employer                         | Domain owner + Backend     | บล็อก global uniqueness/merge/edit policy; ห้าม auto-merge คนต่าง scope |
| O-07 | แก้ผล final/ออกเอกสารใหม่/ยกเลิกหรือ reopen กรณีผิดอย่างไร; ผู้มีสิทธิ์และ trace                                         | Domain owner               | บล็อก override/reissue; default ปฏิเสธการแก้ผล final เงียบ ๆ            |
| O-08 | รุ่น dependencies ที่เข้ากันและ environment/deployment target                                                            | Tech lead                  | บล็อก package setup จริง; Spec ไม่ระบุ API ที่ยังไม่ได้ตรวจ             |

“Proposed owner” คือบทบาทที่เสนอให้ตัดสินใจ ไม่ใช่การมอบหมายบุคคลจริง
Frontend mock เริ่มได้เมื่อทีมยอมรับ scope/contracts; Backend integrated และ production ต้องเคลียร์ gates ที่เกี่ยวข้องก่อน
การ merge Spec ไม่ใช่การปิด Open issues โดยอัตโนมัติ

## ผลจาก Class Diagram ที่เพิ่ม

[Class Diagram review](backend/class-diagram-review.md) แสดง mapping ครบทุก Control และความต่าง CD-01–CD-12
เสนอใช้ VisaDocumentSet/WorkPermitDocumentSet เป็น case policy บน document_set; แยก generic validateAndSave เป็น named operations ตาม transaction จริง
ข้อมูล Class Diagram ไม่ได้แก้ O-01 เรื่อง Auth, O-02 เรื่องผู้บันทึกผล หรือ O-03 เรื่อง schema/checklist; รายละเอียดใหม่ทั้งหมดใน Backend Spec ยังรอ review

## ข้อแตกต่างของแหล่งข้อมูล

| Source discrepancy                                        | ใช้อะไรใน Spec                          | ผลที่ต้องตาม                                          |
| --------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------- |
| UC-11 ในบอร์ดเก่าบางส่วนยัง proposed                      | revised UC01–UC11 รวม UC-11             | coverage ต้องมี submission/decision/issued Visa       |
| ER/Sequence ใช้ COMPLETE กับ READY                        | normalized READY สำหรับ readiness       | adapter/migration map ชัด ห้ามเทียบ label ไทย         |
| Dictionary บังคับ event timestamps/receipt ก่อนเกิด event | P-08 conditional nullability            | O-03 review physical schema                           |
| ER มี AUTHORIZED_OFFICER แต่ UI สองกลุ่ม Actor            | default deny/no new officer UI          | O-02 scoped grants; ไม่เพิ่ม external agency workflow |
| Query ในบอร์ดเป็น SQL ที่เสนอ                             | ใช้เพื่อ trace intent ไม่อ้างรันผ่าน    | ตรวจ SQL/constraints จริงตอน migrations               |
| Figma แสดง fields/correction ที่ Dictionary ยังไม่มีครบ   | schema extensions ที่ระบุใน database.md | O-03/O-07 review ไม่ตัด Requirement ทิ้ง              |

## Local implementation — 18 ตุลาคม 2569

ผู้ใช้อนุมัติให้พัฒนา Backend แล้ว รุ่น local ใช้ Better Auth/PostgreSQL/Prisma/S3 ตาม [Backend implementation](../backend-implementation.md) พร้อม pinned dependencies และ integration tests O-08 ฝั่ง package setup มี implementation จริงแล้ว ส่วน deployment target ยังไม่ตัดสินใจ

Open decisions ทางธุรกิจยังคงเปิด: ใช้ synthetic DEMO-1 โดย opt-in, scoped grants เริ่ม deny, ปฏิเสธ shared Worker ข้ามบริษัทและ final override/reissue ดู transport mapping และข้อจำกัดของ DTO ในเอกสาร implementation ก่อนเรียก API การอนุมัติให้พัฒนาไม่ใช่การรับรองแบบราชการหรือ production policy
