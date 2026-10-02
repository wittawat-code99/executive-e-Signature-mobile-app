# Sign App · Smart Viewer Usability Test

Interactive prototype (HTML ไฟล์เดียว) สำหรับทดสอบ usability การลงนามเอกสารของผู้บริหาร
ข้อมูลทั้งหมดเป็นข้อมูลตัวอย่าง

## Deploy ด้วย GitLab Pages
1. สร้างโปรเจกต์ใหม่บน GitLab แล้ว push โฟลเดอร์นี้ขึ้นไปที่ branch หลัก
2. รอ pipeline job `pages` ผ่าน
3. ดูลิงก์ที่ Deploy → Pages
4. ถ้าโปรเจกต์เป็น Private: Settings → General → Visibility → Pages = Everyone
   (เพื่อให้ผู้ทดสอบเปิดได้โดยไม่ต้องล็อกอิน)

## อัปเดต prototype
แทนที่ `public/index.html` แล้ว commit + push ระบบจะ deploy ใหม่อัตโนมัติ

## แผง Facilitator
กดค้างที่นาฬิกา / แตะมุมซ้ายบน 3 ครั้ง (มือถือ) / กดปุ่ม F
