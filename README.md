# Sign App · Smart Viewer Usability Test

Interactive prototype (HTML ไฟล์เดียว) สำหรับทดสอบ usability การลงนามเอกสารของผู้บริหาร
ข้อมูลทั้งหมดเป็นข้อมูลตัวอย่าง

## Deploy ด้วย GitHub Pages
1. ตั้งค่าครั้งแรก: Settings → Pages → Build and deployment → Source = **GitHub Actions**
2. push ขึ้น branch `main` → workflow `Deploy to GitHub Pages` จะรันอัตโนมัติ (ดูได้ที่แท็บ Actions)
3. ลิงก์สำหรับผู้ทดสอบ: `https://<username>.github.io/<repo-name>/`
   (ดูได้ที่ Settings → Pages หรือในผลของ job `deploy`)
4. GitHub Pages เปิดสาธารณะเสมอ แม้ repo เป็น Private (ต้องใช้แพ็กเกจที่รองรับ) — ใช้เฉพาะข้อมูลตัวอย่างเท่านั้น
5. สั่ง deploy ซ้ำโดยไม่ต้อง push: Actions → Deploy to GitHub Pages → Run workflow

## อัปเดต prototype
แก้ไฟล์ใน `public/` โดยตรง แล้ว commit + push ระบบจะ deploy ใหม่อัตโนมัติ
- `index.html` — โครง HTML
- `styles.css` — สไตล์ทั้งหมด (รวม design tokens)
- `app.js` — ข้อมูลและ logic ของ prototype

## Design tokens
ขนาดตัวอักษรใช้ตัวแปร CSS: `--fs-xs` 12 · `--fs-sm` 14 · `--fs-md` 16 (เนื้อหา) · `--fs-lg` 18 · `--fs-xl` 20

## แผง Facilitator
กดค้างที่นาฬิกา / แตะมุมซ้ายบน 3 ครั้ง (มือถือ) / กดปุ่ม F
