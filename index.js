'use strict';
/**
 * ระบบจองรถยนต์ มหาวิทยาลัยเกษตรศาสตร์ (KU Car Booking) - ไฟล์เดียวจบ
 * -------------------------------------------------------------------
 * - Backend: Node.js + Express + MySQL (mysql2)
 * - Frontend (HTML/CSS/JS/รูปรถ) ฝังอยู่ในไฟล์นี้ทั้งหมด (ดูตัวแปร ASSETS ด้านล่าง)
 * - รันในเครื่อง:  npm install && npm start   ->  http://localhost:3000
 * - Deploy บน Vercel: ไฟล์นี้ export `app` ให้ Vercel เรียกใช้โดยตรง (ไม่ต้องมี vercel.json)
 *
 * ค่าที่ต้องตั้ง (Environment Variables):
 *   DATABASE_URL    mysql://user:password@host:3306/dbname   (หรือใช้ DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME)
 *   SESSION_SECRET  ข้อความสุ่มยาว ๆ (บังคับเมื่อขึ้นโฮสต์จริง)
 *   DB_SSL          true/false  (ค่าเริ่มต้น: เปิดเมื่อขึ้นโฮสต์จริงและฐานข้อมูลไม่ใช่ localhost)
 *   DB_SSL_VERIFY   false  (เฉพาะกรณีผู้ให้บริการใช้ใบรับรองที่ระบบไม่รู้จัก)
 *
 * ตาราง + ข้อมูลรถ + บัญชีตัวอย่างจะถูกสร้างอัตโนมัติเมื่อเชื่อมต่อฐานข้อมูลครั้งแรก
 * (admin / admin1234  และ  user / user1234)
 */
try { require('dotenv').config(); } catch (e) { /* ไม่มี dotenv ก็ไม่เป็นไร (เช่นบน Vercel) */ }
const crypto = require('crypto');
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

// =====================================================================
// Frontend ที่ฝังไว้ในไฟล์นี้ (HTML 6 หน้า + CSS + JS กลาง + รูปรถ SVG)
// แก้ไขหน้าตาเว็บได้ที่นี่ แล้ว commit ขึ้น GitHub -> Vercel จะ deploy ใหม่อัตโนมัติ
// =====================================================================
const ASSETS = {
  css: `/* ธีมระบบจองรถ ม.เกษตรศาสตร์ : สีขาวนวล + เขียวเกษตร */
:root {
  --ku-green: #006664;
  --ku-green-dark: #004b49;
  --ku-green-soft: #e3f0ee;
  --ku-green-mid: #2f8f83;
  --ku-ivory: #fbf9f2;
  --ku-card: #ffffff;
  --ku-border: #e6e2d3;
  --ku-text: #1f2d2c;
  --ku-muted: #6b7a78;
  --ku-gold: #c9a227;

  --bs-primary: var(--ku-green);
  --bs-primary-rgb: 0, 102, 100;
  --bs-body-bg: var(--ku-ivory);
  --bs-body-color: var(--ku-text);
  --bs-body-font-family: 'Sarabun', 'Noto Sans Thai', system-ui, sans-serif;
  --bs-link-color: var(--ku-green);
  --bs-link-hover-color: var(--ku-green-dark);
}

body { background: var(--ku-ivory); font-size: 1rem; }

/* ---------- Navbar ---------- */
.ku-navbar {
  background: linear-gradient(135deg, var(--ku-green-dark), var(--ku-green));
  box-shadow: 0 2px 10px rgba(0, 75, 73, .25);
}
.ku-navbar .navbar-brand { color: #fff; font-weight: 600; letter-spacing: .2px; }
.ku-logo {
  display: inline-grid; place-items: center; width: 38px; height: 38px; border-radius: 10px;
  background: #fff; color: var(--ku-green); font-weight: 700; font-size: 1.05rem; margin-right: .6rem;
  box-shadow: inset 0 0 0 2px var(--ku-gold);
}
.ku-navbar .nav-link { color: rgba(255, 255, 255, .85); border-radius: 8px; padding: .45rem .85rem; margin: 0 .1rem; }
.ku-navbar .nav-link:hover { color: #fff; background: rgba(255, 255, 255, .12); }
.ku-navbar .nav-link.active { color: var(--ku-green-dark); background: #fff; font-weight: 600; }
.ku-navbar .navbar-toggler { border-color: rgba(255, 255, 255, .5); }
.ku-navbar .navbar-toggler-icon { filter: invert(1); }
.ku-user { color: #fff; font-size: .92rem; }
.ku-user small { color: rgba(255, 255, 255, .7); }

/* ---------- Buttons / forms ---------- */
.btn-ku { --bs-btn-bg: var(--ku-green); --bs-btn-border-color: var(--ku-green); --bs-btn-color: #fff;
  --bs-btn-hover-bg: var(--ku-green-dark); --bs-btn-hover-border-color: var(--ku-green-dark); --bs-btn-hover-color: #fff;
  --bs-btn-active-bg: var(--ku-green-dark); --bs-btn-active-border-color: var(--ku-green-dark); --bs-btn-active-color: #fff;
  --bs-btn-disabled-bg: var(--ku-green-mid); --bs-btn-disabled-border-color: var(--ku-green-mid); --bs-btn-disabled-color: #fff; }
.btn-outline-ku { --bs-btn-color: var(--ku-green); --bs-btn-border-color: var(--ku-green);
  --bs-btn-hover-bg: var(--ku-green); --bs-btn-hover-border-color: var(--ku-green); --bs-btn-hover-color: #fff;
  --bs-btn-active-bg: var(--ku-green-dark); --bs-btn-active-color: #fff; }
.form-control:focus, .form-select:focus { border-color: var(--ku-green-mid); box-shadow: 0 0 0 .2rem rgba(0, 102, 100, .15); }
.form-label { font-weight: 500; }

/* ---------- Cards ---------- */
.ku-card { background: var(--ku-card); border: 1px solid var(--ku-border); border-radius: 16px; box-shadow: 0 2px 8px rgba(31, 45, 44, .04); }
.ku-card-header { padding: 1rem 1.25rem; border-bottom: 1px solid var(--ku-border); font-weight: 600; color: var(--ku-green-dark); display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
.ku-card-body { padding: 1.25rem; }
.page-title { color: var(--ku-green-dark); font-weight: 700; margin: 0; }
.page-sub { color: var(--ku-muted); margin: 0; }

.stat-card { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; }
.stat-icon { width: 48px; height: 48px; border-radius: 12px; display: grid; place-items: center; font-size: 1.5rem; background: var(--ku-green-soft); color: var(--ku-green); flex: none; }
.stat-icon.amber { background: #fff4d6; color: #a37b00; }
.stat-icon.red { background: #fde4e4; color: #b42318; }
.stat-icon.grey { background: #eceeee; color: #5b6665; }
.stat-value { font-size: 1.7rem; font-weight: 700; line-height: 1; color: var(--ku-text); }
.stat-label { color: var(--ku-muted); font-size: .9rem; }

/* ---------- Status badges ---------- */
.badge-status { font-weight: 600; padding: .4em .75em; border-radius: 999px; font-size: .8rem; }
.st-pending { background: #fff4d6; color: #8a6700; }
.st-approved { background: #dcf1e7; color: #0b6b43; }
.st-rejected { background: #fde4e4; color: #b42318; }
.st-cancelled { background: #eceeee; color: #5b6665; }

/* ---------- Login / Register ---------- */
.auth-wrap { min-height: 100vh; display: grid; place-items: center; padding: 1.5rem;
  background:
    radial-gradient(circle at 15% 10%, rgba(0, 102, 100, .12), transparent 45%),
    radial-gradient(circle at 90% 90%, rgba(201, 162, 39, .12), transparent 40%),
    var(--ku-ivory); }
.auth-card { width: 100%; max-width: 440px; }
.auth-head { background: linear-gradient(135deg, var(--ku-green-dark), var(--ku-green)); color: #fff; text-align: center; padding: 1.75rem 1rem 1.4rem; border-radius: 16px 16px 0 0; }
.auth-head .ku-logo { width: 62px; height: 62px; font-size: 1.6rem; margin: 0 0 .6rem; border-radius: 16px; }
.auth-head h1 { font-size: 1.35rem; margin: 0; font-weight: 700; }
.auth-head p { margin: .2rem 0 0; opacity: .85; font-size: .92rem; }

/* ---------- Calendar ---------- */
.fc { --fc-border-color: var(--ku-border); --fc-today-bg-color: #f1f7e8; --fc-button-bg-color: var(--ku-green); --fc-button-border-color: var(--ku-green);
  --fc-button-hover-bg-color: var(--ku-green-dark); --fc-button-hover-border-color: var(--ku-green-dark);
  --fc-button-active-bg-color: var(--ku-green-dark); --fc-button-active-border-color: var(--ku-green-dark); font-family: inherit; }
.fc .fc-toolbar-title { font-size: 1.25rem; font-weight: 700; color: var(--ku-green-dark); }
.fc .fc-button { text-transform: none; font-size: .9rem; }
.fc .fc-daygrid-event, .fc .fc-timegrid-event, .fc .fc-list-event { cursor: pointer; border-radius: 6px; }
.fc .fc-event { font-size: .8rem; }
.fc-event.ev-approved { background: var(--ku-green); border-color: var(--ku-green); color: #fff; }
.fc-event.ev-pending { background: #f4c542; border-color: #e0b02e; color: #4a3800; }
.fc-event.ev-mine { box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--ku-gold); }
.legend-dot { display: inline-block; width: 12px; height: 12px; border-radius: 4px; margin-right: .35rem; vertical-align: -1px; }

/* ---------- Car picker ---------- */
.car-option { cursor: pointer; border: 2px solid var(--ku-border); border-radius: 14px; background: #fff; overflow: hidden; transition: .15s; height: 100%; position: relative; }
.car-option:hover { border-color: var(--ku-green-mid); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0, 102, 100, .12); }
.car-option.selected { border-color: var(--ku-green); box-shadow: 0 0 0 3px rgba(0, 102, 100, .18); }
.car-option.selected::after { content: '\\F26A'; font-family: 'bootstrap-icons'; position: absolute; top: 8px; right: 10px; color: var(--ku-green); font-size: 1.4rem; background: #fff; border-radius: 50%; line-height: 1; }
.car-option.disabled { opacity: .55; cursor: not-allowed; filter: grayscale(.6); }
.car-option.disabled:hover { transform: none; box-shadow: none; border-color: var(--ku-border); }
.car-thumb { background: linear-gradient(180deg, #f3f8f6, #e8f1ee); aspect-ratio: 16 / 9; display: grid; place-items: center; }
.car-thumb img { width: 100%; height: 100%; object-fit: contain; padding: .5rem; }
.car-info { padding: .75rem .9rem; }
.car-plate { font-weight: 700; color: var(--ku-green-dark); font-size: 1.02rem; }
.car-meta { color: var(--ku-muted); font-size: .88rem; }

.summary-img { background: linear-gradient(180deg, #f3f8f6, #e8f1ee); border-radius: 12px; aspect-ratio: 16 / 9; display: grid; place-items: center; overflow: hidden; }
.summary-img img { width: 100%; height: 100%; object-fit: contain; padding: .5rem; }
.route-line { display: flex; gap: .6rem; align-items: stretch; }
.route-dots { display: flex; flex-direction: column; align-items: center; padding-top: .35rem; }
.route-dots i { color: var(--ku-green); font-size: .9rem; }
.route-dots .bar { flex: 1; width: 2px; background: repeating-linear-gradient(var(--ku-green-mid) 0 4px, transparent 4px 8px); margin: .15rem 0; }
.route-text .lbl { color: var(--ku-muted); font-size: .8rem; }
.route-text .val { font-weight: 500; min-height: 1.4em; word-break: break-word; }

.avail-msg { border-radius: 10px; padding: .6rem .85rem; font-size: .92rem; display: none; }
.avail-msg.ok { display: block; background: #dcf1e7; color: #0b6b43; }
.avail-msg.bad { display: block; background: #fde4e4; color: #b42318; }
.avail-msg.info { display: block; background: var(--ku-green-soft); color: var(--ku-green-dark); }

/* ---------- Tables ---------- */
.table-ku thead th { background: var(--ku-green-soft); color: var(--ku-green-dark); font-weight: 600; border-bottom: 2px solid var(--ku-green); white-space: nowrap; }
.table-ku td { vertical-align: middle; }
.table-thumb { width: 72px; height: 44px; object-fit: contain; background: #eef5f3; border-radius: 8px; }
.empty-state { text-align: center; color: var(--ku-muted); padding: 2.5rem 1rem; }
.empty-state i { font-size: 2.4rem; display: block; margin-bottom: .4rem; color: var(--ku-green-mid); }

.nav-pills-ku .nav-link { color: var(--ku-green-dark); border-radius: 999px; }
.nav-pills-ku .nav-link.active { background: var(--ku-green); color: #fff; }

footer.ku-footer { color: var(--ku-muted); font-size: .85rem; text-align: center; padding: 1.5rem 0 2rem; }
`,
  commonJs: `// ฟังก์ชันที่ใช้ร่วมกันทุกหน้า: เรียก API, วันที่ภาษาไทย, Navbar, Toast
(function () {
  const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const STATUS = {
    pending: { text: 'รออนุมัติ', cls: 'st-pending', icon: 'bi-hourglass-split' },
    approved: { text: 'อนุมัติแล้ว', cls: 'st-approved', icon: 'bi-check-circle-fill' },
    rejected: { text: 'ไม่อนุมัติ', cls: 'st-rejected', icon: 'bi-x-circle-fill' },
    cancelled: { text: 'ยกเลิก', cls: 'st-cancelled', icon: 'bi-slash-circle' }
  };

  // ป้องกัน XSS: ครอบข้อความจากผู้ใช้ทุกครั้งก่อนใส่ลง innerHTML
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function api(url, options = {}) {
    const init = { credentials: 'same-origin', headers: {}, method: options.method || 'GET' };
    if (options.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(options.body);
    }
    let res;
    try { res = await fetch(url, init); }
    catch (e) { throw Object.assign(new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบว่าเซิร์ฟเวอร์ทำงานอยู่'), { status: 0 }); }
    let data = null;
    try { data = await res.json(); } catch (e) { /* ไม่มี body */ }
    if (res.status === 401 && !options.noRedirect) { location.href = '/login'; throw Object.assign(new Error('กรุณาเข้าสู่ระบบ'), { status: 401 }); }
    if (!res.ok) throw Object.assign(new Error((data && data.message) || 'เกิดข้อผิดพลาด'), { status: res.status, data });
    return data;
  }

  const pad = (n) => String(n).padStart(2, '0');
  function parts(s) {
    const m = String(s || '').match(/(\\d{4})-(\\d{2})-(\\d{2})[T ](\\d{2}):(\\d{2})/);
    return m ? { y: +m[1], mo: +m[2], d: +m[3], h: m[4], mi: m[5] } : null;
  }
  function fmtDate(s) { const p = parts(s); return p ? \`\${p.d} \${MONTHS[p.mo - 1]} \${p.y + 543}\` : '-'; }
  function fmtTime(s) { const p = parts(s); return p ? \`\${p.h}:\${p.mi}\` : '-'; }
  function fmtDT(s) { const p = parts(s); return p ? \`\${fmtDate(s)} \${p.h}:\${p.mi} น.\` : '-'; }
  function fmtRange(a, b) {
    const pa = parts(a), pb = parts(b);
    if (!pa || !pb) return '-';
    if (pa.y === pb.y && pa.mo === pb.mo && pa.d === pb.d) return \`\${fmtDate(a)} \${pa.h}:\${pa.mi} - \${pb.h}:\${pb.mi} น.\`;
    return \`\${fmtDT(a)} ถึง \${fmtDT(b)}\`;
  }
  // "YYYY-MM-DDTHH:mm" ตามเวลาเครื่อง สำหรับ <input type="datetime-local">
  function localInputValue(d) {
    return \`\${d.getFullYear()}-\${pad(d.getMonth() + 1)}-\${pad(d.getDate())}T\${pad(d.getHours())}:\${pad(d.getMinutes())}\`;
  }

  function statusBadge(status) {
    const s = STATUS[status] || { text: status, cls: 'st-cancelled', icon: 'bi-question-circle' };
    return \`<span class="badge-status \${s.cls}"><i class="bi \${s.icon} me-1"></i>\${s.text}</span>\`;
  }

  function toast(message, type = 'success') {
    let box = document.getElementById('toastBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toastBox';
      box.className = 'toast-container position-fixed top-0 end-0 p-3';
      box.style.zIndex = 2000;
      document.body.appendChild(box);
    }
    const colors = { success: 'text-bg-success', danger: 'text-bg-danger', warning: 'text-bg-warning', info: 'text-bg-info' };
    const icons = { success: 'bi-check-circle-fill', danger: 'bi-exclamation-triangle-fill', warning: 'bi-exclamation-circle-fill', info: 'bi-info-circle-fill' };
    const el = document.createElement('div');
    el.className = \`toast align-items-center border-0 \${colors[type] || colors.info}\`;
    el.setAttribute('role', 'alert');
    el.innerHTML = \`<div class="d-flex"><div class="toast-body"><i class="bi \${icons[type] || icons.info} me-2"></i>\${esc(message)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>\`;
    box.appendChild(el);
    const t = new bootstrap.Toast(el, { delay: type === 'danger' ? 6000 : 3500 });
    el.addEventListener('hidden.bs.toast', () => el.remove());
    t.show();
  }

  function carImage(url) { return esc(url || '/images/cars/sedan.svg'); }

  // ตรวจสิทธิ์ฝั่งหน้าเว็บ + วาด Navbar  (ฝั่งเซิร์ฟเวอร์ตรวจสิทธิ์จริงอีกชั้นเสมอ)
  async function initPage(active, requiredRole) {
    const { user } = await api('/api/auth/me');
    if (requiredRole && user.role !== requiredRole) { location.href = user.role === 'admin' ? '/admin' : '/'; return new Promise(() => {}); }
    const links = user.role === 'admin'
      ? [{ href: '/admin', key: 'admin', icon: 'bi-speedometer2', text: 'Admin Dashboard' }]
      : [{ href: '/', key: 'home', icon: 'bi-calendar3', text: 'ปฏิทินการจอง' },
         { href: '/book', key: 'book', icon: 'bi-car-front-fill', text: 'จองรถ' },
         { href: '/my-bookings', key: 'mine', icon: 'bi-list-check', text: 'การจองของฉัน' }];
    const nav = document.getElementById('navbar');
    if (nav) {
      nav.innerHTML = \`
      <nav class="navbar navbar-expand-lg ku-navbar sticky-top">
        <div class="container">
          <a class="navbar-brand d-flex align-items-center" href="\${user.role === 'admin' ? '/admin' : '/'}">
            <span class="ku-logo">KU</span><span>ระบบจองรถ <span class="d-none d-sm-inline">มหาวิทยาลัยเกษตรศาสตร์</span></span>
          </a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu"><span class="navbar-toggler-icon"></span></button>
          <div class="collapse navbar-collapse" id="navMenu">
            <ul class="navbar-nav me-auto mt-2 mt-lg-0">
              \${links.map((l) => \`<li class="nav-item"><a class="nav-link \${l.key === active ? 'active' : ''}" href="\${l.href}"><i class="bi \${l.icon} me-1"></i>\${l.text}</a></li>\`).join('')}
            </ul>
            <div class="d-flex align-items-center gap-3 mt-2 mt-lg-0">
              <div class="ku-user text-lg-end"><div><i class="bi bi-person-circle me-1"></i>\${esc(user.full_name)}</div>
                <small>\${user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้จอง'}</small></div>
              <button class="btn btn-sm btn-light" id="btnLogout"><i class="bi bi-box-arrow-right me-1"></i>ออกจากระบบ</button>
            </div>
          </div>
        </div>
      </nav>\`;
      document.getElementById('btnLogout').addEventListener('click', async () => {
        try { await api('/api/auth/logout', { method: 'POST', body: {} }); } finally { location.href = '/login'; }
      });
    }
    return user;
  }

  window.KU = { api, esc, fmtDate, fmtTime, fmtDT, fmtRange, localInputValue, statusBadge, toast, initPage, carImage };
})();
`,
  svg: {
    sedan: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225" role="img" aria-label="รถเก๋ง">
  <ellipse cx="200" cy="196" rx="158" ry="9" fill="#1f2d2c" opacity=".14"/>
  <path d="M34 162 V138 Q34 124 50 120 L108 108 L138 80 Q146 72 158 72 H248 Q262 72 272 82 L300 108 L348 114 Q368 118 368 138 V162 Q368 171 358 171 H44 Q34 171 34 162 Z" fill="#f4f7f6" stroke="#8fa5a2" stroke-width="3" stroke-linejoin="round"/>
  <path d="M120 106 L146 84 Q150 80 158 80 H200 V106 Z" fill="#bfe0e6" stroke="#8fa5a2" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M210 80 H246 Q254 80 260 86 L284 106 H210 Z" fill="#bfe0e6" stroke="#8fa5a2" stroke-width="2.5" stroke-linejoin="round"/>
  <rect x="34" y="138" width="334" height="9" fill="#006664" opacity=".85"/>
  <rect x="352" y="124" width="16" height="10" rx="3" fill="#ffe9a8" stroke="#c9a227" stroke-width="1.5"/>
  <rect x="34" y="124" width="12" height="10" rx="3" fill="#e5564b"/>
  <rect x="208" y="120" width="18" height="4" rx="2" fill="#8fa5a2"/>
  <circle cx="112" cy="171" r="27" fill="#2b3433"/>
  <circle cx="112" cy="171" r="14" fill="#c9d3d1"/>
  <circle cx="112" cy="171" r="5" fill="#6b7a78"/>
  <circle cx="296" cy="171" r="27" fill="#2b3433"/>
  <circle cx="296" cy="171" r="14" fill="#c9d3d1"/>
  <circle cx="296" cy="171" r="5" fill="#6b7a78"/>
</svg>`,
    suv: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225" role="img" aria-label="รถ SUV">
  <ellipse cx="200" cy="198" rx="162" ry="9" fill="#1f2d2c" opacity=".14"/>
  <path d="M30 166 V132 Q30 118 46 114 L92 106 L120 70 Q128 62 142 62 H282 Q296 62 304 72 L322 104 L352 110 Q372 114 372 134 V166 Q372 175 362 175 H40 Q30 175 30 166 Z" fill="#3d4b4a" stroke="#222c2b" stroke-width="3" stroke-linejoin="round"/>
  <path d="M104 104 L128 74 Q132 70 142 70 H190 V104 Z" fill="#a9ccd3" stroke="#222c2b" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M200 70 H278 Q286 70 291 78 L306 104 H200 Z" fill="#a9ccd3" stroke="#222c2b" stroke-width="2.5" stroke-linejoin="round"/>
  <rect x="120" y="58" width="168" height="5" rx="2.5" fill="#222c2b"/>
  <rect x="30" y="136" width="342" height="8" fill="#c9a227" opacity=".9"/>
  <rect x="354" y="122" width="18" height="11" rx="3" fill="#ffe9a8" stroke="#c9a227" stroke-width="1.5"/>
  <rect x="30" y="120" width="12" height="11" rx="3" fill="#e5564b"/>
  <rect x="200" y="118" width="20" height="4" rx="2" fill="#c9d3d1"/>
  <circle cx="106" cy="175" r="27" fill="#2b3433"/>
  <circle cx="106" cy="175" r="14" fill="#c9d3d1"/>
  <circle cx="106" cy="175" r="5" fill="#6b7a78"/>
  <circle cx="300" cy="175" r="27" fill="#2b3433"/>
  <circle cx="300" cy="175" r="14" fill="#c9d3d1"/>
  <circle cx="300" cy="175" r="5" fill="#6b7a78"/>
</svg>`,
    van: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225" role="img" aria-label="รถตู้">
  <ellipse cx="200" cy="198" rx="165" ry="9" fill="#1f2d2c" opacity=".14"/>
  <path d="M26 168 V80 Q26 62 44 62 H284 Q300 62 308 74 L336 112 L362 118 Q376 121 376 138 V168 Q376 176 367 176 H35 Q26 176 26 168 Z" fill="#f7f9f9" stroke="#8fa5a2" stroke-width="3" stroke-linejoin="round"/>
  <g fill="#bfe0e6" stroke="#8fa5a2" stroke-width="2.5" stroke-linejoin="round">
    <rect x="42" y="76" width="52" height="34" rx="5"/>
    <rect x="102" y="76" width="52" height="34" rx="5"/>
    <rect x="162" y="76" width="52" height="34" rx="5"/>
    <rect x="222" y="76" width="52" height="34" rx="5"/>
    <path d="M282 76 H296 Q302 76 306 82 L322 110 H282 Z"/>
  </g>
  <rect x="26" y="130" width="350" height="10" fill="#006664" opacity=".9"/>
  <rect x="26" y="142" width="350" height="4" fill="#c9a227"/>
  <rect x="358" y="124" width="18" height="11" rx="3" fill="#ffe9a8" stroke="#c9a227" stroke-width="1.5"/>
  <rect x="26" y="116" width="10" height="12" rx="3" fill="#e5564b"/>
  <line x1="162" y1="112" x2="162" y2="168" stroke="#8fa5a2" stroke-width="2"/>
  <circle cx="96" cy="176" r="27" fill="#2b3433"/>
  <circle cx="96" cy="176" r="14" fill="#c9d3d1"/>
  <circle cx="96" cy="176" r="5" fill="#6b7a78"/>
  <circle cx="304" cy="176" r="27" fill="#2b3433"/>
  <circle cx="304" cy="176" r="14" fill="#c9d3d1"/>
  <circle cx="304" cy="176" r="5" fill="#6b7a78"/>
</svg>`,
    pickup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225" role="img" aria-label="รถกระบะ">
  <ellipse cx="200" cy="198" rx="164" ry="9" fill="#1f2d2c" opacity=".14"/>
  <path d="M26 168 V120 Q26 112 34 112 H176 V74 Q176 66 184 66 H252 Q262 66 270 76 L292 106 L350 112 Q372 115 372 136 V168 Q372 176 363 176 H35 Q26 176 26 168 Z" fill="#c9d6dd" stroke="#7f939b" stroke-width="3" stroke-linejoin="round"/>
  <path d="M186 76 H250 Q256 76 261 82 L278 106 H186 Z" fill="#a9ccd3" stroke="#7f939b" stroke-width="2.5" stroke-linejoin="round"/>
  <rect x="34" y="118" width="136" height="42" fill="#b3c3cb" stroke="#7f939b" stroke-width="2.5"/>
  <rect x="26" y="134" width="346" height="8" fill="#006664" opacity=".85"/>
  <rect x="354" y="122" width="18" height="11" rx="3" fill="#ffe9a8" stroke="#c9a227" stroke-width="1.5"/>
  <rect x="26" y="120" width="10" height="10" rx="3" fill="#e5564b"/>
  <rect x="186" y="118" width="18" height="4" rx="2" fill="#7f939b"/>
  <circle cx="90" cy="176" r="27" fill="#2b3433"/>
  <circle cx="90" cy="176" r="14" fill="#c9d3d1"/>
  <circle cx="90" cy="176" r="5" fill="#6b7a78"/>
  <circle cx="300" cy="176" r="27" fill="#2b3433"/>
  <circle cx="300" cy="176" r="14" fill="#c9d3d1"/>
  <circle cx="300" cy="176" r="5" fill="#6b7a78"/>
</svg>`,
  },
  pages: {
    'login': `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
<link href="/css/style.css" rel="stylesheet">
<title>เข้าสู่ระบบ | ระบบจองรถ ม.เกษตรศาสตร์</title>
</head>
<body>
<div class="auth-wrap">
  <div class="auth-card ku-card" style="overflow:hidden">
    <div class="auth-head">
      <div class="ku-logo">KU</div>
      <h1>ระบบจองรถยนต์</h1>
      <p>มหาวิทยาลัยเกษตรศาสตร์</p>
    </div>
    <div class="ku-card-body p-4">
      <div id="alertBox" class="alert alert-danger py-2 d-none"></div>
      <form id="loginForm" novalidate>
        <div class="mb-3">
          <label class="form-label" for="username">ชื่อผู้ใช้</label>
          <div class="input-group">
            <span class="input-group-text"><i class="bi bi-person"></i></span>
            <input type="text" class="form-control" id="username" autocomplete="username" required autofocus>
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label" for="password">รหัสผ่าน</label>
          <div class="input-group">
            <span class="input-group-text"><i class="bi bi-lock"></i></span>
            <input type="password" class="form-control" id="password" autocomplete="current-password" required>
          </div>
        </div>
        <button class="btn btn-ku w-100 py-2" id="btnLogin" type="submit"><i class="bi bi-box-arrow-in-right me-1"></i>เข้าสู่ระบบ</button>
      </form>
      <div class="text-center mt-3">ยังไม่มีบัญชี? <a href="/register">สมัครสมาชิก</a></div>
      <div class="mt-4 p-3 rounded-3" style="background:var(--ku-green-soft);font-size:.88rem">
        <div class="fw-semibold mb-1" style="color:var(--ku-green-dark)"><i class="bi bi-info-circle me-1"></i>บัญชีสำหรับทดสอบ</div>
        ผู้ดูแลระบบ: <code>admin</code> / <code>admin1234</code><br>
        ผู้จองทั่วไป: <code>user</code> / <code>user1234</code>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="/js/common.js"></script>
<script>
  const box = document.getElementById('alertBox');
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    box.classList.add('d-none');
    const btn = document.getElementById('btnLogin');
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    if (!username || !password) {
      box.textContent = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน';
      box.classList.remove('d-none');
      return;
    }
    btn.disabled = true;
    try {
      const data = await KU.api('/api/auth/login', { method: 'POST', body: { username, password }, noRedirect: true });
      location.href = data.redirect;
    } catch (err) {
      box.textContent = err.message;
      box.classList.remove('d-none');
      btn.disabled = false;
    }
  });
</script>
</body>
</html>
`,
    'register': `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
<link href="/css/style.css" rel="stylesheet">
<title>สมัครสมาชิก | ระบบจองรถ ม.เกษตรศาสตร์</title>
</head>
<body>
<div class="auth-wrap">
  <div class="auth-card ku-card" style="overflow:hidden;max-width:520px">
    <div class="auth-head">
      <div class="ku-logo">KU</div>
      <h1>สมัครสมาชิกผู้จองรถ</h1>
      <p>ระบบจองรถยนต์ มหาวิทยาลัยเกษตรศาสตร์</p>
    </div>
    <div class="ku-card-body p-4">
      <div id="alertBox" class="alert alert-danger py-2 d-none"></div>
      <form id="regForm" novalidate>
        <div class="row g-3">
          <div class="col-12">
            <label class="form-label" for="full_name">ชื่อ-นามสกุล <span class="text-danger">*</span></label>
            <input type="text" class="form-control" id="full_name" required>
          </div>
          <div class="col-12">
            <label class="form-label" for="department">หน่วยงาน / คณะ / ภาควิชา</label>
            <input type="text" class="form-control" id="department" placeholder="เช่น คณะวิทยาศาสตร์ ภาควิชาเคมี">
          </div>
          <div class="col-md-6">
            <label class="form-label" for="phone">เบอร์โทรศัพท์</label>
            <input type="tel" class="form-control" id="phone" placeholder="08x-xxx-xxxx">
          </div>
          <div class="col-md-6">
            <label class="form-label" for="username">ชื่อผู้ใช้ <span class="text-danger">*</span></label>
            <input type="text" class="form-control" id="username" autocomplete="username" placeholder="อังกฤษ/ตัวเลข 4-30 ตัว" required>
          </div>
          <div class="col-md-6">
            <label class="form-label" for="password">รหัสผ่าน <span class="text-danger">*</span></label>
            <input type="password" class="form-control" id="password" autocomplete="new-password" placeholder="อย่างน้อย 6 ตัวอักษร" required>
          </div>
          <div class="col-md-6">
            <label class="form-label" for="password2">ยืนยันรหัสผ่าน <span class="text-danger">*</span></label>
            <input type="password" class="form-control" id="password2" autocomplete="new-password" required>
          </div>
        </div>
        <button class="btn btn-ku w-100 py-2 mt-4" id="btnReg" type="submit"><i class="bi bi-person-plus me-1"></i>สมัครสมาชิก</button>
      </form>
      <div class="text-center mt-3">มีบัญชีอยู่แล้ว? <a href="/login">เข้าสู่ระบบ</a></div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="/js/common.js"></script>
<script>
  const box = document.getElementById('alertBox');
  const val = (id) => document.getElementById(id).value;
  function fail(msg) { box.textContent = msg; box.classList.remove('d-none'); }
  document.getElementById('regForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    box.classList.add('d-none');
    if (!val('full_name').trim() || !val('username').trim() || !val('password')) return fail('กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบ');
    if (val('password') !== val('password2')) return fail('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
    const btn = document.getElementById('btnReg');
    btn.disabled = true;
    try {
      await KU.api('/api/auth/register', { method: 'POST', noRedirect: true, body: {
        full_name: val('full_name'), department: val('department'), phone: val('phone'),
        username: val('username'), password: val('password')
      }});
      KU.toast('สมัครสมาชิกสำเร็จ กำลังไปหน้าเข้าสู่ระบบ...');
      setTimeout(() => { location.href = '/login'; }, 1200);
    } catch (err) {
      fail(err.message);
      btn.disabled = false;
    }
  });
</script>
</body>
</html>
`,
    'index': `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
<link href="/css/style.css" rel="stylesheet">
<title>ปฏิทินการจอง | ระบบจองรถ ม.เกษตรศาสตร์</title>
</head>
<body>
<div id="navbar"></div>

<main class="container py-4">
  <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
    <div>
      <h2 class="page-title"><i class="bi bi-calendar3 me-2"></i>ปฏิทินการจองรถ</h2>
      <p class="page-sub" id="welcome">ตรวจสอบตารางรถว่างก่อนทำการจอง</p>
    </div>
    <a href="/book" class="btn btn-ku btn-lg"><i class="bi bi-plus-circle me-1"></i>จองรถ</a>
  </div>

  <!-- สรุปตัวเลข -->
  <div class="row g-3 mb-4">
    <div class="col-6 col-lg-3"><div class="ku-card stat-card"><div class="stat-icon"><i class="bi bi-car-front"></i></div><div><div class="stat-value" id="stCars">-</div><div class="stat-label">รถที่เปิดให้จอง</div></div></div></div>
    <div class="col-6 col-lg-3"><div class="ku-card stat-card"><div class="stat-icon"><i class="bi bi-check2-circle"></i></div><div><div class="stat-value" id="stFree">-</div><div class="stat-label">ว่างในขณะนี้</div></div></div></div>
    <div class="col-6 col-lg-3"><div class="ku-card stat-card"><div class="stat-icon amber"><i class="bi bi-hourglass-split"></i></div><div><div class="stat-value" id="stPending">-</div><div class="stat-label">การจองของฉัน (รออนุมัติ)</div></div></div></div>
    <div class="col-6 col-lg-3"><div class="ku-card stat-card"><div class="stat-icon"><i class="bi bi-patch-check"></i></div><div><div class="stat-value" id="stApproved">-</div><div class="stat-label">การจองของฉัน (อนุมัติแล้ว)</div></div></div></div>
  </div>

  <!-- ปฏิทิน -->
  <div class="ku-card">
    <div class="ku-card-header">
      <span><i class="bi bi-calendar-week me-1"></i>ตารางการจองที่มีอยู่แล้ว</span>
      <div class="ms-auto d-flex flex-wrap align-items-center gap-3">
        <span class="small"><span class="legend-dot" style="background:var(--ku-green)"></span>อนุมัติแล้ว</span>
        <span class="small"><span class="legend-dot" style="background:#f4c542"></span>รออนุมัติ</span>
        <span class="small"><span class="legend-dot" style="background:#fff;box-shadow:0 0 0 2px var(--ku-gold)"></span>ของฉัน</span>
        <select id="carFilter" class="form-select form-select-sm" style="width:auto;min-width:220px">
          <option value="">รถทุกคัน</option>
        </select>
      </div>
    </div>
    <div class="ku-card-body">
      <div id="calendar"></div>
    </div>
  </div>
  <p class="text-center text-muted small mt-3 mb-0"><i class="bi bi-info-circle me-1"></i>คลิกที่ช่องวันที่ในปฏิทินเพื่อเริ่มจองรถในวันนั้น หรือคลิกที่รายการเพื่อดูรายละเอียด</p>
</main>
<footer class="ku-footer">ระบบจองรถยนต์ มหาวิทยาลัยเกษตรศาสตร์</footer>

<!-- รายละเอียดการจอง -->
<div class="modal fade" id="eventModal" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header"><h5 class="modal-title"><i class="bi bi-car-front-fill me-2" style="color:var(--ku-green)"></i>รายละเอียดการจอง</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
      <div class="modal-body" id="eventBody"></div>
      <div class="modal-footer"><button class="btn btn-outline-secondary" data-bs-dismiss="modal">ปิด</button></div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/locales-all.global.min.js"></script>
<script src="/js/common.js"></script>
<script>
(async function () {
  const user = await KU.initPage('home', 'user');
  document.getElementById('welcome').textContent = 'สวัสดี ' + user.full_name + ' - ตรวจสอบตารางรถว่างก่อนทำการจอง';

  let cars = [];
  let events = [];

  try {
    [cars, events] = await Promise.all([KU.api('/api/cars'), KU.api('/api/bookings/calendar')]);
  } catch (err) { KU.toast(err.message, 'danger'); }

  // ตัวกรองรถ
  const filter = document.getElementById('carFilter');
  cars.forEach((c) => {
    const o = document.createElement('option');
    o.value = c.id;
    o.textContent = c.plate_number.split(' ').slice(0, 2).join(' ') + ' - ' + c.brand + ' ' + c.model;
    filter.appendChild(o);
  });

  // ตัวเลขสรุป
  const now = new Date();
  const available = cars.filter((c) => c.status === 'available');
  const busyIds = new Set(events.filter((e) => new Date(e.start) <= now && now < new Date(e.end)).map((e) => e.car_id));
  document.getElementById('stCars').textContent = available.length;
  document.getElementById('stFree').textContent = available.filter((c) => !busyIds.has(c.id)).length;
  try {
    const mine = await KU.api('/api/bookings/mine');
    document.getElementById('stPending').textContent = mine.filter((b) => b.status === 'pending').length;
    document.getElementById('stApproved').textContent = mine.filter((b) => b.status === 'approved').length;
  } catch (e) { /* ข้ามได้ */ }

  const shortPlate = (p) => p.split(' ').slice(0, 2).join(' ');
  const modal = new bootstrap.Modal(document.getElementById('eventModal'));

  const calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
    locale: 'th',
    initialView: 'dayGridMonth',
    height: 'auto',
    firstDay: 0,
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listWeek' },
    buttonText: { today: 'วันนี้', month: 'เดือน', week: 'สัปดาห์', list: 'รายการ' },
    noEventsText: 'ไม่มีการจองในช่วงนี้',
    dayMaxEvents: 3,
    moreLinkText: (n) => '+อีก ' + n + ' รายการ',
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    events: (info, success) => {
      const carId = filter.value;
      success(events.filter((e) => !carId || String(e.car_id) === carId).map((e) => ({
        id: e.id,
        title: shortPlate(e.plate_number) + ' ' + e.car_name,
        start: e.start,
        end: e.end,
        classNames: ['ev-' + e.status].concat(e.mine ? ['ev-mine'] : []),
        extendedProps: e
      })));
    },
    dateClick: (info) => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (info.date < today) { KU.toast('ไม่สามารถจองย้อนหลังได้', 'warning'); return; }
      location.href = '/book?date=' + info.dateStr.slice(0, 10) + (filter.value ? '&car_id=' + filter.value : '');
    },
    eventClick: (info) => {
      const e = info.event.extendedProps;
      document.getElementById('eventBody').innerHTML =
        '<div class="mb-2">' + KU.statusBadge(e.status) + (e.mine ? ' <span class="badge text-bg-warning ms-1">การจองของฉัน</span>' : '') + '</div>' +
        '<dl class="row mb-0">' +
        '<dt class="col-4">รถ</dt><dd class="col-8">' + KU.esc(e.car_name) + '</dd>' +
        '<dt class="col-4">ทะเบียน</dt><dd class="col-8 fw-semibold">' + KU.esc(e.plate_number) + '</dd>' +
        '<dt class="col-4">ช่วงเวลา</dt><dd class="col-8">' + KU.esc(KU.fmtRange(e.start, e.end)) + '</dd>' +
        (e.mine ? '<dt class="col-4">จุดรับ</dt><dd class="col-8">' + KU.esc(e.pickup_location) + '</dd>' +
                  '<dt class="col-4">จุดส่ง</dt><dd class="col-8">' + KU.esc(e.dropoff_location) + '</dd>' : '') +
        '</dl>';
      modal.show();
    }
  });
  calendar.render();
  filter.addEventListener('change', () => calendar.refetchEvents());
})();
</script>
</body>
</html>
`,
    'book': `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
<link href="/css/style.css" rel="stylesheet">
<title>จองรถ | ระบบจองรถ ม.เกษตรศาสตร์</title>
</head>
<body>
<div id="navbar"></div>

<main class="container py-4">
  <div class="mb-4">
    <h2 class="page-title"><i class="bi bi-car-front-fill me-2"></i>จองรถยนต์</h2>
    <p class="page-sub">เลือกรถ ระบุเส้นทางและช่วงเวลา ระบบจะตรวจสอบการจองซ้ำให้ทันที</p>
  </div>

  <form id="bookForm" novalidate>
    <div class="row g-4">
      <!-- ซ้าย: เลือกรถ -->
      <div class="col-lg-7">
        <div class="ku-card mb-4">
          <div class="ku-card-header"><i class="bi bi-1-circle-fill"></i>เลือกรถที่ต้องการจอง</div>
          <div class="ku-card-body">
            <div class="row g-3" id="carGrid">
              <div class="col-12 empty-state">กำลังโหลดรายการรถ...</div>
            </div>
          </div>
        </div>

        <div class="ku-card">
          <div class="ku-card-header"><i class="bi bi-calendar-x"></i>ช่วงเวลาที่รถคันที่เลือกถูกจองแล้ว</div>
          <div class="ku-card-body" id="busyList"><span class="text-muted">กรุณาเลือกรถก่อน</span></div>
        </div>
      </div>

      <!-- ขวา: ข้อมูลการจอง -->
      <div class="col-lg-5">
        <div class="ku-card" style="position:sticky;top:84px">
          <div class="ku-card-header"><i class="bi bi-2-circle-fill"></i>ข้อมูลการจอง</div>
          <div class="ku-card-body">

            <!-- สรุป: รูปรถ ทะเบียน จุดรับ จุดส่ง -->
            <div class="summary-img mb-3"><img id="sumImg" src="/images/cars/sedan.svg" alt="รถที่เลือก" style="opacity:.35"></div>
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div>
                <div class="car-plate" id="sumPlate">ยังไม่ได้เลือกรถ</div>
                <div class="car-meta" id="sumName">เลือกรถจากรายการด้านซ้าย</div>
              </div>
              <span class="badge text-bg-light border" id="sumSeats" style="display:none"></span>
            </div>
            <div class="route-line mb-3 p-3 rounded-3" style="background:var(--ku-green-soft)">
              <div class="route-dots"><i class="bi bi-geo-alt-fill"></i><div class="bar"></div><i class="bi bi-flag-fill"></i></div>
              <div class="route-text flex-grow-1">
                <div class="lbl">จุดหมายรับ</div><div class="val" id="sumPickup">-</div>
                <div class="lbl mt-2">จุดหมายส่ง</div><div class="val" id="sumDropoff">-</div>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label" for="pickup">จุดหมายรับ <span class="text-danger">*</span></label>
              <input class="form-control" id="pickup" list="places" maxlength="200" placeholder="เช่น อาคารอำนวยการ บางเขน" required>
            </div>
            <div class="mb-3">
              <label class="form-label" for="dropoff">จุดหมายส่ง <span class="text-danger">*</span></label>
              <input class="form-control" id="dropoff" list="places" maxlength="200" placeholder="เช่น สนามบินดอนเมือง" required>
            </div>
            <datalist id="places">
              <option value="มหาวิทยาลัยเกษตรศาสตร์ บางเขน"></option>
              <option value="มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน"></option>
              <option value="มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตศรีราชา"></option>
              <option value="มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตเฉลิมพระเกียรติ จ.สกลนคร"></option>
              <option value="สนามบินดอนเมือง"></option>
              <option value="สนามบินสุวรรณภูมิ"></option>
              <option value="สถานีขนส่งหมอชิต"></option>
            </datalist>

            <div class="row g-3 mb-3">
              <div class="col-sm-6">
                <label class="form-label" for="start">วัน-เวลาเริ่มต้น <span class="text-danger">*</span></label>
                <input type="datetime-local" class="form-control" id="start" required>
              </div>
              <div class="col-sm-6">
                <label class="form-label" for="end">วัน-เวลาสิ้นสุด <span class="text-danger">*</span></label>
                <input type="datetime-local" class="form-control" id="end" required>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label" for="passengers">จำนวนผู้โดยสาร <span class="text-danger">*</span></label>
              <input type="number" class="form-control" id="passengers" min="1" value="1" required>
            </div>
            <div class="mb-3">
              <label class="form-label" for="purpose">วัตถุประสงค์การเดินทาง <span class="text-danger">*</span></label>
              <textarea class="form-control" id="purpose" rows="2" maxlength="255" placeholder="เช่น ประชุม / ลงพื้นที่ / รับ-ส่งวิทยากร" required></textarea>
            </div>

            <div id="availMsg" class="avail-msg mb-3"></div>

            <button type="submit" class="btn btn-ku btn-lg w-100" id="btnSubmit"><i class="bi bi-send-check me-1"></i>ส่งคำขอจองรถ</button>
            <div class="text-muted small text-center mt-2">หลังส่งคำขอ สถานะจะเป็น "รออนุมัติ" จนกว่าผู้ดูแลระบบจะพิจารณา</div>
          </div>
        </div>
      </div>
    </div>
  </form>
</main>
<footer class="ku-footer">ระบบจองรถยนต์ มหาวิทยาลัยเกษตรศาสตร์</footer>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="/js/common.js"></script>
<script>
(async function () {
  await KU.initPage('book', 'user');

  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  let cars = [];
  let events = [];
  let selected = null;
  let checkTimer = null;
  let checkSeq = 0;

  // ---------- ค่าเริ่มต้นของวัน-เวลา ----------
  const nowLocal = new Date();
  $('start').min = KU.localInputValue(nowLocal);
  $('end').min = KU.localInputValue(nowLocal);
  (function setDefaultTimes() {
    const date = params.get('date');
    let s;
    if (/^\\d{4}-\\d{2}-\\d{2}$/.test(date || '')) {
      s = new Date(date + 'T08:00');
      if (s < nowLocal) { s = new Date(nowLocal); s.setMinutes(0, 0, 0); s.setHours(s.getHours() + 1); }
    } else {
      s = new Date(nowLocal); s.setMinutes(0, 0, 0); s.setHours(s.getHours() + 1);
    }
    const e = new Date(s.getTime() + 4 * 3600 * 1000);
    $('start').value = KU.localInputValue(s);
    $('end').value = KU.localInputValue(e);
  })();

  // ---------- โหลดรถ + การจองที่มีอยู่ ----------
  try {
    [cars, events] = await Promise.all([KU.api('/api/cars'), KU.api('/api/bookings/calendar')]);
  } catch (err) { KU.toast(err.message, 'danger'); }

  const shortPlate = (p) => p.split(' ').slice(0, 2).join(' ');

  function renderCars() {
    if (!cars.length) { $('carGrid').innerHTML = '<div class="col-12 empty-state"><i class="bi bi-car-front"></i>ยังไม่มีรถในระบบ</div>'; return; }
    $('carGrid').innerHTML = cars.map((c) => {
      const off = c.status !== 'available';
      return '<div class="col-sm-6">' +
        '<div class="car-option' + (off ? ' disabled' : '') + (selected && selected.id === c.id ? ' selected' : '') + '" data-id="' + c.id + '">' +
          '<div class="car-thumb"><img src="' + KU.carImage(c.image_url) + '" alt="' + KU.esc(c.brand + ' ' + c.model) + '"></div>' +
          '<div class="car-info">' +
            '<div class="car-plate">' + KU.esc(c.plate_number) + '</div>' +
            '<div class="car-meta">' + KU.esc(c.brand + ' ' + c.model) + ' · ' + KU.esc(c.car_type) + '</div>' +
            '<div class="car-meta"><i class="bi bi-people me-1"></i>นั่งได้ ' + c.seats + ' คน ' +
              (off ? '<span class="badge text-bg-secondary ms-1">ซ่อมบำรุง</span>' : '<span class="badge ms-1" style="background:var(--ku-green-soft);color:var(--ku-green-dark)">พร้อมใช้งาน</span>') + '</div>' +
          '</div></div></div>';
    }).join('');
  }

  function renderBusy() {
    if (!selected) { $('busyList').innerHTML = '<span class="text-muted">กรุณาเลือกรถก่อน</span>'; return; }
    const nowStr = KU.localInputValue(new Date());
    const list = events.filter((e) => e.car_id === selected.id && e.end.slice(0, 16) >= nowStr).slice(0, 10);
    if (!list.length) { $('busyList').innerHTML = '<div class="text-success"><i class="bi bi-check-circle me-1"></i>ยังไม่มีการจองที่กำลังจะมาถึง รถว่างทุกช่วงเวลา</div>'; return; }
    $('busyList').innerHTML = '<ul class="list-group list-group-flush">' + list.map((e) =>
      '<li class="list-group-item d-flex justify-content-between align-items-center gap-2 px-0">' +
      '<span><i class="bi bi-clock me-1 text-muted"></i>' + KU.esc(KU.fmtRange(e.start, e.end)) + '</span>' + KU.statusBadge(e.status) + '</li>').join('') + '</ul>';
  }

  function renderSummary() {
    if (selected) {
      $('sumImg').src = KU.carImage(selected.image_url);
      $('sumImg').style.opacity = 1;
      $('sumPlate').textContent = selected.plate_number;
      $('sumName').textContent = selected.brand + ' ' + selected.model + ' · ' + selected.car_type;
      $('sumSeats').style.display = '';
      $('sumSeats').innerHTML = '<i class="bi bi-people me-1"></i>' + selected.seats + ' ที่นั่ง';
      $('passengers').max = selected.seats;
    } else {
      $('sumImg').style.opacity = .35;
      $('sumPlate').textContent = 'ยังไม่ได้เลือกรถ';
      $('sumName').textContent = 'เลือกรถจากรายการด้านซ้าย';
      $('sumSeats').style.display = 'none';
    }
    $('sumPickup').textContent = $('pickup').value.trim() || '-';
    $('sumDropoff').textContent = $('dropoff').value.trim() || '-';
  }

  function selectCar(id) {
    const c = cars.find((x) => x.id === id);
    if (!c || c.status !== 'available') return;
    selected = c;
    renderCars(); renderBusy(); renderSummary(); scheduleCheck();
  }

  $('carGrid').addEventListener('click', (e) => {
    const card = e.target.closest('.car-option');
    if (!card) return;
    if (card.classList.contains('disabled')) { KU.toast('รถคันนี้อยู่ระหว่างซ่อมบำรุง ไม่สามารถจองได้', 'warning'); return; }
    selectCar(Number(card.dataset.id));
  });

  // ---------- ตรวจสอบการจองซ้ำแบบทันที ----------
  function showAvail(kind, text) {
    const el = $('availMsg');
    el.className = 'avail-msg mb-3 ' + kind;
    el.innerHTML = '<i class="bi ' + (kind === 'ok' ? 'bi-check-circle-fill' : kind === 'bad' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill') + ' me-1"></i>' + KU.esc(text);
  }
  function scheduleCheck() {
    clearTimeout(checkTimer);
    checkTimer = setTimeout(checkNow, 350);
  }
  async function checkNow() {
    const el = $('availMsg');
    if (!selected || !$('start').value || !$('end').value) { el.className = 'avail-msg mb-3'; return true; }
    const seq = ++checkSeq;
    try {
      const r = await KU.api('/api/bookings/check?car_id=' + selected.id + '&start=' + encodeURIComponent($('start').value) + '&end=' + encodeURIComponent($('end').value));
      if (seq !== checkSeq) return;
      showAvail(r.available ? 'ok' : 'bad', r.message);
      return r.available;
    } catch (err) {
      if (seq !== checkSeq) return;
      showAvail(err.status === 409 ? 'bad' : 'info', err.message);
      return false;
    }
  }

  ['start', 'end'].forEach((id) => $(id).addEventListener('change', () => {
    if (id === 'start' && $('start').value && (!$('end').value || $('end').value <= $('start').value)) {
      const s = new Date($('start').value);
      $('end').value = KU.localInputValue(new Date(s.getTime() + 2 * 3600 * 1000));
    }
    scheduleCheck();
  }));
  ['pickup', 'dropoff'].forEach((id) => $(id).addEventListener('input', renderSummary));

  // ---------- ส่งฟอร์ม ----------
  $('bookForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selected) { KU.toast('กรุณาเลือกรถที่ต้องการจอง', 'warning'); return; }
    const body = {
      car_id: selected.id,
      pickup_location: $('pickup').value.trim(),
      dropoff_location: $('dropoff').value.trim(),
      start: $('start').value,
      end: $('end').value,
      passengers: Number($('passengers').value),
      purpose: $('purpose').value.trim()
    };
    if (!body.pickup_location || !body.dropoff_location || !body.start || !body.end || !body.purpose) {
      KU.toast('กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบ', 'warning'); return;
    }
    if (body.end <= body.start) { KU.toast('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น', 'danger'); return; }
    if (body.passengers > selected.seats) { KU.toast('รถคันนี้นั่งได้สูงสุด ' + selected.seats + ' คน', 'danger'); return; }

    const btn = $('btnSubmit');
    btn.disabled = true;
    try {
      await KU.api('/api/bookings', { method: 'POST', body });
      KU.toast('ส่งคำขอจองเรียบร้อย รอผู้ดูแลระบบอนุมัติ', 'success');
      setTimeout(() => { location.href = '/my-bookings'; }, 1200);
    } catch (err) {
      // 409 = จองซ้ำ -> ไม่บันทึกและแจ้งเตือนทันที
      showAvail(err.status === 409 ? 'bad' : 'info', err.message);
      KU.toast(err.message, 'danger');
      btn.disabled = false;
      try { events = await KU.api('/api/bookings/calendar'); renderBusy(); } catch (e2) { /* ข้าม */ }
    }
  });

  renderCars();
  renderSummary();
  const pre = Number(params.get('car_id'));
  if (pre) selectCar(pre);
})();
</script>
</body>
</html>
`,
    'my-bookings': `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
<link href="/css/style.css" rel="stylesheet">
<title>การจองของฉัน | ระบบจองรถ ม.เกษตรศาสตร์</title>
</head>
<body>
<div id="navbar"></div>

<main class="container py-4">
  <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
    <div>
      <h2 class="page-title"><i class="bi bi-list-check me-2"></i>การจองของฉัน</h2>
      <p class="page-sub">ติดตามสถานะคำขอจองรถของคุณ</p>
    </div>
    <a href="/book" class="btn btn-ku"><i class="bi bi-plus-circle me-1"></i>จองรถเพิ่ม</a>
  </div>

  <div class="ku-card">
    <div class="ku-card-header">
      <ul class="nav nav-pills nav-pills-ku" id="tabs">
        <li class="nav-item"><button class="nav-link active" data-f="">ทั้งหมด</button></li>
        <li class="nav-item"><button class="nav-link" data-f="pending">รออนุมัติ</button></li>
        <li class="nav-item"><button class="nav-link" data-f="approved">อนุมัติแล้ว</button></li>
        <li class="nav-item"><button class="nav-link" data-f="rejected">ไม่อนุมัติ</button></li>
        <li class="nav-item"><button class="nav-link" data-f="cancelled">ยกเลิก</button></li>
      </ul>
    </div>
    <div class="table-responsive">
      <table class="table table-ku table-hover mb-0">
        <thead><tr><th>รถ</th><th>ช่วงเวลา</th><th>เส้นทาง</th><th>วัตถุประสงค์</th><th>สถานะ</th><th></th></tr></thead>
        <tbody id="rows"><tr><td colspan="6" class="empty-state">กำลังโหลด...</td></tr></tbody>
      </table>
    </div>
  </div>
</main>
<footer class="ku-footer">ระบบจองรถยนต์ มหาวิทยาลัยเกษตรศาสตร์</footer>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="/js/common.js"></script>
<script>
(async function () {
  await KU.initPage('mine', 'user');
  let all = [];
  let filter = '';

  async function load() {
    try { all = await KU.api('/api/bookings/mine'); } catch (err) { KU.toast(err.message, 'danger'); }
    render();
  }

  function render() {
    const list = all.filter((b) => !filter || b.status === filter);
    const tbody = document.getElementById('rows');
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><i class="bi bi-inbox"></i>ไม่มีรายการจอง</td></tr>';
      return;
    }
    const nowStr = KU.localInputValue(new Date());
    tbody.innerHTML = list.map((b) => {
      const canCancel = (b.status === 'pending' || b.status === 'approved') && b.start_datetime.replace(' ', 'T').slice(0, 16) > nowStr;
      return '<tr>' +
        '<td><div class="d-flex align-items-center gap-2"><img class="table-thumb" src="' + KU.carImage(b.image_url) + '" alt="">' +
          '<div><div class="fw-semibold">' + KU.esc(b.plate_number) + '</div><div class="text-muted small">' + KU.esc(b.brand + ' ' + b.model) + '</div></div></div></td>' +
        '<td>' + KU.esc(KU.fmtRange(b.start_datetime, b.end_datetime)) + '<div class="text-muted small">ส่งคำขอ ' + KU.esc(KU.fmtDT(b.created_at)) + '</div></td>' +
        '<td><div><i class="bi bi-geo-alt-fill me-1" style="color:var(--ku-green)"></i>' + KU.esc(b.pickup_location) + '</div>' +
            '<div><i class="bi bi-flag-fill me-1" style="color:var(--ku-green)"></i>' + KU.esc(b.dropoff_location) + '</div></td>' +
        '<td>' + KU.esc(b.purpose) + '<div class="text-muted small"><i class="bi bi-people me-1"></i>' + b.passengers + ' คน</div></td>' +
        '<td>' + KU.statusBadge(b.status) + (b.admin_note ? '<div class="small text-muted mt-1">หมายเหตุ: ' + KU.esc(b.admin_note) + '</div>' : '') + '</td>' +
        '<td class="text-end">' + (canCancel ? '<button class="btn btn-sm btn-outline-danger" data-cancel="' + b.id + '"><i class="bi bi-x-lg me-1"></i>ยกเลิก</button>' : '') + '</td>' +
        '</tr>';
    }).join('');
  }

  document.getElementById('tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-f]');
    if (!btn) return;
    document.querySelectorAll('#tabs .nav-link').forEach((x) => x.classList.remove('active'));
    btn.classList.add('active');
    filter = btn.dataset.f;
    render();
  });

  document.getElementById('rows').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-cancel]');
    if (!btn) return;
    if (!confirm('ต้องการยกเลิกการจองนี้ใช่หรือไม่?')) return;
    btn.disabled = true;
    try {
      const r = await KU.api('/api/bookings/' + btn.dataset.cancel + '/cancel', { method: 'POST', body: {} });
      KU.toast(r.message);
      load();
    } catch (err) { KU.toast(err.message, 'danger'); btn.disabled = false; }
  });

  load();
})();
</script>
</body>
</html>
`,
    'admin': `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
<link href="/css/style.css" rel="stylesheet">
<title>Admin Dashboard | ระบบจองรถ ม.เกษตรศาสตร์</title>
</head>
<body>
<div id="navbar"></div>

<main class="container-xl py-4">
  <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
    <div>
      <h2 class="page-title"><i class="bi bi-speedometer2 me-2"></i>Admin Dashboard</h2>
      <p class="page-sub">ตรวจสอบรายการจองทั้งหมด และพิจารณาอนุมัติ / ไม่อนุมัติ</p>
    </div>
    <button class="btn btn-outline-ku" id="btnReload"><i class="bi bi-arrow-clockwise me-1"></i>รีเฟรช</button>
  </div>

  <div class="row g-3 mb-4">
    <div class="col-6 col-lg-3"><div class="ku-card stat-card"><div class="stat-icon amber"><i class="bi bi-hourglass-split"></i></div><div><div class="stat-value" id="sPending">-</div><div class="stat-label">รออนุมัติ</div></div></div></div>
    <div class="col-6 col-lg-3"><div class="ku-card stat-card"><div class="stat-icon"><i class="bi bi-check-circle"></i></div><div><div class="stat-value" id="sApproved">-</div><div class="stat-label">อนุมัติแล้ว</div></div></div></div>
    <div class="col-6 col-lg-3"><div class="ku-card stat-card"><div class="stat-icon red"><i class="bi bi-x-circle"></i></div><div><div class="stat-value" id="sRejected">-</div><div class="stat-label">ไม่อนุมัติ</div></div></div></div>
    <div class="col-6 col-lg-3"><div class="ku-card stat-card"><div class="stat-icon grey"><i class="bi bi-slash-circle"></i></div><div><div class="stat-value" id="sCancelled">-</div><div class="stat-label">ผู้จองยกเลิก</div></div></div></div>
  </div>

  <div class="ku-card">
    <div class="ku-card-header">
      <ul class="nav nav-pills nav-pills-ku" id="tabs">
        <li class="nav-item"><button class="nav-link active" data-f="pending">รออนุมัติ</button></li>
        <li class="nav-item"><button class="nav-link" data-f="">ทั้งหมด</button></li>
        <li class="nav-item"><button class="nav-link" data-f="approved">อนุมัติแล้ว</button></li>
        <li class="nav-item"><button class="nav-link" data-f="rejected">ไม่อนุมัติ</button></li>
        <li class="nav-item"><button class="nav-link" data-f="cancelled">ยกเลิก</button></li>
      </ul>
    </div>
    <div class="table-responsive">
      <table class="table table-ku table-hover mb-0">
        <thead><tr><th>#</th><th>ผู้จอง</th><th>รถ</th><th>ช่วงเวลา</th><th>เส้นทาง</th><th>วัตถุประสงค์</th><th>สถานะ</th><th class="text-end">การดำเนินการ</th></tr></thead>
        <tbody id="rows"><tr><td colspan="8" class="empty-state">กำลังโหลด...</td></tr></tbody>
      </table>
    </div>
  </div>
</main>
<footer class="ku-footer">ระบบจองรถยนต์ มหาวิทยาลัยเกษตรศาสตร์ - ส่วนผู้ดูแลระบบ</footer>

<!-- ยืนยันการอนุมัติ / ไม่อนุมัติ -->
<div class="modal fade" id="reviewModal" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header"><h5 class="modal-title" id="rvTitle"></h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
      <div class="modal-body">
        <div id="rvSummary" class="mb-3 p-3 rounded-3" style="background:var(--ku-green-soft)"></div>
        <label class="form-label" for="rvNote">หมายเหตุถึงผู้จอง <span class="text-muted small" id="rvNoteHint">(ไม่บังคับ)</span></label>
        <textarea class="form-control" id="rvNote" rows="2" maxlength="255"></textarea>
        <div class="text-danger small mt-2 d-none" id="rvErr"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline-secondary" data-bs-dismiss="modal">ยกเลิก</button>
        <button class="btn" id="rvConfirm"></button>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="/js/common.js"></script>
<script>
(async function () {
  await KU.initPage('admin', 'admin');
  let filter = 'pending';
  let list = [];
  let current = null; // { id, decision }
  const modal = new bootstrap.Modal(document.getElementById('reviewModal'));
  const $ = (id) => document.getElementById(id);

  async function loadStats() {
    try {
      const s = await KU.api('/api/admin/stats');
      $('sPending').textContent = s.pending; $('sApproved').textContent = s.approved;
      $('sRejected').textContent = s.rejected; $('sCancelled').textContent = s.cancelled;
    } catch (err) { KU.toast(err.message, 'danger'); }
  }

  async function loadList() {
    try { list = await KU.api('/api/admin/bookings' + (filter ? '?status=' + filter : '')); }
    catch (err) { KU.toast(err.message, 'danger'); list = []; }
    render();
  }

  function render() {
    const tbody = $('rows');
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><i class="bi bi-inbox"></i>ไม่มีรายการ</td></tr>'; return; }
    tbody.innerHTML = list.map((b) => {
      const actions = b.status === 'pending'
        ? '<button class="btn btn-sm btn-ku me-1" data-act="approved" data-id="' + b.id + '"><i class="bi bi-check-lg me-1"></i>อนุมัติ</button>' +
          '<button class="btn btn-sm btn-outline-danger" data-act="rejected" data-id="' + b.id + '"><i class="bi bi-x-lg me-1"></i>ไม่อนุมัติ</button>'
        : '<span class="text-muted small">' + (b.reviewed_at ? 'พิจารณาเมื่อ ' + KU.esc(KU.fmtDT(b.reviewed_at)) : '-') + '</span>';
      return '<tr>' +
        '<td>' + b.id + '</td>' +
        '<td><div class="fw-semibold">' + KU.esc(b.full_name) + '</div><div class="small text-muted">' + KU.esc(b.department || '-') + '</div>' +
          '<div class="small text-muted"><i class="bi bi-telephone me-1"></i>' + KU.esc(b.phone || '-') + '</div></td>' +
        '<td><div class="d-flex align-items-center gap-2"><img class="table-thumb" src="' + KU.carImage(b.image_url) + '" alt="">' +
          '<div><div class="fw-semibold">' + KU.esc(b.plate_number) + '</div><div class="small text-muted">' + KU.esc(b.brand + ' ' + b.model) + '</div></div></div></td>' +
        '<td>' + KU.esc(KU.fmtRange(b.start_datetime, b.end_datetime)) + '</td>' +
        '<td><div><i class="bi bi-geo-alt-fill me-1" style="color:var(--ku-green)"></i>' + KU.esc(b.pickup_location) + '</div>' +
            '<div><i class="bi bi-flag-fill me-1" style="color:var(--ku-green)"></i>' + KU.esc(b.dropoff_location) + '</div></td>' +
        '<td>' + KU.esc(b.purpose) + '<div class="small text-muted"><i class="bi bi-people me-1"></i>' + b.passengers + ' คน</div></td>' +
        '<td>' + KU.statusBadge(b.status) + (b.admin_note ? '<div class="small text-muted mt-1">หมายเหตุ: ' + KU.esc(b.admin_note) + '</div>' : '') + '</td>' +
        '<td class="text-end text-nowrap">' + actions + '</td></tr>';
    }).join('');
  }

  $('tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-f]');
    if (!btn) return;
    document.querySelectorAll('#tabs .nav-link').forEach((x) => x.classList.remove('active'));
    btn.classList.add('active');
    filter = btn.dataset.f;
    loadList();
  });

  $('rows').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const b = list.find((x) => x.id === Number(btn.dataset.id));
    if (!b) return;
    current = { id: b.id, decision: btn.dataset.act };
    const approve = current.decision === 'approved';
    $('rvTitle').textContent = approve ? 'ยืนยันการอนุมัติการจอง' : 'ยืนยันการไม่อนุมัติการจอง';
    $('rvSummary').innerHTML = '<div class="fw-semibold">' + KU.esc(b.full_name) + '</div>' +
      '<div>' + KU.esc(b.plate_number) + ' · ' + KU.esc(b.brand + ' ' + b.model) + '</div>' +
      '<div class="small">' + KU.esc(KU.fmtRange(b.start_datetime, b.end_datetime)) + '</div>';
    $('rvNote').value = '';
    $('rvNoteHint').textContent = approve ? '(ไม่บังคับ)' : '(แนะนำให้ระบุเหตุผล)';
    $('rvErr').classList.add('d-none');
    const ok = $('rvConfirm');
    ok.className = 'btn ' + (approve ? 'btn-ku' : 'btn-danger');
    ok.innerHTML = approve ? '<i class="bi bi-check-lg me-1"></i>อนุมัติ' : '<i class="bi bi-x-lg me-1"></i>ไม่อนุมัติ';
    ok.disabled = false;
    modal.show();
  });

  $('rvConfirm').addEventListener('click', async () => {
    if (!current) return;
    const ok = $('rvConfirm');
    ok.disabled = true;
    const path = current.decision === 'approved' ? 'approve' : 'reject';
    try {
      const r = await KU.api('/api/admin/bookings/' + current.id + '/' + path, { method: 'POST', body: { note: $('rvNote').value } });
      modal.hide();
      KU.toast(r.message);
    } catch (err) {
      $('rvErr').textContent = err.message;
      $('rvErr').classList.remove('d-none');
      KU.toast(err.message, 'danger');
      ok.disabled = false;
      if (err.status !== 409) return;
      modal.hide();
    }
    loadStats(); loadList();
  });

  $('btnReload').addEventListener('click', () => { loadStats(); loadList(); });
  loadStats(); loadList();
})();
</script>
</body>
</html>
`,
  }
};

// =====================================================================
// SQL สร้างตาราง (รันอัตโนมัติถ้ายังไม่มีตาราง) - ตรงกับ schema.sql ในคู่มือ README
// =====================================================================
const CREATE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS cars (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS bookings (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];
const SEED_CARS_SQL = `INSERT IGNORE INTO cars (plate_number, brand, model, car_type, seats, image_url, status) VALUES
  ('นก 1234 กรุงเทพมหานคร', 'Toyota', 'Camry',    'รถเก๋ง',        4,  '/images/cars/sedan.svg',   'available'),
  ('ญข 5678 กรุงเทพมหานคร', 'Honda',  'CR-V',     'รถ SUV',        5,  '/images/cars/suv.svg',     'available'),
  ('ฮค 4321 กรุงเทพมหานคร', 'Toyota', 'Commuter', 'รถตู้',         12, '/images/cars/van.svg',     'available'),
  ('กจ 8899 กรุงเทพมหานคร', 'Isuzu',  'D-Max',    'รถกระบะ',       4,  '/images/cars/pickup.svg',  'available'),
  ('ขฉ 2468 กรุงเทพมหานคร', 'Toyota', 'Fortuner', 'รถ SUV',        7,  '/images/cars/suv.svg',     'available'),
  ('ตก 1357 กรุงเทพมหานคร', 'Mitsubishi', 'Mirage', 'รถเก๋ง',      4,  '/images/cars/sedan.svg',   'maintenance');`;

// =====================================================================
// 1) ฐานข้อมูล MySQL
// =====================================================================
function dbConfig() {
  let c = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ku_car_booking'
  };
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (url) {
    const u = new URL(url);
    c = {
      host: u.hostname,
      port: Number(u.port) || 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: decodeURIComponent(u.pathname.replace(/^\//, '')) || c.database
    };
  }
  return c;
}

const cfg = dbConfig();
const isLocalHost = ['localhost', '127.0.0.1', '::1', 'db'].includes(cfg.host);
const useSsl = process.env.DB_SSL ? process.env.DB_SSL === 'true' : (isProd && !isLocalHost);

const pool = mysql.createPool({
  ...cfg,
  charset: 'utf8mb4',
  ssl: useSsl ? { rejectUnauthorized: process.env.DB_SSL_VERIFY !== 'false' } : undefined,
  waitForConnections: true,
  connectionLimit: isProd ? 3 : 10,   // serverless: เปิดหลายอินสแตนซ์พร้อมกัน จึงจำกัดการเชื่อมต่อต่ออินสแตนซ์
  connectTimeout: 10000,
  enableKeepAlive: true,
  dateStrings: true                   // DATETIME เป็นสตริง "YYYY-MM-DD HH:mm:ss" ไม่ถูกแปลง timezone
});

// สร้างตาราง/ข้อมูลรถอัตโนมัติถ้ายังไม่มี (ไม่ลบข้อมูลเดิม)
async function ensureSchema() {
  const [rows] = await pool.query('SHOW TABLES');
  const have = new Set(rows.map((r) => String(Object.values(r)[0]).toLowerCase()));
  if (have.has('users') && have.has('cars') && have.has('bookings')) return;
  for (const sql of CREATE_STATEMENTS) await pool.query(sql);
  if (!have.has('cars')) await pool.query(SEED_CARS_SQL);
}

// =====================================================================
// 2) Session แบบ stateless (คุกกี้เซ็นลายเซ็น HMAC) - ใช้ได้กับ serverless เช่น Vercel
// =====================================================================
const COOKIE_NAME = 'ku.sid';
const SESSION_MS = 8 * 60 * 60 * 1000;
const secret = () => process.env.SESSION_SECRET || (isProd ? '' : 'dev-only-secret-change-me');
const sign = (payload) => crypto.createHmac('sha256', secret()).update(payload).digest('base64url');

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  });
  return out;
}

function sessionMiddleware(req, res, next) {
  req.session = { user: null };
  const raw = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (raw && secret()) {
    const [payload, sig] = raw.split('.');
    if (payload && sig) {
      const a = Buffer.from(sig);
      const b = Buffer.from(sign(payload));
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        try {
          const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
          if (data.exp > Date.now() && data.user) req.session.user = data.user;
        } catch (e) { /* คุกกี้เสีย -> ถือว่ายังไม่ล็อกอิน */ }
      }
    }
  }
  next();
}

function cookieFlags(maxAgeSeconds) {
  return `; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${isProd ? '; Secure' : ''}`;
}
function startSession(res, user) {
  const payload = Buffer.from(JSON.stringify({ user, exp: Date.now() + SESSION_MS })).toString('base64url');
  res.append('Set-Cookie', `${COOKIE_NAME}=${payload}.${sign(payload)}${cookieFlags(SESSION_MS / 1000)}`);
}
function endSession(res) {
  res.append('Set-Cookie', `${COOKIE_NAME}=${cookieFlags(0)}`);
}

// =====================================================================
// 3) ตรวจสิทธิ์ (Authentication & Authorization)
// =====================================================================
const isApi = (req) => req.originalUrl.startsWith('/api/');

function requireLogin(req, res, next) {
  if (req.session.user) return next();
  if (isApi(req)) return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อน' });
  return res.redirect('/login');
}

function requireUser(req, res, next) {
  const u = req.session.user;
  if (!u) {
    if (isApi(req)) return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อน' });
    return res.redirect('/login');
  }
  if (u.role !== 'user') {
    if (isApi(req)) return res.status(403).json({ message: 'ผู้ดูแลระบบไม่มีสิทธิ์จองรถ' });
    return res.redirect('/admin');
  }
  return next();
}

function requireAdmin(req, res, next) {
  const u = req.session.user;
  if (!u) {
    if (isApi(req)) return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อน' });
    return res.redirect('/login');
  }
  if (u.role !== 'admin') {
    if (isApi(req)) return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เข้าถึงส่วนผู้ดูแลระบบ' });
    return res.status(403).type('html').send(FORBIDDEN_PAGE);
  }
  return next();
}

const FORBIDDEN_PAGE = `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>403 ไม่มีสิทธิ์เข้าถึง</title>
<style>body{font-family:sans-serif;background:#faf8f1;display:grid;place-items:center;height:100vh;margin:0;color:#1f2d2c}
.box{text-align:center;padding:2rem 3rem;background:#fff;border-radius:16px;border:1px solid #e4e0d2}
h1{color:#006664;margin:0 0 .5rem}a{color:#006664}</style></head>
<body><div class="box"><h1>403</h1><p>คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะผู้ดูแลระบบ)</p><a href="/">กลับหน้าหลัก</a></div></body></html>`;

// =====================================================================
// 4) ตรรกะการจอง + ป้องกันการจองซ้ำ
// =====================================================================
const BLOCKING_STATUSES = ['pending', 'approved']; // สถานะที่ "ครองช่วงเวลา" ของรถ

class BookingError extends Error {
  constructor(message, status = 400, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// เวลาปัจจุบันตามเวลาประเทศไทย "YYYY-MM-DD HH:mm:ss" (เซิร์ฟเวอร์ Vercel ใช้ UTC จึงต้องระบุ timezone)
function nowBangkok() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).format(new Date()).replace('T', ' ');
}

function normalizeDateTime(value) {
  if (typeof value !== 'string') return null;
  const m = value.trim().match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const normalized = `${m[1]} ${m[2]}:${m[3] || '00'}`;
  const d = new Date(normalized.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 19).replace('T', ' ') !== normalized) return null;
  return normalized;
}

// หาการจองที่ "ทับซ้อนเวลา" กับช่วง [start, end) ของรถคันนี้
// เงื่อนไข: เริ่มใหม่ < จบเดิม  และ  จบใหม่ > เริ่มเดิม  (จองต่อกันพอดีไม่นับว่าซ้ำ)
async function findConflict(db, carId, start, end, excludeBookingId = null, statuses = BLOCKING_STATUSES) {
  const placeholders = statuses.map(() => '?').join(',');
  let sql = `SELECT id, start_datetime, end_datetime, status
               FROM bookings
              WHERE car_id = ?
                AND status IN (${placeholders})
                AND start_datetime < ?
                AND end_datetime > ?`;
  const params = [carId, ...statuses, end, start];
  if (excludeBookingId) { sql += ' AND id <> ?'; params.push(excludeBookingId); }
  sql += ' ORDER BY start_datetime LIMIT 1';
  const [rows] = await db.query(sql, params);
  return rows[0] || null;
}

const fmtThai = (dt) => dt.slice(0, 16).replace(' ', ' เวลา ');
function conflictMessage(c) {
  const who = c.status === 'approved' ? 'ได้รับการอนุมัติแล้ว' : 'ถูกจองไว้ (รออนุมัติ)';
  return `รถคันนี้${who}ในช่วงเวลา ${fmtThai(c.start_datetime)} ถึง ${fmtThai(c.end_datetime)} กรุณาเลือกเวลาหรือรถคันอื่น`;
}

function validateRange(start, end) {
  if (!start || !end) throw new BookingError('รูปแบบวันและเวลาไม่ถูกต้อง');
  if (end <= start) throw new BookingError('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น');
  if (start < nowBangkok()) throw new BookingError('ไม่สามารถจองย้อนหลังได้ กรุณาเลือกเวลาในอนาคต');
}

async function checkAvailability(carId, startRaw, endRaw) {
  if (!Number.isInteger(carId) || carId <= 0) throw new BookingError('กรุณาเลือกรถ');
  const start = normalizeDateTime(startRaw);
  const end = normalizeDateTime(endRaw);
  validateRange(start, end);
  const [cars] = await pool.query('SELECT id, status FROM cars WHERE id = ?', [carId]);
  if (!cars.length) throw new BookingError('ไม่พบรถคันที่เลือก', 404);
  if (cars[0].status !== 'available') throw new BookingError('รถคันนี้อยู่ระหว่างซ่อมบำรุง ไม่สามารถจองได้', 409);
  const conflict = await findConflict(pool, carId, start, end);
  return conflict
    ? { available: false, message: conflictMessage(conflict), conflict }
    : { available: true, message: 'รถคันนี้ว่างในช่วงเวลาที่เลือก' };
}

// สร้างการจอง: transaction + ล็อกแถวรถ (FOR UPDATE) กันสองคนจองรถคันเดียวกันพร้อมกัน
async function createBooking(userId, data) {
  const start = normalizeDateTime(data.start);
  const end = normalizeDateTime(data.end);
  validateRange(start, end);

  const carId = Number(data.car_id);
  const pickup = String(data.pickup_location || '').trim();
  const dropoff = String(data.dropoff_location || '').trim();
  const purpose = String(data.purpose || '').trim();
  const passengers = Number(data.passengers);

  if (!Number.isInteger(carId) || carId <= 0) throw new BookingError('กรุณาเลือกรถ');
  if (!pickup) throw new BookingError('กรุณาระบุจุดหมายรับ');
  if (!dropoff) throw new BookingError('กรุณาระบุจุดหมายส่ง');
  if (!purpose) throw new BookingError('กรุณาระบุวัตถุประสงค์การเดินทาง');
  if (pickup.length > 200 || dropoff.length > 200 || purpose.length > 255) throw new BookingError('ข้อความยาวเกินไป');
  if (!Number.isInteger(passengers) || passengers < 1) throw new BookingError('จำนวนผู้โดยสารไม่ถูกต้อง');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [cars] = await conn.query('SELECT id, seats, status FROM cars WHERE id = ? FOR UPDATE', [carId]);
    if (!cars.length) throw new BookingError('ไม่พบรถคันที่เลือก', 404);
    if (cars[0].status !== 'available') throw new BookingError('รถคันนี้อยู่ระหว่างซ่อมบำรุง ไม่สามารถจองได้', 409);
    if (passengers > cars[0].seats) throw new BookingError(`รถคันนี้นั่งได้สูงสุด ${cars[0].seats} คน`);

    const conflict = await findConflict(conn, carId, start, end);
    if (conflict) throw new BookingError(conflictMessage(conflict), 409, { conflict });

    const [result] = await conn.query(
      `INSERT INTO bookings
         (user_id, car_id, start_datetime, end_datetime, pickup_location, dropoff_location, purpose, passengers, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, carId, start, end, pickup, dropoff, purpose, passengers]
    );
    await conn.commit();
    return result.insertId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// อนุมัติ / ไม่อนุมัติ (Admin): ทำได้เฉพาะรายการที่ยังเป็น pending
async function reviewBooking(bookingId, adminId, decision, note) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM bookings WHERE id = ? FOR UPDATE', [bookingId]);
    if (!rows.length) throw new BookingError('ไม่พบรายการจองนี้', 404);
    const booking = rows[0];
    if (booking.status !== 'pending') throw new BookingError('รายการนี้ถูกดำเนินการไปแล้ว', 409);

    if (decision === 'approved') {
      await conn.query('SELECT id FROM cars WHERE id = ? FOR UPDATE', [booking.car_id]);
      const conflict = await findConflict(conn, booking.car_id, booking.start_datetime, booking.end_datetime, booking.id, ['approved']);
      if (conflict) throw new BookingError(conflictMessage(conflict), 409, { conflict });
    }
    await conn.query(
      'UPDATE bookings SET status = ?, admin_note = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?',
      [decision, note || null, adminId, nowBangkok(), bookingId]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// =====================================================================
// 5) ข้อมูลตัวอย่าง (สร้างครั้งแรกเท่านั้น เมื่อตาราง users ว่าง)
// =====================================================================
function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function seedIfEmpty() {
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM users');
  if (Number(total) > 0) return false;

  const adminHash = await bcrypt.hash('admin1234', 10);
  const userHash = await bcrypt.hash('user1234', 10);
  await pool.query(
    `INSERT IGNORE INTO users (username, password_hash, full_name, department, phone, role) VALUES
       ('admin', ?, 'ผู้ดูแลระบบ งานยานพาหนะ', 'กองกลาง มหาวิทยาลัยเกษตรศาสตร์', '02-000-0000', 'admin'),
       ('user',  ?, 'สมชาย ใจดี', 'คณะวิทยาศาสตร์ ภาควิชาเคมี', '081-234-5678', 'user'),
       ('somying', ?, 'สมหญิง รักเรียน', 'คณะเกษตร ภาควิชาพืชไร่นา', '089-876-5432', 'user')`,
    [adminHash, userHash, userHash]
  );

  const [[{ nb }]] = await pool.query('SELECT COUNT(*) AS nb FROM bookings');
  if (Number(nb) === 0) {
    const today = nowBangkok().slice(0, 10);
    const [users] = await pool.query('SELECT id, username FROM users');
    const id = Object.fromEntries(users.map((u) => [u.username, u.id]));
    const [cars] = await pool.query("SELECT id FROM cars WHERE status = 'available' ORDER BY id LIMIT 4");
    if (cars.length >= 4) {
      const rows = [
        [id.user,    cars[2].id, `${addDays(today, 1)} 08:00:00`, `${addDays(today, 1)} 16:30:00`, 'อาคารอำนวยการ บางเขน', 'ศูนย์วิจัยกำแพงแสน', 'พาคณะนิสิตลงพื้นที่ศึกษาดูงาน', 10, 'approved'],
        [id.somying, cars[0].id, `${addDays(today, 2)} 09:00:00`, `${addDays(today, 2)} 12:00:00`, 'คณะเกษตร บางเขน', 'กระทรวงเกษตรและสหกรณ์', 'ประชุมความร่วมมือทางวิชาการ', 3, 'approved'],
        [id.user,    cars[1].id, `${addDays(today, 3)} 13:00:00`, `${addDays(today, 3)} 18:00:00`, 'คณะวิทยาศาสตร์ บางเขน', 'สนามบินดอนเมือง', 'รับวิทยากรรับเชิญ', 2, 'pending'],
        [id.somying, cars[3].id, `${addDays(today, 5)} 07:30:00`, `${addDays(today, 6)} 17:00:00`, 'โรงเก็บพัสดุ บางเขน', 'ศรีราชา จ.ชลบุรี', 'ขนส่งอุปกรณ์ภาคสนาม', 2, 'approved']
      ];
      for (const r of rows) {
        await pool.query(
          `INSERT INTO bookings
             (user_id, car_id, start_datetime, end_datetime, pickup_location, dropoff_location, purpose, passengers, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, r
        );
      }
    }
  }
  return true;
}

// เตรียมระบบครั้งแรก (ทำครั้งเดียวต่ออินสแตนซ์) - ถ้าพลาดจะลองใหม่ในคำขอถัดไป
let readyPromise = null;
function ensureReady() {
  if (!process.env.SESSION_SECRET && isProd) {
    return Promise.reject(Object.assign(new Error('ยังไม่ได้ตั้งค่า SESSION_SECRET'), { code: 'NO_SESSION_SECRET' }));
  }
  if (!readyPromise) {
    readyPromise = (async () => {
      await ensureSchema();
      if (await seedIfEmpty()) console.log('สร้างบัญชีตัวอย่างแล้ว -> admin / admin1234  และ  user / user1234');
    })().catch((err) => { readyPromise = null; throw err; });
  }
  return readyPromise;
}

// =====================================================================
// 6) Express app
// =====================================================================
const app = express();
app.disable('x-powered-by');
if (isProd) app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(sessionMiddleware);

// ---------- ไฟล์ Frontend ที่ฝังไว้ (CSS / JS / รูปรถ) - ไม่ต้องใช้ DB ----------
const asset = (type, body) => (req, res) => { res.set('Cache-Control', 'public, max-age=3600').type(type).send(body); };
app.get('/css/style.css', asset('text/css; charset=utf-8', ASSETS.css));
app.get('/js/common.js', asset('application/javascript; charset=utf-8', ASSETS.commonJs));
app.get('/images/cars/:name.svg', (req, res, next) => {
  const svg = Object.prototype.hasOwnProperty.call(ASSETS.svg, req.params.name) ? ASSETS.svg[req.params.name] : null;
  if (!svg) return next();
  return asset('image/svg+xml; charset=utf-8', svg)(req, res);
});
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// ตรวจสุขภาพระบบ (ไว้ดูว่าเชื่อมต่อฐานข้อมูลได้หรือไม่ ไม่เปิดเผยรายละเอียดข้อผิดพลาด)
app.get('/api/health', async (req, res) => {
  try { await ensureReady(); await pool.query('SELECT 1'); res.json({ ok: true }); }
  catch (err) { console.error('health check failed:', err.code || '', err.message); res.status(503).json({ ok: false }); }
});

// เตรียมฐานข้อมูลก่อนทุกหน้า/ทุก API
app.use(async (req, res, next) => {
  try { await ensureReady(); next(); } catch (err) { next(err); }
});

// ---------- หน้าเว็บ (ป้องกันสิทธิ์ที่ฝั่งเซิร์ฟเวอร์) ----------
const page = (name) => (req, res) => res.type('html').send(ASSETS.pages[name]);
const redirectIfLoggedIn = (req, res, next) => {
  const u = req.session.user;
  if (u) return res.redirect(u.role === 'admin' ? '/admin' : '/');
  next();
};
app.get('/login', redirectIfLoggedIn, page('login'));
app.get('/register', redirectIfLoggedIn, page('register'));
app.get('/', requireUser, page('index'));                 // Dashboard + ปฏิทิน (User)
app.get('/book', requireUser, page('book'));              // ฟอร์มจองรถ (User)
app.get('/my-bookings', requireUser, page('my-bookings')); // การจองของฉัน (User)
app.get('/admin', requireAdmin, page('admin'));           // Admin Dashboard (Admin เท่านั้น)

// ---------- API: สมัคร / เข้าสู่ระบบ ----------
const auth = express.Router();
const attempts = new Map(); // จำกัดการเดารหัสผ่าน (ต่ออินสแตนซ์)
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const tooMany = (key) => {
  const r = attempts.get(key);
  if (!r) return false;
  if (Date.now() - r.first > WINDOW_MS) { attempts.delete(key); return false; }
  return r.count >= MAX_ATTEMPTS;
};
const recordFail = (key) => {
  const r = attempts.get(key);
  if (!r || Date.now() - r.first > WINDOW_MS) attempts.set(key, { count: 1, first: Date.now() });
  else r.count += 1;
};
const publicUser = (u) => ({ id: u.id, username: u.username, full_name: u.full_name, department: u.department, phone: u.phone, role: u.role });

// สมัครสมาชิก: สร้างได้เฉพาะ role = user (ไม่รับ role จากผู้ใช้)
auth.post('/register', async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    const fullName = String(req.body.full_name || '').trim();
    const department = String(req.body.department || '').trim() || null;
    const phone = String(req.body.phone || '').trim() || null;

    if (!/^[A-Za-z0-9_.]{4,30}$/.test(username)) return res.status(400).json({ message: 'ชื่อผู้ใช้ต้องเป็นตัวอักษรอังกฤษ/ตัวเลข 4-30 ตัว' });
    if (password.length < 6) return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
    if (!fullName) return res.status(400).json({ message: 'กรุณากรอกชื่อ-นามสกุล' });
    if (phone && !/^[0-9+\-\s]{8,20}$/.test(phone)) return res.status(400).json({ message: 'เบอร์โทรศัพท์ไม่ถูกต้อง' });

    const [exists] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (exists.length) return res.status(409).json({ message: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (username, password_hash, full_name, department, phone, role) VALUES (?, ?, ?, ?, ?, 'user')",
      [username, hash, fullName, department, phone]
    );
    res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ' });
  } catch (err) { next(err); }
});

auth.post('/login', async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    const key = `${req.ip}|${username.toLowerCase()}`;
    if (tooMany(key)) return res.status(429).json({ message: 'พยายามเข้าสู่ระบบผิดหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่' });

    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];
    const ok = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!ok) {
      recordFail(key);
      return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }
    attempts.delete(key);
    const pu = publicUser(user);
    startSession(res, pu);
    res.json({ user: pu, redirect: user.role === 'admin' ? '/admin' : '/' });
  } catch (err) { next(err); }
});

auth.post('/logout', (req, res) => { endSession(res); res.json({ message: 'ออกจากระบบแล้ว' }); });
auth.get('/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: 'ยังไม่ได้เข้าสู่ระบบ' });
  res.json({ user: req.session.user });
});
app.use('/api/auth', auth);

// ---------- API: รถ ----------
app.get('/api/cars', requireLogin, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, plate_number, brand, model, car_type, seats, image_url, status FROM cars ORDER BY status, brand, model, id'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// ---------- API: การจอง (ผู้ใช้ทั่วไป) ----------
const bookings = express.Router();

// ปฏิทิน: ผู้ใช้เห็น "รถ + ช่วงเวลา + สถานะ" ของคนอื่น แต่เห็นรายละเอียดเส้นทางเฉพาะรายการของตัวเอง
bookings.get('/calendar', requireLogin, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.id, b.car_id, b.user_id, b.start_datetime, b.end_datetime, b.status,
              b.pickup_location, b.dropoff_location, c.plate_number, c.brand, c.model
         FROM bookings b JOIN cars c ON c.id = b.car_id
        WHERE b.status IN ('pending','approved')
        ORDER BY b.start_datetime`
    );
    const me = req.session.user;
    res.json(rows.map((r) => {
      const mine = r.user_id === me.id;
      return {
        id: r.id, car_id: r.car_id, plate_number: r.plate_number, car_name: `${r.brand} ${r.model}`,
        start: r.start_datetime.replace(' ', 'T'), end: r.end_datetime.replace(' ', 'T'),
        status: r.status, mine,
        pickup_location: mine ? r.pickup_location : null,
        dropoff_location: mine ? r.dropoff_location : null
      };
    }));
  } catch (err) { next(err); }
});

bookings.get('/check', requireUser, async (req, res, next) => {
  try { res.json(await checkAvailability(Number(req.query.car_id), req.query.start, req.query.end)); }
  catch (err) { next(err); }
});

bookings.get('/mine', requireUser, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.id, b.start_datetime, b.end_datetime, b.pickup_location, b.dropoff_location,
              b.purpose, b.passengers, b.status, b.admin_note, b.created_at,
              c.plate_number, c.brand, c.model, c.image_url
         FROM bookings b JOIN cars c ON c.id = b.car_id
        WHERE b.user_id = ? ORDER BY b.start_datetime DESC`,
      [req.session.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

bookings.post('/', requireUser, async (req, res, next) => {
  try {
    const id = await createBooking(req.session.user.id, req.body);
    res.status(201).json({ id, message: 'ส่งคำขอจองเรียบร้อย รอผู้ดูแลระบบอนุมัติ' });
  } catch (err) { next(err); }
});

bookings.post('/:id/cancel', requireUser, async (req, res, next) => {
  try {
    const [result] = await pool.query(
      `UPDATE bookings SET status = 'cancelled'
        WHERE id = ? AND user_id = ? AND status IN ('pending','approved') AND start_datetime > ?`,
      [Number(req.params.id), req.session.user.id, nowBangkok()]
    );
    if (!result.affectedRows) return res.status(409).json({ message: 'ไม่สามารถยกเลิกรายการนี้ได้ (อาจเริ่มไปแล้ว หรือถูกดำเนินการแล้ว)' });
    res.json({ message: 'ยกเลิกการจองเรียบร้อย' });
  } catch (err) { next(err); }
});
app.use('/api/bookings', bookings);

// ---------- API: ผู้ดูแลระบบเท่านั้น ----------
const admin = express.Router();
admin.use(requireAdmin);

admin.get('/stats', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT status, COUNT(*) AS total FROM bookings GROUP BY status');
    const stats = { pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    rows.forEach((r) => { stats[r.status] = Number(r.total); });
    res.json(stats);
  } catch (err) { next(err); }
});

admin.get('/bookings', async (req, res, next) => {
  try {
    const allowed = ['pending', 'approved', 'rejected', 'cancelled'];
    const params = [];
    let where = '';
    if (req.query.status && allowed.includes(req.query.status)) { where = 'WHERE b.status = ?'; params.push(req.query.status); }
    const [rows] = await pool.query(
      `SELECT b.id, b.start_datetime, b.end_datetime, b.pickup_location, b.dropoff_location,
              b.purpose, b.passengers, b.status, b.admin_note, b.created_at, b.reviewed_at,
              c.plate_number, c.brand, c.model, c.image_url, u.full_name, u.department, u.phone
         FROM bookings b JOIN cars c ON c.id = b.car_id JOIN users u ON u.id = b.user_id
         ${where}
        ORDER BY (b.status = 'pending') DESC, b.start_datetime DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

admin.post('/bookings/:id/approve', async (req, res, next) => {
  try {
    await reviewBooking(Number(req.params.id), req.session.user.id, 'approved', String(req.body.note || '').trim().slice(0, 255));
    res.json({ message: 'อนุมัติการจองเรียบร้อย' });
  } catch (err) { next(err); }
});
admin.post('/bookings/:id/reject', async (req, res, next) => {
  try {
    await reviewBooking(Number(req.params.id), req.session.user.id, 'rejected', String(req.body.note || '').trim().slice(0, 255));
    res.json({ message: 'บันทึกการไม่อนุมัติเรียบร้อย' });
  } catch (err) { next(err); }
});
app.use('/api/admin', admin);

// ---------- 404 / Error ----------
app.use('/api', (req, res) => res.status(404).json({ message: 'ไม่พบเส้นทางที่เรียก' }));
app.use((req, res) => res.status(404).type('text').send('ไม่พบหน้าที่ต้องการ (404)'));

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ message: 'รูปแบบข้อมูลที่ส่งมาไม่ถูกต้อง' });
  if (err instanceof BookingError) return res.status(err.status).json({ message: err.message, ...err.extra });

  console.error('ERROR:', err && (err.code || ''), err && err.message);
  const setup = err && (err.code === 'NO_SESSION_SECRET' || /^(ECONN|ENOTFOUND|ETIMEDOUT|ER_|PROTOCOL_)/.test(String(err.code || '')));
  if (isApi(req)) {
    return res.status(500).json({ message: setup ? 'ระบบยังตั้งค่าไม่ครบ (ฐานข้อมูล/SESSION_SECRET) กรุณาติดต่อผู้ดูแล' : 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง' });
  }
  return res.status(500).type('html').send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ระบบยังไม่พร้อม</title>
<body style="font-family:sans-serif;background:#faf8f1;display:grid;place-items:center;min-height:100vh;margin:0;color:#1f2d2c"><div style="max-width:520px;background:#fff;border:1px solid #e4e0d2;border-radius:16px;padding:2rem">
<h2 style="color:#006664;margin-top:0">ระบบยังไม่พร้อมใช้งาน</h2>
<p>${setup ? 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ หรือยังไม่ได้ตั้งค่า Environment Variables (DATABASE_URL, SESSION_SECRET)' : 'เกิดข้อผิดพลาดภายในระบบ'}</p>
<p style="color:#6b7a78;font-size:14px">ผู้ดูแล: ตรวจสอบ Logs ของเซิร์ฟเวอร์ และเปิด /api/health เพื่อทดสอบการเชื่อมต่อ</p></div></body>`);
});

// ---------- ส่งออกให้ Vercel / รันตรง ๆ ในเครื่อง ----------
module.exports = app;

if (require.main === module) {
  const PORT = Number(process.env.PORT) || 3000;
  ensureReady()
    .then(() => app.listen(PORT, () => console.log(`✅ ระบบจองรถ ม.เกษตรศาสตร์ พร้อมใช้งานที่ http://localhost:${PORT}`)))
    .catch((err) => {
      console.error('❌ เริ่มระบบไม่สำเร็จ:', err.code || '', err.message);
      console.error('   ตรวจสอบว่าเปิด MySQL แล้ว และตั้งค่า .env (DATABASE_URL หรือ DB_*) ถูกต้อง');
      process.exit(1);
    });
}
