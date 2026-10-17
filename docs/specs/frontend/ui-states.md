# Frontend UI States และ Integration

สถานะ: Proposed implementation; ใช้ [Frontend index](README.md), [Data Contract](../data-contract.md), [Workflow](../workflows.md) และ [Authorization](../authorization.md) ร่วมกัน

## Loading และ Mutation feedback

ทุก data view รองรับ loading, empty, error + retry; ทุก mutation รองรับ saving, validation error, failure, success
ห้ามแสดง success ก่อน Server commit; error คงข้อมูลกรอกและ status เดิม; กรณี outcome ไม่แน่ชัดให้ reload/reconcile ก่อน retry
แสดง error ใกล้ field พร้อม summary และย้าย focus ไป error แรก; disabled action มีเหตุผลและทางแก้จาก blockingReasons
Submit ซ้ำขณะ saving ถูกยับยั้งใน UI แต่ Server ต้องป้องกันซ้ำด้วย
Travel มี action บันทึก draft (mode DRAFT) และยืนยันแผน (mode CONFIRM); แสดง planStatus แยกจากผลเข้าเมืองและ field errors เมื่อยืนยันไม่ครบ
Health visit ที่มีผล/ใบรับรองแล้วแสดง read-only พร้อมเหตุผล HEALTH_VISIT_LOCKED; UI ไม่ส่งนัดใหม่เพื่อ reset ผล ส่วน issued document ที่มี slot แล้วใช้ข้อมูลเดิมและรอ correction/reissue policy ไม่แสดง action แนบซ้ำเป็นเอกสารใหม่


## Mock และ integration seam

Frontend ใช้ operation interfaces ตาม [Backend](../backend.md) และ DTO ตาม [Data Contract](../data-contract.md)
Mock adapter และ Server adapter ให้ผล success/error shape เดียวกัน; mock role switch จำกัด demo build และติดป้าย “ข้อมูลสมมติ / จำลองการทำงาน”
ห้ามนำ mock adapter, fake login หรือ role override เปิดใน production
Fixture ต้องครอบคลุมงานครบ/ไม่ครบ/ขอเพิ่ม/ไม่อนุมัติ/พร้อมรับ/รับแล้ว และ failure; ห้ามมี PII จริง

พฤติกรรมการเลือกการจ้าง/ปิดคำแจ้งอยู่ใน [Routes](routes.md); fields และ validation อยู่ใน [Forms](forms.md)
