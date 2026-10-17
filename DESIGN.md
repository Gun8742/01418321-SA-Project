---
name: "SA / WORKFORCE"
description: "ระบบจัดการเอกสารแรงงานต่างด้าวตาม Figma SA — UI Design"
colors:
  canvas: "#f3f5f1"
  surface: "#fff"
  ink: "#203b32"
  muted: "#5c6c64"
  brand: "#14634b"
  brand-dark: "#123e32"
  soft: "#e3efe6"
  selected: "#d9edd9"
  nav-text: "#cee2d5"
  line: "#d8e0d8"
  warning: "#855600"
  warning-bg: "#fff5d9"
  error: "#a73535"
  error-bg: "#fff0ee"
  info: "#245b88"
  info-bg: "#eaf3fc"
typography:
  headline:
    fontFamily: "Noto Sans Thai Variable, sans-serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.35
  title:
    fontFamily: "Noto Sans Thai Variable, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.5
  body:
    fontFamily: "Noto Sans Thai Variable, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Noto Sans Thai Variable, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
  badge:
    fontFamily: "Noto Sans Thai Variable, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.5
rounded:
  control: "8px"
  banner: "12px"
  panel: "16px"
spacing:
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "32": "32px"
  "40": "40px"
  "64": "64px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "12px 22px"
  button-primary-hover:
    backgroundColor: "{colors.brand-dark}"
  button-secondary:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.brand}"
    rounded: "{rounded.control}"
    padding: "12px 22px"
  button-secondary-hover:
    backgroundColor: "{colors.selected}"
  button-danger:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.error}"
    rounded: "{rounded.control}"
    padding: "12px 22px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "24px"
  badge:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.brand}"
    typography: "{typography.badge}"
    rounded: "{rounded.control}"
    padding: "5px 12px"
  banner:
    backgroundColor: "{colors.info-bg}"
    textColor: "{colors.info}"
    rounded: "{rounded.banner}"
    padding: "20px"
  nav-link:
    textColor: "{colors.nav-text}"
    rounded: "{rounded.control}"
    padding: "12px"
  nav-link-active:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.brand-dark}"
  document-row:
    padding: "16px"
  tab:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
---

# Design System: SA / WORKFORCE

## Overview

**Creative North Star: "SA / WORKFORCE"**

รักษา visual authority จาก Figma SA — UI Design (`aBLNdRvl9Z3x8qrhG6x38g`; E01 5:2, W01 6:2, Login 7:2) และรูปแบบที่ implement แล้ว งานนี้เป็น Operate: อ่านข้อมูลการจ้าง ตรวจสถานะ และทำรายการได้ชัดเจน

พื้นสว่าง แผงสีขาว และ Sidebar เขียวเข้มแบ่งพื้นที่การทำงาน สีใช้ระบุ action และสถานะ; typography ภาษาไทยและ spacing สม่ำเสมอช่วยให้แบบฟอร์มและเอกสารอ่านง่าย

**Key Characteristics:**
- พื้นสว่างและแผงขาวคั่นด้วย border บาง
- เขียวเข้มสำหรับ navigation และ action หลัก
- ข้อความไทยอ่านง่าย สถานะมีข้อความกำกับ
- Responsive โดยใช้ component เดิมและรักษา keyboard focus

## Colors

ใช้เขียวเป็น Primary, พื้น Neutral และสี semantic สำหรับ feedback; ค่าจริงอยู่ใน frontmatter และ `src/app/globals.css`

### Primary

- **Brand Green** (`brand`): ปุ่มหลักและ link; **Deep Sidebar Green** (`brand-dark`): Sidebar และ primary hover
- **Soft Green** (`soft`): secondary action และ badge ปกติ; **Selected Green** (`selected`): navigation ที่เลือกและ secondary hover

### Neutral

- **Light Canvas** (`canvas`) และ **White Surface** (`surface`): พื้นหน้ากับแผงข้อมูล
- **Deep Green Ink** (`ink`), **Muted Green Grey** (`muted`): ข้อความหลักกับคำอธิบาย
- **Pale Navigation Text** (`nav-text`): ข้อความบน Sidebar; **Quiet Line** (`line`): border และ divider
- **Warning Amber**, **Error Red**, **Information Blue** (`warning`, `error`, `info` และคู่ `*-bg`): สถานะและ feedback ตามความหมาย

**The Status Text Rule.** สีสถานะต้องมีข้อความกำกับเสมอ

## Typography

ใช้ Noto Sans Thai Variable จาก dependency ใน `src/app/layout.tsx` โดยมี sans-serif fallback ทั้ง UI; ไม่มี display font แยก

Hierarchy ใช้ `headline` สำหรับ h1, `title` สำหรับ h2, `body` สำหรับเนื้อหา, `label` สำหรับชื่อ field และ `badge` สำหรับ status; ค่า normative อยู่ใน frontmatter

h1 ลดเหลือ (28px) บน viewport ไม่เกิน (760px); h3 ใช้ (17px) และ form legend ใช้ (18px, 700) ส่วนคำอธิบาย heading ใช้ (15px) ข้อความรองขนาดเล็กใช้ (13px) และ footer ใช้ (12px)

## Layout

Desktop ใช้ Sidebar (256px) และ main ที่ยืดหยุ่นพร้อม padding (40px) แต่ละ section ห่าง (24px); แผง padding (24px), stack ภายใน (12px) และ form สองคอลัมน์ gap (20px 24px)

ที่ viewport ไม่เกิน (1100px) Sidebar เหลือ (224px), main padding (28px) และ document row wrap ได้ ที่ไม่เกิน (760px) Sidebar อยู่เหนือเนื้อหาและเมนูเลื่อนแนวนอน; main padding (24px 16px), panel padding (20px), form กับ metadata เหลือคอลัมน์เดียว

Login แบ่งสองฝั่ง (5fr 7fr) บน desktop และเรียงแนวตั้งบน mobile; dialog กว้างไม่เกิน (680px) และเลื่อนเนื้อหาภายในเมื่อสูงเกิน (90dvh)

## Elevation & Depth

แผงข้อมูลใช้พื้นสีและ border เพื่อแบ่งชั้น ไม่มี box-shadow ที่กำหนดในระบบ; native dialog ใช้ backdrop สีเขียวโปร่ง (`#123e3266`) และคง native modal behavior

## Shapes

Control และ badge ใช้ `rounded.control`; banner ใช้ `rounded.banner`; panel และ dialog ใช้ `rounded.panel` แผงและ field มี border บาง (1px) ไม่มีรูปทรงตกแต่งเพิ่มเติม

## Components

### Buttons

ปุ่มใช้ความสูงขั้นต่ำ (48px), น้ำหนัก (700) และ padding ตาม frontmatter มี primary, secondary และ danger; primary hover เปลี่ยนเป็นเขียวเข้ม secondary hover เปลี่ยนเป็น selected ปุ่ม disabled ลด opacity (0.55) และใช้ not-allowed cursor ปุ่ม danger ยังคง hover จาก primary ตาม stylesheet ปัจจุบัน

### Cards / Containers

`Panel` ใน `src/components/ui/primitives.tsx` จัด section บน surface พร้อม title และ stack ภายใน ใช้ border และ spacing แทนเงา `DocumentLibrary` ใช้แถวเอกสารที่ชื่อไฟล์ wrap ได้และ action wrap ตามพื้นที่

### Inputs / Fields

`OperationForm` ใช้ input, select และ textarea แบบ native พร้อม label/hint/error; field สูงขั้นต่ำ (48px), textarea (100px) และ resize แนวตั้งได้ error เปลี่ยน border เป็นสี error สำหรับ input/textarea และมีข้อความอธิบาย แสดง feedback summary หลัง submit

### Status / Feedback

`Badge` แสดงข้อความสถานะด้วย default, warning, error หรือ info; `Banner` ใช้ info, warning และ error โดยจับคู่สีข้อความ/พื้นตาม semantic tokens

### Navigation

`AppFrame` ใช้ local Figma SVG icons ขนาด (20px) กับชื่อเมนู; active ใช้ `aria-current="page"` สี selected และข้อความ brand-dark hover ใช้สีเดียวกับ active `tabs` เป็น link ที่ wrap ได้และแสดง current state ด้วยพื้น soft กับน้ำหนัก (700)

### Focus / Motion

ทุก control ใช้ focus-visible outline สี brand (3px) offset (4px); มี skip link ไป main content ปุ่ม transition เฉพาะ background-color (120ms ease-out) เมื่อผู้ใช้ไม่ขอ reduced motion

## Do's and Don'ts

### Do:

- **Do** ใช้ tokens และ component ที่มีอยู่ก่อนเพิ่มรูปแบบใหม่
- **Do** แสดงสถานะด้วยข้อความร่วมกับสี และเชื่อม label/error กับ field
- **Do** ให้ชื่อเอกสารและข้อความไทยยาว wrap ได้ พร้อม action ที่เข้าถึงด้วย keyboard
- **Do** ใช้ SVG icons จาก Figma ที่เก็บใน public/icons สำหรับ role navigation

### Don't:

- **Don't** เปลี่ยน palette, font หรือองค์ประกอบหลักจาก Figma โดยไม่มี requirement
- **Don't** ใช้ screenshot เป็น UI asset
- **Don't** เติม ornamental shadow ให้แผงข้อมูล
- **Don't** ใช้สีเพียงอย่างเดียวสื่อสถานะ
