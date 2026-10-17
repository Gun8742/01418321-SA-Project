# Authorization Specification

**Confirmed:** ตรวจ Session, Role และ record ownership ในฝั่ง Server ทุกครั้ง; การซ่อนปุ่มไม่ใช่การป้องกันข้อมูล
ชื่อ grants และนโยบายขอบเขตต่อไปนี้เป็น **Proposed** สำหรับ review โดยไม่เปิดใช้ AUTHORIZED_OFFICER อัตโนมัติ

## Principals

- EMPLOYER และ REPRESENTATIVE ผูก employerId ที่เชื่อถือได้จากบัญชี สิทธิ์ใน v1 เท่ากันภายในนายจ้างที่ผูก
- WORKER ผูก workerId ของตน ไม่รับ workerId ใหม่จาก form เพื่อขยายสิทธิ์
- AUTHORIZED_OFFICER: ER รองรับชื่อ แต่ v1 ยังไม่มีบทบาทใช้งาน/หน้าใหม่; การพบค่า role นี้อย่างเดียวไม่ให้สิทธิ์ใด
- ไม่มี Session/Session หมดอายุหรือถูก revoke: UNAUTHENTICATED; บัญชี/service inactive ใช้งาน Session ต่อไม่ได้
- Principal ที่ผูก ID ไม่ครบตาม Role เป็นบัญชีใช้งานไม่ได้ ไม่ fallback เป็นสิทธิ์กว้าง

## Resource Policy

| Resource / Operation | Employer / Representative | Worker |
|---|---|---|
| Worker และ Employment | เฉพาะรายการ Employment ของ employerId ตน | อ่านข้อมูลตน; แก้ข้อมูลหลักผ่านคำแจ้ง ไม่แก้การจ้าง |
| ค้นหาลูกจ้างเพื่อเพิ่ม Employment | ค้นในขอบเขตของนายจ้างตนก่อน | ไม่มีสิทธิ์ค้นหาผู้อื่น |
| Employer documents | ข้อมูลนายจ้างตน | เห็นเฉพาะไฟล์ที่แชร์เพื่อ UC ของตน ไม่เห็นคลังบริษัท |
| Worker documents | เฉพาะไฟล์ที่เกี่ยวกับ Employment/คำขอที่ตนจัดการ | ไฟล์ของตน; ไม่เห็นเอกสารของ Worker อื่น |
| DocumentSet / Application | จัดเตรียม ตรวจ ยื่น และบันทึกผลในขอบเขตนายจ้างตน | อ่าน subset สถานะ/เอกสารที่เกี่ยวกับตน; ไม่แก้ผลคำขอ |
| Visa / Work Permit receipt | อ่านผลของ Employment ตน | ยืนยันรับเอกสารตนเมื่อ gate ผ่าน |
| Travel plan / Health visit | อ่านในขอบเขตนายจ้างตน | บันทึกข้อมูลของตนเมื่อ gate ผ่าน |
| Entry decision / Health result / Certificate confirmation | ต้องมี grant เฉพาะ Worker/Employment | ต้องมี grant เฉพาะ Worker/Employment ไม่ได้มาจากการเป็นเจ้าของอย่างเดียว |
| CorrectionRequest | อ่าน/แก้ข้อมูลที่ตนเป็นผู้รับผิดชอบและมีสิทธิ์เดิม | สร้างและดูคำแจ้งของตน; ไม่แก้ผลต้นฉบับ |
| Download / upload commit | ตรวจ owner, Employment และ document purpose | ตรวจ owner/context และรูปแบบไฟล์; company file ต้องมีการแชร์เฉพาะ |

การเข้าถึงลูกจ้างผ่าน Employment หนึ่งไม่ให้สิทธิ์เข้าถึง Employment ของนายจ้างอื่นหรือเอกสารทุกชิ้นของลูกจ้างคนนั้น
Server filter query ตาม scope ก่อน pagination/search/count; ห้ามโหลดทั้งหมดแล้วให้ Client กรอง

## ข้อเสนอสำหรับผู้บันทึกหลักฐานภายนอก

ให้ capability `entry:record-evidence` และ `medical:record-evidence` ผูก resource scope ผ่าน provisioning ที่เชื่อถือได้
capability ไม่ใช่ property ที่ Client สมัครหรือแก้เอง; production ไม่มี grant นี้เป็นค่าเริ่มต้น
UI อ่าน availableActions; ไม่มี grant ให้แสดงผลที่อ่านได้ แต่ไม่ให้กรอก/บันทึกผลที่ต้องใช้ grant
Frontend Mock ใช้ principal ที่มี grant ชัดเจนใน scenario ไม่ถือว่า grant นั้นผ่านอนุมัติ production แล้ว
การยืนยันว่าใครจะได้ grants จริงเป็น Open item O-02 ใน [Decisions](decisions.md)

## Authentication และ transport

- ใช้ secure HTTP-only Session cookie ใน integrated app; ประเมิน SameSite/CSRF ตาม deployment จริง และป้องกัน state-changing requests
- Login error ไม่บอกว่าบัญชีใดมีอยู่; จำกัดการลอง Login และบังคับ expiry/revocation ฝั่ง Server
- ไม่ส่ง password_hash, token_hash, storage key หรือ credential fields ใน DTO สำหรับหน้าเว็บ
- Better Auth ต้องผ่านการเทียบกับ ER และ hash requirements ตาม O-01 ก่อน implement; ไม่เพิ่ม custom auth ซ้อนขึ้นเพื่อให้ชื่อ column ตรง
- ไม่ทำ public sign-up หรือ endpoint ให้ผู้ใช้เปลี่ยน Role/grants ของตน

## Error และข้อมูลส่วนบุคคล

- Resource ID ที่ไม่อยู่ใน scope คืน NOT_FOUND ทั้งกรณีไม่มีจริง/ไม่มีสิทธิ์มองเห็น; ไม่เผยชื่อหรือข้อมูลของ record นั้น
- มองเห็น resource แต่ไม่มีสิทธิ์ operation คืน FORBIDDEN; UI ใช้หน้า S02 และลิงก์กลับที่ปลอดภัย
- Worker-facing response ไม่รวมเอกสารบริษัท รายละเอียดการจ้าง/สุขภาพที่ไม่จำเป็น หรือข้อมูลบุคคลอื่น
- Log ใช้ operation, request ID, actor ID และผล; ไม่ log raw request body, passwords, session tokens, signed URLs หรือเนื้อหาเอกสาร
- signed URL ต้องออกหลัง policy check อายุจำกัด และไม่ใช้เป็น URL ถาวรใน DB/UI
- Retention, backup location และสิทธิ์เข้าถึงข้อมูลจริงต้องยืนยันก่อนใช้ข้อมูลส่วนบุคคลจริงตาม O-04
