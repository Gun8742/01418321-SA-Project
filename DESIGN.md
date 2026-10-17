# Design

อ้างอิง Figma SA — UI Design (E01 5:2, W01 6:2, Login 7:2) และ get_design_context วันที่ 18 ตุลาคม 2569
รูปแบบที่มีอยู่เป็น visual authority; งานนี้ implement ไม่ใช่ redesign

- Operate: เอกสารและรายการงานต้องอ่านง่าย แยก ownership/status/available action
- Noto Sans Thai, body 16px/1.5, heading 36px/1.35, section 20px
- canvas #f3f5f1; surface #ffffff; ink #203b32; muted #5c6c64
- brand #14634b; sidebar #123e32; soft #e3efe6; selected #d9edd9; navtext #cee2d5
- line #d8e0d8; warning #855600/#fff5d9; error #a73535; info #245b88/#eaf3fc
- Sidebar 256px, desktop main padding 40px, section gap 24px, form gap 24px, section padding 24px
- Panels 16px radius/1px border, controls 8px radius, min input height 48px; no ornamental shadow
- Mobile collapse navigation; single-column forms; content/Thai labels wrap
- Role navigation icons are local Figma SVG assets; never use screenshot as UI asset
