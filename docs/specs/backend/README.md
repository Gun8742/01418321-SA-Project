# Backend implementation specification

สถานะ: Draft for review · 17 ตุลาคม 2569 · ต่อจาก PR #1
เอกสารชุดนี้กำหนด Backend ครบ UC-01–UC-11 และ Supporting Flows โดยยังไม่สร้าง runtime, package, schema หรือ migration

## เริ่มอ่านตามงาน

| งาน | Specification |
|---|---|
| ตรวจ Class Diagram กับ UC/ER/โครงสร้างเดิม | [Class Diagram review](class-diagram-review.md) |
| ทำ query/command, validation, output, business gates | [Operations](operations.md) |
| ออกแบบ tables, evidence, transactions และ concurrency | [Persistence](persistence.md) และ [Database baseline](../database.md) |
| ทำ Auth, HTTP files, configuration และ recovery | [Infrastructure](infrastructure.md) |
| ตรวจรับและจัดลำดับพัฒนา | [Verification](verification.md) |
| ตรวจตัวอย่าง request/response และ UC/Class mapping | [Contract examples](contract-examples.json) และ [Coverage](coverage.json) |

ใช้ [Backend baseline](../backend.md), [Data Contract](../data-contract.md), [Workflow](../workflows.md), [Authorization](../authorization.md) และ [Acceptance](../acceptance.md) ร่วมกัน
รายละเอียดใหม่ในชุดนี้ขยาย baseline; หากพบการเปลี่ยนต้องแก้ทั้งจุดที่ขัดกัน ไม่ถือว่ามี policy สองชุดให้เลือก
ทุกชื่อ operation, physical column/extension, limit และ infrastructure choice เป็น Proposed เว้นแต่ระบุที่มาจาก revised Description
[Open decisions](../decisions.md) ยังคงมีผล; การเพิ่ม Class Diagram ไม่ได้ปิด O-01–O-08

## ขอบเขตครบของ Backend

- Scoped read/query และ mutations สำหรับข้อมูลนายจ้าง/ลูกจ้าง/การจ้าง, ชุดเอกสาร, checklist, submission/decision/issued document, receipt, entry, health และ correction
- Supporting Auth/session, capability provisioning, private upload/download และ temporary cleanup
- DTO/validation/error mapping, transactional integrity, optimistic concurrency, retry reconciliation และ evidence trace
- Database constraints, query/index requirements, migrations/seed, operational checks และ acceptance ระดับ integrated system

ยังใช้ Next.js Modular Monolith ตาม [Architecture](../../architecture.md)
Class Diagram เป็น analysis model: View → UI, Controller → entry adapter + application operations, Entity behavior → rules/services, Database → persistence
ไม่บังคับ class-based framework, generic repositories หรือ REST endpoint ทุก UC เพียงเพื่อให้โค้ดเหมือนภาพ
PR นี้ไม่แก้ Diagram/รายงานต้นฉบับ และไม่เพิ่มหน้าเจ้าหน้าที่/การเชื่อมหน่วยงานภายนอก
