# Mock Frontend — Implementation and Verification

Backend เชื่อมแล้ว: ดู [Backend implementation](backend-implementation.md) สำหรับ Server mode; ข้อจำกัด Mock ในเอกสารนี้ใช้เฉพาะ Mock mode

ตรวจวันที่ 18 ตุลาคม 2569 สำหรับ branch `feat/mock-frontend`
ขอบเขตเป็น browser-only demo ใช้ข้อมูลสมมติ ไม่ใช่ Backend integration หรือระบบพร้อมใช้ข้อมูลจริง

## Coverage

| UC | หน้าจอ / พฤติกรรมที่ implement |
|---|---|
| UC-04 | ค้นหา เพิ่ม แก้ไข Worker/Employment, เลือกการจ้างอย่างชัดเจน และ deep link ที่มีทั้งสอง ID |
| UC-01 | ชุดเอกสารก่อนเดินทาง ตรวจทาน บันทึกการยื่น หลักฐานรับคำขอ และผลพิจารณา |
| UC-05–UC-06 | จัดชุดเอกสาร Visa และตรวจทานในหน้าเดียว แก้ชุดแล้วต้องตรวจใหม่ |
| UC-11 | บันทึกการยื่น Visa, ผลพิจารณา, เอกสารเพิ่มในคำร้องเดิม และ Visa ที่ออกแล้ว |
| UC-07 | ดู Visa, Preview/Download สาธิต และยืนยันการรับจริงเป็นคนละ action |
| UC-08 | แผนเดินทาง draft/confirmed, ช่องเที่ยวบินตามเงื่อนไข และผลเข้าเมืองพร้อมหลักฐาน |
| UC-09 | โรงพยาบาล/วันตรวจ, ผลตรวจ/ตรวจเพิ่ม และใบรับรอง; ไม่วินิจฉัยแทนโรงพยาบาล |
| UC-02–UC-03 | เตรียม Work Permit ตามกรณี ตรวจ Precondition ยื่น ติดตามผล และบันทึกใบอนุญาต |
| UC-10 | ดูใบอนุญาตที่พร้อมรับและยืนยันการรับ |
| Supporting | Demo login, wrong-role/scope denial, คำแจ้ง Worker → Employer ตอบ/ปิด → Worker ดูผล |

Actor scope, version checks, transition และ idempotency อยู่ใน Mock operations ส่วนกลาง
เป็นแบบจำลองให้ทดสอบ UI เท่านั้น ต้องบังคับใช้ใหม่ใน Server ตาม Contract เมื่อเชื่อม Backend
Read DTO และ Mock state ยังต้อง mapping เข้ากับ Server adapter; ไม่ใช่ wire implementation ที่นำไปใช้ตรง ๆ

## ผลตรวจจริง

- `npm run format:check` และ `npm run typecheck` ผ่าน
- `npm test`: 34 tests / 5 files ผ่าน ครอบคลุม scope, หลักฐาน, stale version, idempotency, failure, file signature/size, date และ semantic health labels
- `npm run test:e2e`: 9 Chromium tests ผ่าน รวม main path ครบ UC, correction round trip, เอกสารเพิ่ม, rejection, session storage failure และ read retry
- `NEXT_PUBLIC_ENABLE_MOCK=true npm run build`: Production build ผ่าน
- `npm run check:specs`: เอกสาร 24 ไฟล์, 11 UC, 11 synthetic scenarios ผ่าน; checker ไม่พบต้นฉบับ 29 รายการจาก relative root ของ manifest ใน checkout นี้
- ตรวจ SHA-256 ต้นฉบับแยกจาก workspace `/Users/gun.gunn_/Projects/KU/SA`: ตรง manifest ทั้ง 29 รายการ
- ตรวจภาพ Production build 11 captures ครอบคลุม Login, Employer list/form, Worker overview/Visa/travel/medical ที่ 1440/1024/390 px ตามหน้าที่เกี่ยวข้อง: ไม่มี page overflow, runtime errors หรือ SVG เสีย และ Noto Sans Thai โหลดครบ
- Review ภาพรอบแรกพบสามจุด: สถานะสุขภาพกำกวม, เอกสารชื่อซ้ำแยกยาก และฟอร์มไม่แบ่งกลุ่ม แก้แล้วและ reviewer ตรวจซ้ำทั้งสามข้อเป็น resolved; ไม่ใช่ผลรับรองทุก route หรือ production security

ภาพและ capture script เป็น local QA artifacts ใน `.impeccable/review/` ซึ่งไม่เข้า Git
แหล่งภาพต้นแบบและ node IDs อ้าง Figma manifest เดิม; ไม่เปลี่ยน Figma ในงาน implementation นี้

## ข้อจำกัดและการเชื่อมต่อครั้งถัดไป

Mock ปิดโดย default และเก็บข้อมูลใน browser เท่านั้น; ข้อมูลหายได้เมื่อ reset/ล้าง storage
ไฟล์เลือกเข้าได้เฉพาะ metadata หลังตรวจชนิด/ขนาด ไม่มี upload bytes ไป Server
Preview/Download ใช้ข้อมูลสังเคราะห์ ไม่ได้แสดงหรือสร้างเอกสารราชการ
DEMO-1 checklist และ capability บันทึกหลักฐานภายนอกเป็นตัวอย่างตาม Open decisions O-02/O-03

ยังไม่ได้ตรวจ real Auth/DB transactions/private storage, multi-user concurrency, หน่วยงานภายนอก หรือ browser นอก Chromium
Labels, focus, dialog และ viewport ที่ตรวจเป็นหลักฐานเฉพาะ flow เหล่านี้ ไม่ใช่ full WCAG audit
ก่อนใช้งานจริงให้ปิด Open decisions ที่เกี่ยวข้องและทำ Backend integration tests ตาม Spec
