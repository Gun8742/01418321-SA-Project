# Use Case → Module → หน้าจอ

อ้างอิง revised UC01–UC11 เป็นหลัก ดูตำแหน่งเอกสารต้นฉบับใน [AGENTS.md](../AGENTS.md#sources-of-truth)
ชื่อ Module ไม่ได้เปลี่ยนชื่อ Entity ใน ER และเส้นทางด้านล่างเป็นแผน Routing ยังไม่มี pages ที่ทำงานจริง

| Use Case | Module หลัก | หน้าจอ Figma | พื้นที่ Route |
|---|---|---|---|
| UC-01 คำขอก่อนเดินทาง | `pre-arrival` | E03, E04 | `/employer/pre-arrival` |
| UC-02 เตรียมเอกสาร Work Permit | `work-permits` | E11 | `/employer/work-permits` |
| UC-03 การยื่นและผล Work Permit | `work-permits` | E12, E13 | `/employer/work-permits` |
| UC-04 ข้อมูลลูกจ้างและการจ้าง | `workers`, `employment` | E01, E02, E14, E15 | `/employer/workers` |
| UC-05 จัดชุดเอกสาร Visa | `visa` | E05, E06 | `/employer/visa` |
| UC-06 ตรวจชุดเอกสาร Visa | `visa` | E05, E06 | `/employer/visa` |
| UC-07 รับ Visa | `visa` | W02, W03 | `/worker/visa` |
| UC-08 การเดินทางและผลตรวจเข้าเมือง | `travel` | W04, W04A, W04R, W04N | `/worker/travel` |
| UC-09 ตรวจสุขภาพและใบรับรอง | `medical` | W05, W06, W06S | `/worker/medical` |
| UC-10 รับ Work Permit | `work-permits` | W07, W08, W09 | `/worker/work-permit` |
| UC-11 การยื่น ผล และจัดเก็บ Visa | `visa` | E07–E10 | `/employer/visa` |

`documents` เป็น Module ร่วมสำหรับไฟล์ เจ้าของไฟล์ ชุดเอกสาร และ DocumentReceipt
กฎเปิดรับ Visa/Work Permit อยู่ใน Module ธุรกิจที่เกี่ยวข้อง และใช้ `documents` จัดเก็บ/ตรวจสิทธิ์ไฟล์ตามเจ้าของที่เชื่อถือได้

## หน้าจอประกอบ

- `/login`: S01/S01W; Authentication เป็น Supporting Flow ไม่เพิ่มเลข UC ธุรกิจ
- `/worker`: W01 ภาพรวมของตนเอง อ่านสถานะจาก Modules ที่เกี่ยวข้อง
- S02: ไม่มีสิทธิ์; S03/S03S/S04: ดู/ดาวน์โหลดและผลลัพธ์; S05: ข้อความบันทึกสำเร็จ
- W10/W10S: แจ้งข้อมูลไม่ตรง ให้เข้าจากบริบท Visa, Travel หรือ Work Permit โดยไม่ถือเป็นการแก้เอกสารต้นฉบับ
- Employer ใช้ Tab คำแจ้งใน E15 ของ Employment ที่เลือกเพื่ออ่าน/ตอบและปิดเรื่อง; เป็น Proposed UI เพิ่ม ยังไม่มี frame เฉพาะใน Figma ดู [Frontend Spec](specs/frontend/README.md)
- Worker detail/edit ใช้บริบทคู่ workerId + employmentId; หน้า Worker ระดับบนเป็น selector การจ้าง ไม่เลือกประวัติล่าสุดเอง ดู canonical routes ใน [Frontend Spec](specs/frontend/README.md)

หมายเลขหน้าจอและสถานะตัวอย่างไม่ได้บังคับให้สร้าง URL แยกหนึ่ง route ต่อหนึ่ง frame
ใช้ page, tab หรือ inline state ตามงานจริง พร้อมรักษา Precondition ของ UC และแยกข้อมูลตามสิทธิ์

## Design References

- [Figma UI Design](https://www.figma.com/design/aBLNdRvl9Z3x8qrhG6x38g)
- [ER Diagram — Peter Chen 2](https://www.figma.com/board/h7Vj8NzfRvX91Y0hag1uEx/SA-project?node-id=322-5899) — แบบข้อมูลล่าสุด รวม Actor Login; ดูข้อจำกัดใน [Data Model Sources](data-model.md)
- [Prototype & Coverage](https://www.figma.com/design/aBLNdRvl9Z3x8qrhG6x38g?node-id=10-829)
- [Site map](https://www.figma.com/board/h7Vj8NzfRvX91Y0hag1uEx/SA-project?node-id=338-3418)

คำจำกัดความธุรกิจและเงื่อนไขการทำงานใช้ Description กับ Domain Rules ใน AGENTS.md; ภาพ Prototype ไม่ใช่หลักฐานว่ามี Backend หรือบังคับสิทธิ์แล้ว
