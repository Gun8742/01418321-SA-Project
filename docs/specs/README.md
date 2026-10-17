# Implementation Specifications

สถานะ: **Draft for review** · 17 ตุลาคม 2569 · ขอบเขต UC-01–UC-11 และ Supporting Flows
ชุดนี้เป็นข้อกำหนดสำหรับพัฒนา ไม่ใช่ผลการทดสอบหรือหลักฐานว่ามี implementation แล้ว

## วิธีอ่าน

| งานที่จะทำ | เอกสาร |
|---|---|
| เข้าใจเป้าหมาย ขอบเขต และข้อมูลต้นทาง | [Product](product.md) |
| ทำ Routes, Forms, UI states และ Mock | [Frontend](frontend.md) |
| ทำ Operations, transactions และ file lifecycle | [Backend](backend.md) และ [Backend ฉบับละเอียด](backend/README.md) |
| กำหนด payload ที่ FE/BE ใช้ร่วมกัน | [Data Contract](data-contract.md) และ [ตัวอย่าง JSON](examples.json) |
| กำหนด transition และเงื่อนไขเปิดขั้นตอน | [Workflows](workflows.md) |
| กำหนดขอบเขตการเข้าถึงข้อมูล | [Authorization](authorization.md) |
| ออกแบบ schema/migrations ตาม ER และ Dictionary | [Database](database.md) และ [แหล่งแบบจำลองเดิม](../data-model.md) |
| ทดสอบและตรวจรับทุก UC | [Acceptance](acceptance.md) |
| แยกข้อเสนอจากเรื่องที่ยังต้องยืนยัน | [Decisions](decisions.md) |

ใช้ [Architecture](../architecture.md) เป็นเจ้าของกฎ Directory/Dependency และ [Use Case Map](../use-case-map.md) เป็นเจ้าของการจับคู่ Module/หน้าจอ
เอกสารอื่นอ้างกลับมายังสองไฟล์นี้แทนการสร้าง Architecture ชุดใหม่

## ระดับความแน่นอน

- **Confirmed**: พฤติกรรมที่อ่านได้จาก revised Description หรือข้อมูลที่ผู้ใช้ยืนยันในงานนี้
- **Proposed**: ชื่อ DTO/Enum, route ย่อย, ขนาดไฟล์ และการตัดสินใจ implementation ที่เสนอใน PR นี้
- **Open**: ความขัดแย้งหรือข้อมูลที่ยังไม่มีคำตอบ ระบุใน Decisions พร้อมผลกระทบและเงื่อนไขเริ่มงาน

ทุกส่วนของ implementation design ที่ไม่มีการระบุว่า Confirmed เป็น **Proposed** จนกว่าทีมจะตรวจรับ
การ merge เอกสารไม่ได้แปลว่า Open items ได้รับคำตอบ; ติดตามแต่ละรายการแยกกัน

## Baseline และการเปลี่ยนแปลง

- Behavior: revised UC01–UC11; UI: Figma ฉบับปรับ Impeccable; Data: Peter Chen 2 และ Data-Dictionary-Images
- Class Diagram: PDF ที่เพิ่มใน workspace ตรวจภาพครบ 1 หน้า; [ผลเทียบ Class/UC/ER](backend/class-diagram-review.md) พร้อมข้อแตกต่างและ mapping เข้า Backend
- ตรวจ ER สดในรอบนี้: 13 Entities และตัวอย่าง Query Q01–Q45; ข้อมูล Query/Dictionary ยังเป็นแบบเสนอ
- [Source manifest](source-manifest.json) บันทึก SHA256 ของเอกสารใน workspace และลิงก์ Figma; ลิงก์ Figma เป็น mutable reference ไม่ใช่ immutable snapshot
- พัฒนาแต่ละ UC โดยอ่าน spec ที่เกี่ยวข้องและ Acceptance ID ก่อน เมื่อเปลี่ยน Contract ให้แก้ producer, consumer, Mock และ tests พร้อมกัน
- ข้อมูลต้นทางบางส่วนอยู่นอก Repository; manifest ช่วยตรวจไฟล์ที่มีอยู่ แต่ไม่ได้ทำให้การ clone มีไฟล์เหล่านั้นตามมา

ตรวจความสอดคล้องเอกสารด้วย `python3 scripts/check-specs.py` จากราก Repository
คำสั่งนี้ตรวจ links/anchors, UC coverage, source fingerprints ที่หาได้ และ JSON examples เท่านั้น ไม่ใช่ application test
