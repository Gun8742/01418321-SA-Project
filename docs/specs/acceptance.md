# Acceptance specification

สถานะ: เกณฑ์ตรวจรับที่ต้องทำตอน implement ยังไม่ใช่ผลทดสอบผ่าน
Test IDs ด้านล่างจับคู่ [UC → Screen](../use-case-map.md), [operations](backend.md) และ [transitions](workflows.md)
Business tests ใช้ synthetic data และแยก mock demo จาก integrated system

## UC coverage

| Test ID | Given / When | Expected และ negative path |
|---|---|---|
| AC-UC01 / UC-01 | Employer มี Employment ที่ถูกต้อง; เตรียม/ตรวจ/บันทึกการยื่น/ผล pre-arrival | ขาดเอกสารไม่ READY; ขาดหลักฐานรับเป็น awaiting confirmation; confirmed submission จึง PENDING; APPROVED มีหลักฐานจึงเปิด Visa; REJECTED ไม่เปิดต่อ |
| AC-UC02 / UC-02 | มี Employment และเลือกกรณีก่อน/หลังเข้าประเทศ; เตรียม Work Permit | เลือก checklist ตามกรณี; ขาดเอกสารแก้ได้และ review ไม่ผ่าน; กรณีหลังเข้าประเทศ PLANNED/PENDING entry หรือมีเพียงนัดแพทย์ยังผ่านไม่ได้; กรณีก่อนเดินทางใช้ checklist เฉพาะและเลขคำร้องเดิม ไม่บังคับสองแบบพร้อมกัน |
| AC-UC03 / UC-03 | ชุด Work Permit READY; บันทึกยื่น/ผล/แนบใบอนุญาต | ขาดหลักฐานรับคงรอยืนยัน; เพิ่มเอกสารใน Application เดิม; REJECTED ไม่พร้อมรับ; APPROVED แต่ไม่มีใบอนุญาตยังรับไม่ได้ |
| AC-UC04 / UC-04 | Employer เพิ่ม/แก้ Worker+Employment ของตน | บันทึกคู่ atomic; invalid fields มี inline error; retry ไม่ซ้ำ; Employer อื่นเข้าถึง/แก้ไม่ได้; editing ไม่เปลี่ยนคำร้องคนละ Employment |
| AC-UC05 / UC-05 | pre-arrival ผ่าน gate; เลือก case เตรียม Visa | จัด checklist/เอกสารและ preview ได้; เอกสารเฉพาะกรณีไม่ถูกบังคับทุก Worker; ไม่มี policy ที่ยืนยันต้องบล็อก review production |
| AC-UC06 / UC-06 | ชุด Visa พร้อมตรวจ; review แล้วแก้ file/field | ครบจึง READY; ไม่ครบแจ้งรายการ; แก้แล้ว readiness ถูก invalidate; ไม่ยื่นด้วยผล review เก่า |
| AC-UC07 / UC-07 | Visa APPROVED และมีเอกสารจริงของ Worker; ดู/ดาวน์โหลด/ยืนยัน | ดู/ดาวน์โหลดไม่สร้าง receipt; ยืนยันจริงสร้างหนึ่งรายการ; pending/คนอื่นรับไม่ได้; retry เดิมไม่ซ้ำ |
| AC-UC08 / UC-08 | Worker รับ Visa แล้ว; กรอก plan/หลักฐาน/ผล | plan ไม่ใช่ ALLOWED; ไม่มี capability เปลี่ยนผลไม่ได้; ALLOWED+evidence เปิด UC-09; DENIED ยุติเส้นทางและไม่เปิด medical |
| AC-UC09 / UC-09 | Entry ALLOWED พร้อมหลักฐาน; บันทึก visit/result/certificate | รองรับ ADDITIONAL_TESTS; ใบรับรองเป็นเอกสารโรงพยาบาล; ไม่มี capability ยืนยันไม่ได้; ไม่มี certificate ไม่เปิด UC-02; ไม่คำนวณผลวินิจฉัยเอง |
| AC-UC10 / UC-10 | Work Permit APPROVED และใบอนุญาตพร้อม; Worker ยืนยัน | receipt เมื่อได้รับจริง; พร้อมรับ/รับแล้วแยกกัน; download ไม่เท่ารับ; retry concurrent ได้ receipt เดียว |
| AC-UC11 / UC-11 | Visa READY; Employer บันทึกยื่น/ติดตามผล/แนบ Visa | ใช้ revised Description ไม่ตัด UC-11 เพราะบอร์ดเก่าบอก proposed; evidence ไม่ครบคง awaiting; additional docs คำร้องเดิม; approve กับเอกสารพร้อมแยกกัน |

## Cross-cutting acceptance

| Test ID | ตรวจพฤติกรรม |
|---|---|
| AC-AUTH-01 | unauthenticated read/mutate/download ถูกปฏิเสธ; signOut/revoked/expired session ใช้ต่อไม่ได้ |
| AC-SCOPE-01 | เปลี่ยน worker/set/application/document IDs เป็นของอีก Employer/Worker ทุก endpoint ต้องไม่เปิดเผยข้อมูล/count/file URL |
| AC-SCOPE-02 | ใช้ Worker ที่มีหลาย Employment แล้วไม่ leak เอกสารนายจ้างอีกฝ่าย; child FK ต่าง Worker ถูกปฏิเสธ |
| AC-GRANT-01 | Role หรือ capability จาก request ไม่เพิ่มสิทธิ์; AUTHORIZED_OFFICER ปฏิเสธโดย default; grant ยังจำกัด scope |
| AC-STATE-01 | ข้ามขั้น/ส่ง arbitrary status/ใช้ stale review ไม่ได้; blocking reason ตรง prerequisite |
| AC-FAIL-01 | จำลอง DB/storage failure ก่อน commit → ไม่ advance state/ไม่สร้าง receipt/ไม่แสดง success; input ยังอยู่ |
| AC-RETRY-01 | timeout หลัง commit → reconcile ผลเดิมด้วย requestId; payload ต่าง key เดิม conflict |
| AC-CONCURRENT-01 | สอง request version เดียวกันอย่างมากหนึ่งเขียนสำเร็จ; ไม่มี lost update/duplicate application/receipt |
| AC-FILE-01 | ไฟล์เกิน 5 MiB, MIME spoof, executable, foreign uploadId ถูกปฏิเสธ; cleanup ไม่ลบไฟล์ที่มี reference |
| AC-FILE-02 | signed URL หมดอายุ/ไม่มีสิทธิ์โหลดไม่ได้; storage key/token ไม่อยู่ใน DTO/log; download failure ไม่ขึ้นสำเร็จ |
| AC-CORRECTION-01 | Worker แจ้งข้อมูลไม่ตรง; Employer scope ที่เกี่ยวข้องแก้/resolve พร้อมเหตุผล; คนอื่น resolve ไม่ได้; ไม่แก้ issued record เงียบ ๆ |
| AC-DATA-01 | BIGINT ไม่เสีย precision; string เลขศูนย์นำหน้าคงเดิม; Gregorian/พ.ศ./timezone round-trip ไม่เลื่อนวัน; nullable event ไม่มีวันปลอม |
| AC-UI-01 | ทุก route มี loading/empty/error/retry; Thai ยาว/filename ไม่ล้นที่ 1440/1024/390; keyboard/focus/contrast ผ่าน target |
| AC-DEMO-01 | demo ติดป้ายข้อมูลสมมติ, การยื่น/อนุมัติ/เดินทาง/ตรวจแพทย์ภายนอก; fake role/auth/download ไม่หลุด production |
| AC-PROCESS-01 | source version/checklist policy/decisions ที่กระทบ UC ถูก review; coverage และ contract adapter ตรงกัน |

## วิธีตรวจตามระยะ

Frontend demo: mock operation contract, component/form tests สำหรับ validation/failure/gates, keyboard และ visual comparison กับ Figma
Integration: disposable PostgreSQL/private storage + Auth จริง; ownership, transaction, concurrency, idempotency, file lifecycle
End-to-end: Employer UC-04→01→05→06→11, Worker 07→08→09, Employer 02→03, Worker 10 พร้อมสลับบัญชีจริง ไม่ใช้ mock role เพื่อพิสูจน์ authorization
เส้นทางลบ: เอกสารไม่ครบ → แก้ → review ใหม่, additional documents → ติดตามคำร้องเดิม, rejection, entry denied, save failure, session expiry
ก่อนส่งมอบ: รัน formatter/lint/typecheck/unit/integration/e2e/build ที่ติดตั้งจริง และบันทึกผล/ข้อจำกัด; ไม่มี scripts ไม่ถือว่าผ่าน
PR ชุดนี้ตรวจเฉพาะความครบ/links/source fingerprints ของ Spec; ไม่ได้พิสูจน์ runtime ตามเกณฑ์ข้างต้น
