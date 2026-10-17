# Frontend Components และ Presentation

สถานะ: Proposed implementation; ใช้ [Frontend index](README.md), [Data Contract](../data-contract.md), [Workflow](../workflows.md) และ [Authorization](../authorization.md) ร่วมกัน

## Components และ Design Tokens

ใช้ Tokens/Components ของ Figma: สีเขียวเข้ม primary, light background, Noto Sans Thai; ค่าสี/spacing จริง extract จาก Foundations ตอน implement ไม่แต่ง token hex ใหม่ใน Spec
Components ที่ใช้ซ้ำ: AppShell, navigation ตาม Actor, StatusBadge, DataTable, FormField, Checklist, DocumentList/Preview, Stepper, ErrorSummary, ConfirmationDialog, Toast
ไม่สร้าง abstraction ทุกส่วนล่วงหน้า; แยกเมื่อมี reuse หรือ behavior ที่ต้องทดสอบ

## Accessibility และ Responsive

เสนอเป้าหมาย WCAG 2.2 AA: semantic landmarks, labels จริง, keyboard ทุก action, focus ชัด, dialog trap/restore focus, error ผ่าน aria-describedby และ live feedback
ห้ามใช้สีอย่างเดียวบอก status; contrast ข้อความปกติอย่างน้อย 4.5:1, large text/UI controls ตามเกณฑ์ที่เกี่ยวข้อง
ทดสอบ 1440, 1024, 390 px; sidebar collapse, tables มี horizontal scroll โดย controls ยังเข้าถึงได้, ไม่มี text clipping
ข้อความไทยยาว/ชื่อไฟล์ยาวต้อง wrap; preview มี fallback download; reduced-motion ไม่เสียข้อมูล
สิ่งเหล่านี้เป็น acceptance target ยังไม่ใช่ผล audit ที่ทำแล้ว

เกณฑ์ตรวจ Component, keyboard และ viewport อยู่ใน [Verification](verification.md)
