# ระบบจองรถยนต์ มหาวิทยาลัยเกษตรศาสตร์ (KU Car Booking)

เว็บแอป Full-stack **จบในไฟล์เดียว** — โค้ด Backend (Express + MySQL) และ Frontend ทั้ง 6 หน้า (HTML/CSS/JS + Bootstrap 5 + ปฏิทิน FullCalendar) อยู่ใน `index.js` ไฟล์เดียว  
รันใน VS Code ได้ และอัปขึ้น **GitHub → deploy บน Vercel** ได้โดยไม่ต้องมี `vercel.json`

| ไฟล์ในโปรเจกต์ | หน้าที่ |
|---|---|
| `index.js` | แอปทั้งหมด (Backend + Frontend + SQL สร้างตาราง) |
| `package.json` | รายชื่อไลบรารี + คำสั่ง `npm start` |
| `.env.example` | ตัวอย่างค่าตั้งค่า (คัดลอกเป็น `.env` เพื่อรันในเครื่อง) |
| `.gitignore` | กัน `.env` / `node_modules` ไม่ให้ขึ้น GitHub |
| `README.md` | คู่มือนี้ |

> **ทำไมใช้ GitHub Pages ไม่ได้?** Pages โฮสต์ได้เฉพาะเว็บสแตติก ระบบนี้มี Backend + ฐานข้อมูล จึงใช้ GitHub เก็บโค้ด แล้วให้ Vercel รันให้

---

## ขั้นตอนที่ 1: ติดตั้งเครื่องมือ
1. **VS Code** (https://code.visualstudio.com) และ **Node.js 22 LTS** (https://nodejs.org) — เช็กด้วย `node -v`
2. **Git** (https://git-scm.com) สำหรับขึ้น GitHub
3. สำหรับรัน MySQL ในเครื่อง: **XAMPP** (https://www.apachefriends.org) กด Start ที่ MySQL
4. Extension ที่แนะนำ: `MySQL` (Weijan Chen) หรือ `SQLTools` — ไว้ดูข้อมูลในฐานข้อมูล

## ขั้นตอนที่ 2: ฐานข้อมูล MySQL
**ตารางทั้งหมดถูกสร้างอัตโนมัติ** ตอนเชื่อมต่อครั้งแรก (พร้อมรถตัวอย่าง 6 คัน, บัญชีตัวอย่าง และการจองตัวอย่าง) — คุณแค่ต้องมี "ฐานข้อมูลเปล่า" หนึ่งอัน

- **รันในเครื่อง (XAMPP):** เปิด http://localhost/phpmyadmin → แท็บ SQL → รัน
  ```sql
  CREATE DATABASE ku_car_booking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  ```
- **ขึ้น Vercel:** Vercel ไม่มี MySQL ในตัว ต้องใช้ MySQL บนคลาวด์ที่เชื่อมต่อผ่านอินเทอร์เน็ตได้ (เช่น TiDB Cloud, Aiven, Railway หรือ MySQL ของมหาวิทยาลัย — ตรวจสอบราคา/เงื่อนไขของแต่ละเจ้าเอง) สร้างฐานข้อมูลแล้วคัดลอก **connection string** รูปแบบ `mysql://user:password@host:port/dbname` ไว้ใช้ในขั้นตอนที่ 7

<details><summary>SQL Schema ที่ระบบใช้ (อ้างอิง — ไม่ต้องรันเอง)</summary>

```sql
-- =====================================================================
--  ระบบจองรถยนต์ของมหาวิทยาลัยเกษตรศาสตร์ - MySQL Schema
--  วิธีใช้: เปิด phpMyAdmin > แท็บ SQL > วางทั้งไฟล์นี้ > กด "ดำเนินการ"
--  หรือรันด้วยคำสั่ง:  npm run db:init
--  หมายเหตุ: บัญชี admin / user ตัวอย่างจะถูกสร้างอัตโนมัติ (รหัสผ่านเข้ารหัส bcrypt)
--           ตอนเปิดเซิร์ฟเวอร์ครั้งแรก (ดู config/seed.js)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS ku_car_booking
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ku_car_booking;

-- ลบตารางเก่า (ตามลำดับ foreign key) เพื่อให้รันซ้ำได้
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS cars;
DROP TABLE IF EXISTS users;

-- ---------------------------------------------------------------------
-- 1) ผู้ใช้งาน  (role: user = ผู้จองทั่วไป, admin = ผู้ดูแลระบบ)
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(50)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(120) NOT NULL,
  department    VARCHAR(150) NULL,
  phone         VARCHAR(20)  NULL,
  role          ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2) รถยนต์
-- ---------------------------------------------------------------------
CREATE TABLE cars (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  plate_number VARCHAR(30)  NOT NULL,
  brand        VARCHAR(60)  NOT NULL,
  model        VARCHAR(60)  NOT NULL,
  car_type     VARCHAR(40)  NOT NULL,
  seats        TINYINT UNSIGNED NOT NULL DEFAULT 4,
  image_url    VARCHAR(255) NULL,
  status       ENUM('available','maintenance') NOT NULL DEFAULT 'available',
  PRIMARY KEY (id),
  UNIQUE KEY uq_cars_plate (plate_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3) การจอง  (status: pending, approved, rejected, cancelled)
--    สถานะ pending และ approved ถือว่า "ครองช่วงเวลา" ของรถคันนั้นอยู่
-- ---------------------------------------------------------------------
CREATE TABLE bookings (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          INT UNSIGNED NOT NULL,
  car_id           INT UNSIGNED NOT NULL,
  start_datetime   DATETIME     NOT NULL,
  end_datetime     DATETIME     NOT NULL,
  pickup_location  VARCHAR(200) NOT NULL,
  dropoff_location VARCHAR(200) NOT NULL,
  purpose          VARCHAR(255) NOT NULL,
  passengers       TINYINT UNSIGNED NOT NULL DEFAULT 1,
  status           ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  admin_note       VARCHAR(255) NULL,
  reviewed_by      INT UNSIGNED NULL,
  reviewed_at      DATETIME     NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bookings_car_time (car_id, start_datetime, end_datetime),
  KEY idx_bookings_user (user_id),
  KEY idx_bookings_status (status),
  CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_car  FOREIGN KEY (car_id)  REFERENCES cars (id)  ON DELETE CASCADE,
  CONSTRAINT fk_bookings_admin FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- ข้อมูลรถตัวอย่าง (ภาพรถอยู่ในโฟลเดอร์ public/images/cars/)
-- ---------------------------------------------------------------------
INSERT INTO cars (plate_number, brand, model, car_type, seats, image_url, status) VALUES
  ('นก 1234 กรุงเทพมหานคร', 'Toyota', 'Camry',    'รถเก๋ง',        4,  '/images/cars/sedan.svg',   'available'),
  ('ญข 5678 กรุงเทพมหานคร', 'Honda',  'CR-V',     'รถ SUV',        5,  '/images/cars/suv.svg',     'available'),
  ('ฮค 4321 กรุงเทพมหานคร', 'Toyota', 'Commuter', 'รถตู้',         12, '/images/cars/van.svg',     'available'),
  ('กจ 8899 กรุงเทพมหานคร', 'Isuzu',  'D-Max',    'รถกระบะ',       4,  '/images/cars/pickup.svg',  'available'),
  ('ขฉ 2468 กรุงเทพมหานคร', 'Toyota', 'Fortuner', 'รถ SUV',        7,  '/images/cars/suv.svg',     'available'),
  ('ตก 1357 กรุงเทพมหานคร', 'Mitsubishi', 'Mirage', 'รถเก๋ง',      4,  '/images/cars/sedan.svg',   'maintenance');
```
</details>

บัญชีตัวอย่าง (สร้างครั้งแรกเมื่อตาราง users ว่าง): **admin / admin1234** (ผู้ดูแลระบบ), **user / user1234**, **somying / user1234** (ผู้จอง) — เปลี่ยนรหัสผ่านก่อนใช้งานจริง

## ขั้นตอนที่ 3: โครงสร้างโฟลเดอร์
```
ku-car-booking/
├── index.js          # แอปทั้งหมด
├── package.json
├── .env.example
├── .gitignore
└── README.md
```
ภายใน `index.js` แบ่งเป็นส่วน ๆ ตามลำดับ:

| ส่วน | เนื้อหา |
|---|---|
| `ASSETS` | HTML 6 หน้า, CSS ธีมขาวนวล-เขียว ม.เกษตรฯ, JS กลาง, รูปรถ SVG |
| `CREATE_STATEMENTS` | SQL สร้างตาราง users / cars / bookings + ข้อมูลรถตัวอย่าง |
| 1) ฐานข้อมูล | เชื่อมต่อ MySQL (รองรับ `DATABASE_URL`, SSL), สร้างตารางอัตโนมัติ |
| 2) Session | คุกกี้ล็อกอินเซ็นลายเซ็น HMAC (ไม่ต้องเก็บ session ในเซิร์ฟเวอร์ → ใช้กับ Vercel ได้) |
| 3) ตรวจสิทธิ์ | `requireLogin` / `requireUser` / `requireAdmin` |
| 4) ตรรกะการจอง | ตรวจจองซ้ำ, สร้างการจอง (transaction), อนุมัติ/ไม่อนุมัติ |
| 5) ข้อมูลตัวอย่าง | บัญชี + การจองตัวอย่างครั้งแรก |
| 6) Express app | เส้นทางหน้าเว็บ + API (auth, cars, bookings, admin) |

## ขั้นตอนที่ 4: กลไกสำคัญในโค้ด
- **สิทธิ์:** `/admin` และ `/api/admin/*` ผ่าน `requireAdmin` — ผู้ใช้ทั่วไปได้ 403 ทั้งหน้าเว็บและ API; Admin ส่งคำขอจองไม่ได้ (ทำได้แค่ อนุมัติ/ไม่อนุมัติ); สมัครสมาชิกได้เฉพาะ role `user`
- **กันจองซ้ำ:** เช็คว่ารถคันเดียวกันมีรายการ `pending`/`approved` ที่เวลาทับกันหรือไม่ (`เริ่มใหม่ < จบเดิม AND จบใหม่ > เริ่มเดิม`) ถ้าทับ → **ไม่บันทึก** ตอบ 409 พร้อมข้อความ; จองต่อกันพอดีไม่นับว่าซ้ำ; ทำใน transaction + `SELECT … FOR UPDATE` กันกดพร้อมกัน; หน้าจองเช็กให้ทันทีที่เลือกเวลา
- **หน้า `/`:** ปฏิทินการจองที่มีอยู่แล้ว (เขียว = อนุมัติ, เหลือง = รออนุมัติ, ขอบทอง = ของฉัน)
- **หน้า `/book`:** การ์ดรถมี **รูปรถ + ทะเบียน** กรอก **จุดหมายรับ / จุดหมายส่ง** พร้อมกล่องสรุปแบบเรียลไทม์

## ขั้นตอนที่ 5: รันในเครื่อง (VS Code) และทดสอบ
```bash
cp .env.example .env     # Windows: copy .env.example .env   (แก้ DB_PASSWORD / SESSION_SECRET ตามต้องการ)
npm install
npm start
```
เปิด http://localhost:3000 (ใช้ `npm run dev` เพื่อรีสตาร์ทอัตโนมัติเมื่อแก้ไฟล์)

ทดสอบตามลำดับ:
1. ล็อกอิน `user` / `user1234` → เห็นปฏิทินพร้อมการจองตัวอย่าง
2. กด **จองรถ** → เลือกรถ (เห็นรูป + ทะเบียน) → กรอกจุดรับ/ส่ง/เวลา → ส่ง → สถานะ "รออนุมัติ"
3. จองรถคันเดิมเวลาทับกัน → ต้องเห็นแจ้งเตือนสีแดงและไม่ถูกบันทึก
4. ขณะเป็น `user` เปิด http://localhost:3000/admin → ต้องได้หน้า **403**
5. ออกจากระบบ → ล็อกอิน `admin` / `admin1234` → กด **อนุมัติ / ไม่อนุมัติ**
6. กลับไปดูสถานะที่ผู้จอง (เมนู "การจองของฉัน")
7. เปิด http://localhost:3000/api/health ต้องได้ `{"ok":true}`

## ขั้นตอนที่ 6: ภาพหน้าจอ
ดูไฟล์ `ku-screens-mockup.html` ที่ส่งให้แยกต่างหาก (ภาพจำลองทั้ง 6 หน้า: เข้าสู่ระบบ, สมัครสมาชิก, ปฏิทินผู้จอง, จองรถ, การจองของฉัน, Admin Dashboard) — ภาพจริงจับได้เมื่อคุณรันบนเครื่องของคุณ (Win+Shift+S / Cmd+Shift+4)

## ขั้นตอนที่ 7: ขึ้น GitHub และ deploy บน Vercel

### 7.1 อัปโหลดขึ้น GitHub
1. สร้าง repository ใหม่ที่ https://github.com/new (ชื่อ เช่น `ku-car-booking`)
2. **วิธี A — ใช้ Git (Terminal ใน VS Code):**
   ```bash
   git init
   git add .
   git commit -m "KU car booking (single file)"
   git branch -M main
   git remote add origin https://github.com/<ชื่อผู้ใช้>/ku-car-booking.git
   git push -u origin main
   ```
   **วิธี B — ลากไฟล์:** ในหน้า repo กด **Add file → Upload files** แล้วลาก `index.js`, `package.json`, `README.md`, `.gitignore`, `.env.example` ขึ้นไป → Commit
3. **ห้ามอัปโหลด `.env`** (มีรหัสผ่านฐานข้อมูล)

### 7.2 Deploy บน Vercel
1. เข้า https://vercel.com → **Add New… → Project** → เลือก repo `ku-car-booking` → **Import**
2. Framework Preset: Vercel ตรวจเจอ **Express** เอง (ไม่ต้องตั้ง Build/Output) — ถ้าให้เลือกเอง ให้เลือก Express หรือ Other
3. เปิดส่วน **Environment Variables** แล้วเพิ่ม:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | `mysql://user:password@host:port/dbname` (จากผู้ให้บริการ MySQL) |
   | `SESSION_SECRET` | ข้อความสุ่มยาว ๆ อย่างน้อย 32 ตัว |

   (ถ้ารหัสผ่านมีอักขระพิเศษ เช่น `@ : / #` ต้องเข้ารหัสแบบ URL เช่น `@` → `%40`) — ถ้าผู้ให้บริการบังคับ SSL ระบบเปิดให้อัตโนมัติแล้ว; หากเจอ error ใบรับรอง ให้เพิ่ม `DB_SSL_VERIFY=false`
4. กด **Deploy** รอจนเสร็จ → เปิด URL ที่ได้
5. เปิด `https://<โดเมนของคุณ>/api/health` ต้องได้ `{"ok":true}` (ครั้งแรกระบบจะสร้างตารางและข้อมูลตัวอย่างให้เอง)
6. **เปลี่ยนบัญชีตัวอย่างทันที:** สมัครบัญชีใหม่ที่หน้า `/register` แล้วรัน `UPDATE users SET role='admin' WHERE username='ชื่อผู้ใช้ของคุณ';` ในฐานข้อมูล จากนั้นลบบัญชีตัวอย่าง `DELETE FROM users WHERE username IN ('admin','user','somying');`
7. ทุกครั้งที่ push ขึ้น GitHub Vercel จะ deploy ใหม่อัตโนมัติ

> เคล็ดลับ: ตั้ง Function Region ใน Vercel (Settings → Functions) ให้ใกล้กับฐานข้อมูลเพื่อลดความหน่วง

### แก้ปัญหาที่พบบ่อยบน Vercel
| อาการ | วิธีแก้ |
|---|---|
| หน้า "ระบบยังไม่พร้อมใช้งาน" | ยังไม่ได้ตั้ง `DATABASE_URL` / `SESSION_SECRET` หรือเชื่อมต่อฐานข้อมูลไม่ได้ → ดู Logs ใน Vercel (Deployments → Logs) |
| `/api/health` ได้ `{"ok":false}` | ดู Logs ว่าเป็น `ENOTFOUND` (host ผิด), `ER_ACCESS_DENIED` (user/รหัสผิด), `ER_BAD_DB_ERROR` (ยังไม่ได้สร้างฐานข้อมูลชื่อนั้น) |
| error เกี่ยวกับ SSL / certificate | ตั้ง `DB_SSL=true`; ถ้ายังไม่ได้ ให้เพิ่ม `DB_SSL_VERIFY=false` |
| `Too many connections` | ผู้ให้บริการจำกัดจำนวนการเชื่อมต่อ — ระบบจำกัดไว้ 3 ต่ออินสแตนซ์แล้ว ลองเพิ่มแพ็กเกจ/ใช้ connection pooler |
| ล็อกอินแล้วเด้งกลับ | ตรวจว่าตั้ง `SESSION_SECRET` แล้วและเข้าผ่าน https |

## ข้อควรรู้ก่อนใช้งานจริง
- ล็อกอินใช้คุกกี้ที่เซ็นลายเซ็น (อายุ 8 ชั่วโมง) ไม่มี session ฝั่งเซิร์ฟเวอร์ → "ออกจากระบบ" จะล้างคุกกี้ในเบราว์เซอร์นั้น แต่เพิกถอนคุกกี้ที่ถูกคัดลอกไปก่อนหมดอายุไม่ได้; เปลี่ยน `SESSION_SECRET` จะบังคับทุกคนล็อกอินใหม่
- ตัวจำกัดการเดารหัสผ่านเก็บในหน่วยความจำของแต่ละอินสแตนซ์ (บน serverless เป็นการป้องกันเบื้องต้นเท่านั้น)
- ตั้งค่า Vercel Firewall / ใช้ HTTPS เสมอ และสำรองฐานข้อมูลสม่ำเสมอ
