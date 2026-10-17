# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js + TypeScript ตาม Architecture ที่ผู้ใช้ให้เริ่มทำ; CSS tokens จาก Figma สำหรับ Mock Frontend นี้

## Users

นายจ้าง/ผู้กระทำการแทนจัดข้อมูลการจ้างและคำขอ; ลูกจ้างต่างด้าวดูข้อมูลของตน รับเอกสาร และบันทึกแผนเดินทาง/การตรวจสุขภาพ

## Product Purpose

จัดชุดเอกสารและติดตามหลักฐานตั้งแต่ UC-04 ถึงการรับ Work Permit ครอบคลุม UC-01–UC-11 ตาม docs/specs

## Capabilities and Constraints

งานนี้เป็น Mock Frontend เท่านั้น การยื่น อนุมัติ เข้าเมือง และตรวจแพทย์เป็นกิจกรรมนอกระบบ ไม่มี real authentication/database/storage
ข้อมูลสาธิตสมมติทั้งหมดและ reset ได้; production integration ปิด mock โดย default
Open decisions ยังอ้าง docs/specs/decisions.md

## Brand Commitments

รักษา SA / WORKFORCE, ภาษาไทย, Noto Sans Thai, โทนสว่างและเขียวเข้มตาม Figma ที่ผู้ใช้ยืนยัน

## Evidence on Hand

Figma aBLNdRvl9Z3x8qrhG6x38g; revised UC01–UC11; docs/specs/frontend และต้นฉบับตาม AGENTS.md

## Accessibility & Inclusion

Keyboard/focus/labels และ responsive ตาม Frontend Spec; เป้าหมาย WCAG 2.2 AA ยังไม่ใช่ผลรับรอง
