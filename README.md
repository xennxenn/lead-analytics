# Lead & Sales Analytics Dashboard

แดชบอร์ดรายงานและวิเคราะห์ยอดขายความสัมพันธ์ของ Lead จากไฟล์ Main, Status, Sales แบบเรียลไทม์ พร้อมระบบจัดกลุ่ม Ads และส่งออกข้อมูล

---

## 🚀 ขั้นตอนการ Deploy ขึ้น Vercel ผ่าน GitHub

### 1. นำโค้ดขึ้น GitHub (GitHub Repository)
คุณสามารถนำโปรเจกต์นี้ขึ้น GitHub ได้ 2 วิธี:
- **วิธีที่ 1 (แนะนำ - สะดวกที่สุด):** ในหน้าต่าง Google AI Studio ด้านขวาบน ให้คลิกที่เมนูตัวเลือก (Settings / สามจุด) แล้วเลือก **"Export to GitHub"** หรือ **"Download ZIP"**
  - หากเลือก "Download ZIP" ให้แตกไฟล์และรันคำสั่ง:
    ```bash
    git init
    git add .
    git commit -m "Initial commit for Lead & Sales Analytics Dashboard"
    git branch -M main
    git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
    git push -u origin main
    ```
- **วิธีที่ 2:** ทำการ Push โค้ดทั้งหมดเข้าสู่ Repository ใหม่บน GitHub ของคุณ

---

### 2. นำขึ้น Vercel (Deploy on Vercel)
1. ไปที่เว็บไซต์ **[Vercel](https://vercel.com/)** และเข้าสู่ระบบ (ล็อกอินด้วยบัญชี GitHub เดียวกัน)
2. คลิกปุ่ม **"Add New..."** -> **"Project"**
3. เลือก Repository บน GitHub ของคุณที่เพิ่ง Push ขึ้นไป แล้วคลิก **"Import"**
4. ตรวจสอบการตั้งค่า Build & Output Settings (ระบบ `vercel.json` ที่เตรียมไว้จะตรวจจับให้อัตโนมัติ):
   - **Framework Preset:** `Vite`
   - **Build Command:** `vite build` หรือ `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. คลิกปุ่ม **"Deploy"**
6. รอประมาณ 1-2 นาที คุณจะได้ URL เว็บไซต์จริง (เช่น `https://your-project.vercel.app`) ที่สามารถแชร์ให้ทีมงานหรือลูกค้าเข้าใช้งานออนไลน์ได้ทันที!

---

## 🛠 คำสั่งสำหรับทดสอบและรันในเครื่อง (Local Development)

```bash
# ติดตั้ง dependencies
npm install

# รันโหมด Development (เซิร์ฟเวอร์เปิดที่พอร์ต 3000)
npm run dev

# ทดสอบตรวจสอบโค้ด (Lint)
npm run lint

# Build สำหรับ Production
npm run build
```

---

## 💡 ฟีเจอร์หลัก
- **Data Integration & Realtime Matching:** รองรับการอัปโหลดไฟล์ Excel / CSV 3 ไฟล์ (Main, Status, Sales) และซิงค์เชื่อมโยงความสัมพันธ์ด้วย O(1) Lookup
- **Multi-dimension Analytics:** เจาะลึกข้อมูลตามสถานะ, สาขา, จังหวัด, พนักงานขาย, แหล่งที่มา, กลุ่ม Ads
- **Ads Group Classification:** ระบบจัดกลุ่ม Ads อัตโนมัติ พร้อมระบบสำรอง/กู้คืนข้อมูลกลุ่ม Ads เป็นไฟล์ JSON
- **Timeline & Repayment Tracking:** ดูแนวโน้มตามช่วงวันที่ พร้อมการนับวันและรอบการชำระเงินของลูกค้า
- **Exporting:** ส่งออกรายงานในรูปแบบ Excel (.xlsx) และ CSV รองรับภาษาไทยสมบูรณ์แบบ
