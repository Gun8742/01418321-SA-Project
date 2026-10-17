# Frontend specification

สถานะ: Proposed implementation; เป็น Spec สำหรับพัฒนา ไม่ใช่ผลทดสอบหรือหลักฐานว่ามีแอปแล้ว
ขอบเขต Desktop Web 1440 px ตาม Figma รองรับนายจ้าง/ผู้แทนและลูกจ้างต่างด้าว ครบ UC-01–UC-11

## เอกสาร Frontend

| เอกสาร | ขอบเขต |
|---|---|
| [Routes และ Navigation](routes.md) | URL/หน้าจอ/Action, บริบท Worker + Employment, การแจ้งและปิดเรื่อง |
| [Forms และ Validation](forms.md) | กลุ่ม fields, required/conditional validation, รูปแบบวันที่และ input limits |
| [UI States และ Integration](ui-states.md) | Loading/empty/error/success, saving/conflict, read-only, Mock และ Server adapter |
| [Components และ Presentation](components.md) | Components/Tokens จาก Figma, Accessibility, Responsive และภาษาไทย |
| [Verification](verification.md) | วิธีตรวจ Frontend และการจับคู่ Acceptance Criteria ที่ต้องใช้ |

ใช้ [Use Case Map](../../use-case-map.md) เพื่อจับคู่ UC กับ Module/Screen; หนึ่ง Figma frame ไม่จำเป็นต้องมี URL แยก
เริ่มจาก Routes → Forms/UI States → Components และตรวจ Verification ก่อนส่งมอบ
รายละเอียด UI ที่เพิ่มจาก Figma เช่น Employer Tab คำแจ้ง ระบุเป็น Proposed ใน Routes

## ข้อกำหนดส่วนกลาง

| เอกสาร | ใช้เป็นข้อกำหนดร่วม |
|---|---|
| [Product](../product.md) | เป้าหมาย ขอบเขต และระยะส่งมอบ |
| [Data Contract](../data-contract.md) | DTO/Input/Error envelope และชื่อ fields ตรงกันทั้ง Frontend/Backend |
| [Workflows](../workflows.md) | Status/transition และเงื่อนไขเปิดขั้นตอน |
| [Authorization](../authorization.md) | Actor, ownership และ capability; Server ต้องบังคับใช้จริง |
| [Acceptance](../acceptance.md) | เกณฑ์ตรวจรับ UC และพฤติกรรมร่วมทั้งระบบ |
| [Decisions](../decisions.md) | ข้อเสนอ/Open issues และ gates ก่อน implementation |
| [Backend](../backend/README.md) และ [Operation catalog](../backend.md) | พฤติกรรม Server ที่ UI/Mock ต้องเรียกตรงกัน |

เก็บกฎส่วนกลางไว้จุดเดียว ไม่คัดลอก Contract/transition/สิทธิ์มาเป็นอีกฉบับใน Frontend
Spec ทั้งหมดยังอ้าง revised Description และ Architecture เดิม; การแยกไฟล์ไม่เปลี่ยน business rules
ตรวจเอกสารจากราก Repository ด้วย `python3 scripts/check-specs.py`; คำสั่งนี้ไม่ใช่ runtime/UI test
