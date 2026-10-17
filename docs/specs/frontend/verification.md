# Frontend Verification

สถานะ: เกณฑ์ที่ต้องตรวจตอน implement ยังไม่ใช่ผลทดสอบผ่าน
ใช้ [Acceptance ส่วนกลาง](../acceptance.md) เป็นเจ้าของเกณฑ์ธุรกิจ; ไฟล์นี้จับคู่กับงาน Frontend โดยไม่กำหนด transition หรือ Contract ชุดใหม่

## Coverage และจุดตรวจ

| พื้นที่ Frontend | Spec ที่ใช้ | Acceptance IDs ส่วนกลาง |
|---|---|---|
| ข้อมูล Worker/Employment, selector, detail/edit/deep link และ unsaved changes | [Routes](routes.md), [Forms](forms.md) | AC-UC04, AC-EMPLOYMENT-01, AC-EMPLOYMENT-02, AC-SCOPE-02 |
| เตรียม/ตรวจทาน/ยื่น pre-arrival และ Work Permit; แยกกรณีก่อน/หลังเข้าประเทศ | [Routes](routes.md), [Forms](forms.md), [UI States](ui-states.md) | AC-UC01, AC-UC02, AC-UC03 |
| เตรียม/ตรวจทาน/ยื่น Visa, additional documents และผล/เอกสารพร้อมรับ | [Routes](routes.md), [UI States](ui-states.md) | AC-UC05, AC-UC06, AC-UC11 |
| ดูและยืนยันการรับ Visa/Work Permit แยกจาก preview/download | [Routes](routes.md), [Forms](forms.md) | AC-UC07, AC-UC10, AC-FILE-02 |
| Travel draft/confirmation/ผลเข้าเมือง, Medical visit/result/certificate และ read-only | [Forms](forms.md), [UI States](ui-states.md) | AC-UC08, AC-UC09, AC-STATE-01, AC-GRANT-01 |
| Worker แจ้ง → Employer อ่าน/ตอบและปิดเรื่อง → Worker ดูผล; ชื่อ input และ conflict/failure | [Routes](routes.md), [Forms](forms.md) | AC-CORRECTION-01, AC-CORRECTION-02, AC-CORRECTION-03, AC-CORRECTION-04 |
| Feedback, retry/reconcile, session/permission error และไฟล์ผิด/โหลดไม่ได้ | [UI States](ui-states.md) | AC-FAIL-01, AC-RETRY-01, AC-AUTH-01, AC-SCOPE-01, AC-FILE-01, AC-FILE-02 |
| Keyboard/focus/validation/ไทยยาว/viewport, Tokens และข้อมูลสมมติ | [Components](components.md) | AC-UI-01, AC-DATA-01, AC-DEMO-01 |

Test IDs อ้าง [Acceptance](../acceptance.md); เงื่อนไขที่ละเอียดขึ้นจาก Contract/Backend เช่น planStatus และ HEALTH_VISIT_LOCKED ให้เทียบ [Backend Verification](../backend/verification.md) ด้วย
การซ่อน action ตาม availableActions และ Mock scenarios ยังไม่พิสูจน์ Server authorization หรือ concurrency

## วิธีตรวจและหลักฐาน

1. ใช้ synthetic scenarios จาก [ตัวอย่างส่วนกลาง](../examples.json) และ [Backend contract examples](../backend/contract-examples.json); Mock adapter ต้องรับ/คืน Contract เดียวกับ Server adapter
2. ทดสอบ forms และ UI behavior ที่เสี่ยง: field errors, failure ไม่ขึ้น success, stale version/reconcile, แก้ข้อมูลแล้วต้อง review ใหม่ และไม่มีการสลับ Employment โดย implicit
3. ทดสอบ navigation และ flow ทั้งสอง Actor ครบ UC-01–UC-11 ตาม [Acceptance](../acceptance.md#วิธีตรวจตามระยะ); รวม additional documents, rejection, entry denied และคำแจ้งจนปิดเรื่อง
4. ตรวจภาพเทียบ Figma พร้อมข้อความไทย/ชื่อไฟล์ยาวที่ 1440/1024/390 px และตรวจ keyboard/focus/labels/dialog/error feedback ตาม [Components](components.md)
5. เมื่อมีแอปและเครื่องมือจริง ให้รัน formatter/lint/typecheck/component tests/e2e/build ที่เกี่ยวข้อง พร้อมบันทึกคำสั่ง ผล และข้อจำกัด; ห้ามอ้าง scripts ที่ยังไม่มี

Frontend demo ต้องแสดงว่าเป็นข้อมูลสมมติ/จำลองการทำงาน; integrated e2e ใช้บัญชีและ Server จริงเพื่อพิสูจน์ policy
ผลตรวจเอกสาร `python3 scripts/check-specs.py` แยกจากผลตรวจ UI/runtime; ปัจจุบันมี Mock Frontend และคำสั่งตรวจใน [README](../../../README.md) ส่วน Backend integration/สิทธิ์จริงยังไม่ได้พิสูจน์
