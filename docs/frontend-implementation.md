# Mock Frontend — Implementation and Verification

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

### PR #3 review corrections

แก้ต่อจาก `daa4285`: invalidate review ข้าม Employment เมื่อข้อมูล Worker ร่วมเปลี่ยน; คงคำขอที่อยู่ระหว่างพิจารณาหรือมีผลแล้วไว้
ตรวจวันตรวจไม่ก่อนเข้าเมืองและวันออกใบรับรองไม่ก่อนวันตรวจ รวมถึง gate ของหลักฐานเก่าที่เก็บใน browser
UC-05 เพิ่ม `visaType`, `workHistory` และ `taxEvidenceRequired`; เพิ่ม/ถอดรายการใบอนุญาตเดิมกับ ภ.ง.ด.91 ตามกรณี แล้วบังคับ review ใหม่
Browser state เดิมเติมค่า unknown โดยไม่ลบข้อมูล แต่ Visa ที่ยังไม่ระบุกรณีจะยื่นด้วย review เก่าไม่ได้
ค่า tax applicability เป็นการเลือกเพื่อจำลองเงื่อนไข ยังไม่มี catalog สถานทูตจริงที่อนุมัติ (O-03); ไม่บังคับ ภ.ง.ด.91 ทุกคน

ผล regression ล่าสุด: Unit tests 47 / 8 files และ Chromium E2E 10 tests ผ่าน
เพิ่มภาพตรวจ conditional checklist ที่ 1440/390 px; ไม่มี horizontal overflow

### PR #3 review corrections รอบสอง

แก้ต่อจาก `1e909eb`: `recordSubmission` ตรวจ source Precondition ซ้ำก่อนเขียนข้อมูล จึงใช้ review เก่าข้ามผลเข้าเมืองหรือวันที่ใบรับรองที่ไม่ถูกต้องไม่ได้
หลักฐานคำร้องเป็นรายการอ้างอิงสะสมแบบไม่ซ้ำ; แต่ละ submission/decision event เก็บรายการหลักฐานของตัวเอง พร้อมเลขรับ หน่วยงาน และวันที่ตามเหตุการณ์
การติดตาม PENDING โดยไม่เลือกไฟล์ไม่ล้างหลักฐานรับคำขอเดิม และ UI เปิดหลักฐานจากประวัติแต่ละเหตุการณ์ได้
ประวัติเก่าที่ยังไม่มี event metadata ยังคงอ่านได้ แต่ไม่สามารถสร้างการจำแนกเหตุการณ์ย้อนหลังจากข้อมูลที่ไม่ได้เก็บไว้

Dirty form guard ติดตั้งก่อน Next Router listeners โดยติด index ใน history state เดิม; ยกเลิก Back/Forward แล้วคืนตำแหน่งเดิมโดยไม่เพิ่ม entry หลอก
รองรับ history.go หลายขั้น, ยืนยันออก, ยกเลิกออก, Forward ที่ยังใช้ได้หลังยกเลิก และไม่เตือนเมื่อฟอร์มสะอาด/บันทึกสำเร็จ
ผลล่าสุด Unit tests 52 / 10 files และ Chromium E2E 11 tests ผ่าน; ตรวจภาพประวัติหลักฐานที่ 1440/390 px ไม่มี page overflow
Production build ผ่าน และรันซ้ำ 2 E2E ที่กระทบ History/ประวัติหลักฐานกับ `next start` ผ่านด้วย; ยังไม่ได้ตรวจ browser นอก Chromium

Mock ปิดโดย default และเก็บข้อมูลใน browser เท่านั้น; ข้อมูลหายได้เมื่อ reset/ล้าง storage
ไฟล์เลือกเข้าได้เฉพาะ metadata หลังตรวจชนิด/ขนาด ไม่มี upload bytes ไป Server
Preview/Download ใช้ข้อมูลสังเคราะห์ ไม่ได้แสดงหรือสร้างเอกสารราชการ
DEMO-1 checklist และ capability บันทึกหลักฐานภายนอกเป็นตัวอย่างตาม Open decisions O-02/O-03

ยังไม่ได้ตรวจ real Auth/DB transactions/private storage, multi-user concurrency, หน่วยงานภายนอก หรือ browser นอก Chromium
Labels, focus, dialog และ viewport ที่ตรวจเป็นหลักฐานเฉพาะ flow เหล่านี้ ไม่ใช่ full WCAG audit
ก่อนใช้งานจริงให้ปิด Open decisions ที่เกี่ยวข้องและทำ Backend integration tests ตาม Spec
