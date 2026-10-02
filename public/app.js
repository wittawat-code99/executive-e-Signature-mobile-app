/* ================= data ================= */
const DOC = {
  title: "MSA ระบบ ERP กลุ่มบริษัท",
  file: "MSA-2026-0918.pdf · 42 หน้า · 31.4 MB",
  entity: "นาวา โฮลดิ้งส์ (ตัวอย่าง)",
  role: "กรรมการผู้มีอำนาจลงนาม · CEO",
  cp: "บริษัท ABC จำกัด (มหาชน)",
  val: "15,450,000",
  period: "1 ต.ค. 2026 – 30 ก.ย. 2027",
  risk: "เบี้ยปรับล่าช้าต่างจากสัญญามาตรฐาน 5%",
  sn: "7F3A21C9",
  name: "สมชาย ใจดี (ตัวอย่าง)",
  pins: [38, 40, 41],
  pages: 42,
};
const SCEN_DEFAULT = {
  face: "ok",
  outcome: "ok",
  doc: "normal",
  verify: "valid",
  load: "normal",
};
let S,
  timers = [];
function reset() {
  timers.forEach(clearTimeout);
  timers = [];
  const scen = S ? S.scen : { ...SCEN_DEFAULT };
  const log = S ? S.log : [];
  S = {
    view: "inbox",
    tab: 0,
    sheet: null,
    overlay: null,
    intent: false,
    reason: "Approved",
    style: "stamp",
    pin: 0,
    pinCode: "",
    faceTry: 0,
    faceState: "scan",
    questions: [],
    unread: false,
    toast: null,
    attTab: 0,
    askTo: 0,
    draft: "",
    rejectText: "",
    scen,
    log,
    t0: null,
    signedTx: null,
    signedAt: null,
  };
}
reset();

/* ================= logging (in-memory, for facilitator) ================= */
const KPI = { slipRelease: 0, faceFail: 0 };
function ev(name) {
  const now = Date.now();
  if (name === "open_doc") S.t0 = now;
  const rel = S.t0 ? ((now - S.t0) / 1000).toFixed(1) + "s" : "–";
  S.log.push(`${new Date(now).toLocaleTimeString("th-TH")}  +${rel}  ${name}`);
  if (!$("#fac").hidden) renderFac();
}

/* ================= helpers ================= */
const $ = (q) => document.querySelector(q);
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const later = (fn, ms) => timers.push(setTimeout(fn, ms));
const blocked = () => S.scen.doc === "blocked";
const fmtNow = () => {
  const d = new Date(),
    p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const lines = (n, last = "s") =>
  Array.from(
    { length: n },
    (_, i) => `<div class="ln ${i === n - 1 ? last : ""}"></div>`,
  ).join("");

const sbar = () =>
  `<div class="island"></div><div class="sbar"><span id="clock" title="">9:41</span><span class="mono" style="font-size:12px">5G ▮▮▮ 82%</span></div>`;
const mh = (sub) =>
  `<div class="mh"><button class="ib" data-a="close" aria-label="ปิดเอกสาร">✕</button><div class="t"><b>${DOC.title}</b><small>${sub || DOC.file}</small></div><button class="ib" data-a="more" aria-label="เพิ่มเติม">⋯</button></div>`;
const ctx = (cert) =>
  `<div class="ctx"><div class="sw"></div><div class="who"><b>ในนาม ${DOC.entity}</b>${DOC.role}</div>${cert || `<span class="cert"><span class="dot"></span>Cert OK</span>`}</div>`;
const seg = () =>
  `<div class="seg" role="tablist">${["สรุป", "เอกสาร", "สอบถาม"].map((t, i) => `<button role="tab" class="${i === S.tab ? "on" : ""}" data-a="tab" data-v="${i}">${t}${i === 2 && S.unread ? '<span class="bdg"></span>' : ""}</button>`).join("")}</div>`;
const chipsRow = () =>
  `<div class="chips"><span class="chip r">SLA วันนี้ 17:00</span><span class="chip a">Tier 3 · &gt;10M</span><span class="chip">จัดซื้อจัดจ้าง</span><span class="chip ok">Legal ✓ 29 ก.ย.</span></div>`;
const fourCards = () => `<div class="g2">
  <div class="card"><span class="l">คู่สัญญา</span><span class="v">${DOC.cp}</span></div>
  <div class="card big"><span class="l">มูลค่าธุรกรรม (THB)</span><span class="v">${DOC.val}</span></div>
  <div class="card"><span class="l">ระยะสัญญา</span><span class="v">${DOC.period}</span></div>
  <div class="card risk"><span class="l">⚠ ความเสี่ยงที่ถูกแฟล็ก</span><span class="v">${DOC.risk}</span></div></div>`;
const cosign =
  () => `<div class="blk"><h5><span>ลำดับผู้ลงนาม · Dual Signers</span><span class="mono">1/2</span></h5>
  <div class="step"><span class="n done">✓</span>CFO · กัญญา (ตัวอย่าง)<small>30 ก.ย. 18:42</small></div>
  <div class="step"><span class="n me">2</span><b>คุณ · CEO</b><small>รอคุณ</small></div></div>`;
const abar = () =>
  `<div class="abar"><button class="btn ghost danger" data-a="reject">ปฏิเสธ</button><button class="btn ghost" data-a="tab" data-v="2">สอบถาม</button>${
    blocked()
      ? `<button class="btn p" data-a="askattach">แจ้งเลขาฯ ให้แนบไฟล์</button>`
      : `<button class="btn p" data-a="guard">ตรวจและลงนาม · ${DOC.pins.length} จุด</button>`
  }</div>`;

/* ================= views ================= */
const V = {
  inbox:
    () => `${sbar()}<div class="ih"><h1>รอลงนาม</h1><span class="ent"><span class="dot"></span>${DOC.entity} ▾</span></div>
 <div class="filters"><span class="on">ทั้งหมด 5</span><span>ด่วน 2</span><span>มูลค่าสูง 1</span><span>รอผู้อื่น</span></div>
 <div class="body">
  <div class="item" data-a="open"><div class="top"><b>${DOC.title}</b><span class="amt">15.45M</span></div>
   <div class="chips"><span class="chip r">SLA วันนี้ 17:00</span><span class="chip a">Tier 3</span><span class="chip">CFO ลงนามแล้ว</span></div>
   <span class="sub">จาก แพรว (เลขาฯ) · ${DOC.cp}</span></div>
  <div class="item" data-a="openv"><div class="top"><b>NDA โครงการ Data Center</b><span class="amt">–</span></div>
   <div class="chips"><span class="chip ok">ลงนามแล้ว</span><span class="chip">ตรวจสอบไฟล์</span></div><span class="sub">ไฟล์ที่ได้รับกลับจากคู่สัญญาทางอีเมล</span></div>
  ${[
    "PO วัสดุสำนักงาน ไตรมาส 4|0.82M|Tier 1",
    "สัญญาเช่าพื้นที่สาขาเชียงใหม่|3.2M|Tier 2",
    "บันทึกแต่งตั้งรักษาการ CIO|–|HR",
  ]
    .map((r) => {
      const [a, b, c] = r.split("|");
      return `<div class="item" data-a="oos"><div class="top"><b>${a}</b><span class="amt">${b}</span></div><div class="chips"><span class="chip">${c}</span></div></div>`;
    })
    .join("")}
 </div>
 <div class="tabbar"><span class="on"><i>▤</i>Inbox</span><span><i>◷</i>ติดตาม</span><span><i>⛨</i>ความปลอดภัย</span></div>`,

  skeleton: () => {
    const bar = (w, h = 14) =>
      `<span class="sk" style="width:${w};height:${h}px"></span>`;
    const card = (w1, w2) =>
      `<div class="card skc" style="gap:8px">${bar("45%", 15)}${bar(w1, 18)}${bar(w2 || "0", 18)}</div>`;
    return `${sbar()}${mh(`<span class="sk i" style="width:62%;height:12px"></span>`)}
 <div class="ctx" style="border-color:var(--line);background:var(--screen)"><span class="sk" style="width:8px;height:24px;border-radius:2px"></span><div class="who skc" style="gap:7px">${bar("70%", 15)}${bar("50%", 13)}</div>${bar("56px", 12)}</div>
 <div class="seg">${["สรุป", "เอกสาร", "สอบถาม"].map((t, i) => `<button disabled class="${i === 0 ? "on" : ""}" style="cursor:default">${t}</button>`).join("")}</div>
 <div class="body" aria-busy="true"><span class="sr">กำลังโหลดเอกสาร</span>
  <div class="chips">${["108px", "104px", "92px", "116px"].map((w) => `<span class="sk" style="width:${w};height:27px;border-radius:4px"></span>`).join("")}</div>
  <div class="g2">${card("85%", "55%")}${card("75%")}${card("80%", "40%")}${card("90%", "60%")}</div>
  <div class="blk">${bar("38%", 14)}${["96%", "60%", "92%", "45%", "88%", "70%"].map((w) => bar(w, 17)).join("")}</div>
  <div class="blk">${bar("46%", 12)}<div style="display:flex;gap:8px;align-items:center"><span class="sk" style="width:24px;height:24px;border-radius:50%"></span>${bar("55%")}</div><div style="display:flex;gap:8px;align-items:center"><span class="sk" style="width:24px;height:24px;border-radius:50%"></span>${bar("35%")}</div></div>
 </div>
 <div class="abar"><button class="btn ghost danger" disabled>ปฏิเสธ</button><button class="btn ghost" disabled>สอบถาม</button><button class="btn p" disabled>กำลังโหลดเอกสาร…</button></div>`;
  },

  loading:
    () => `${sbar()}${mh("กำลังโหลด PDF · 18.6/31.4 MB")}${ctx(`<span class="cert"><span class="dot" style="background:var(--warn)"></span>กำลังตรวจ</span>`)}${seg()}
 <div class="body">${chipsRow()}${fourCards()}
 <div class="banner i">สรุปพร้อมแล้ว อ่านต่อได้ทันที ตัวเอกสารกำลังโหลดอยู่เบื้องหลัง</div>
 <div class="shim" style="height:132px"></div><div class="shim" style="height:96px"></div></div>
 <div class="abar"><button class="btn ghost danger" disabled>ปฏิเสธ</button><button class="btn p" disabled>กำลังตรวจความครบถ้วนไฟล์…</button></div>`,

  doc: () => {
    const body = S.tab === 0 ? summary() : S.tab === 1 ? canvas() : ask();
    return `${sbar()}${mh()}${ctx()}${seg()}${body}${S.tab === 2 ? "" : abar()}`;
  },

  sealing:
    () => `${sbar()}<div class="full"><h3>กำลังผนึกลายมือชื่อดิจิทัลและประทับรับรองเวลา…</h3>
 <div class="prog" id="prog">${[
   ["คำนวณ Document Digest", "SHA-256"],
   ["ขอสิทธิ์ใช้กุญแจลงนาม", "CSC"],
   ["ลงนามใน Cloud HSM", "HSM"],
   ["ประทับเวลาจาก TSA", "RFC 3161"],
   ["ผนึกข้อมูลตรวจสอบระยะยาว", "PAdES-B-LTA"],
 ]
   .map(
     (s, i) =>
       `<div class="ps" data-i="${i}"><span class="ic"></span>${s[0]}<span class="t">${s[1]}</span></div>`,
   )
   .join("")}</div>
 <div class="note" id="sealnote" style="text-align:center">กรุณาอย่าปิดแอป</div></div>`,

  success:
    () => `${sbar()}<div class="full" style="justify-content:flex-start;padding-top:40px">
 <div class="big-ic" style="background:var(--ok)">✓</div><h3>ลงนามแล้ว · เอกสารครบทุกผู้ลงนาม</h3>
 <div class="sigbox">${sigVisual(true)}</div>
 <div><div class="row2"><span>Transaction ID</span><span class="mono" style="font-size:var(--fs-sm)">${S.signedTx}</span></div>
 <div class="row2"><span>มาตรฐาน</span><span class="mono" style="font-size:var(--fs-sm)">PAdES-B-LTA · ${DOC.pins.length} จุด</span></div>
 <div class="row2"><span>สถานะ</span><span>Completed · 2/2</span></div></div>
 <div class="banner ok">แนบ Audit Trail &amp; Certificate of Completion เป็นหน้าสุดท้ายแล้ว</div></div>
 <div class="abar"><button class="btn ghost" data-a="verify">ตรวจสอบลายเซ็น</button><button class="btn p" data-a="inbox">กลับไป Inbox</button></div>`,

  certerr:
    () => `${sbar()}${mh()}${ctx(`<span class="cert" style="color:var(--risk)"><span class="dot r"></span>Revoked</span>`)}
 <div class="full" style="justify-content:flex-start;padding-top:28px"><div class="big-ic" style="background:var(--risk)">!</div><h3>ไม่สามารถลงนามได้</h3>
 <div class="banner r">ใบรับรองดิจิทัลของคุณหมดอายุหรือถูกเพิกถอน กรุณาติดต่อทีมไอทีหรือต่ออายุใบรับรองในแท็บตั้งค่า</div>
 <div><div class="row2"><span>Serial</span><span class="mono" style="font-size:var(--fs-sm)">…${DOC.sn}</span></div><div class="row2"><span>เอกสาร</span><span>ไม่ถูกแก้ไข · ยังรอลงนาม</span></div></div></div>
 <div class="abar"><button class="btn ghost" data-a="toast" data-v="โทรหา IT Helpdesk: 1234">ติดต่อ IT</button><button class="btn p" data-a="toast" data-v="หน้าจัดการใบรับรองไม่อยู่ในขอบเขตการทดสอบนี้">จัดการใบรับรอง</button></div>`,

  neterr: () => `${sbar()}${mh()}${ctx()}
 <div class="full" style="justify-content:flex-start;padding-top:28px"><div class="big-ic" style="background:var(--warn)">⟲</div><h3>การลงนามยังไม่เสร็จสมบูรณ์</h3>
 <div class="banner w">สัญญาณอินเทอร์เน็ตขัดข้อง การลงนามยังไม่เสร็จสมบูรณ์ กรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง</div>
 <div><div class="row2"><span>สถานะเอกสาร</span><span>รอลงนาม</span></div><div class="row2"><span>ไฟล์</span><span>ไม่มีลายเซ็นค้างอยู่</span></div></div></div>
 <div class="abar"><button class="btn ghost" data-a="backdoc">ไว้ทีหลัง</button><button class="btn p" data-a="retrynet">ลองใหม่ด้วย Face ID</button></div>`,

  rejected:
    () => `${sbar()}<div class="full"><div class="big-ic" style="background:var(--muted)">↩</div><h3>ส่งเอกสารกลับให้ผู้ส่งแล้ว</h3>
 <div class="banner i">เหตุผล: ${esc(S.rejectText)}</div><div class="note" style="text-align:center">แพรว (เลขาฯ) ได้รับแจ้งแล้ว เอกสารย้ายไปที่แท็บติดตาม</div></div>
 <div class="abar"><button class="btn p" data-a="inbox">กลับไป Inbox</button></div>`,

  verify: () => {
    const tamper = S.scen.verify === "tamper" && !S.signedTx;
    const head = S.signedTx ? DOC.title : "NDA โครงการ Data Center";
    if (tamper)
      return `${sbar()}<div class="mh"><button class="ib" data-a="inbox" aria-label="ปิด">✕</button><div class="t"><b>${head}</b><small>ไฟล์จากอีเมลภายนอก</small></div></div>${ctx(`<span class="cert" style="color:var(--risk)"><span class="dot r"></span>Invalid</span>`)}
  <div class="body"><div class="banner r" style="font-weight:600;flex-direction:column;gap:2px">✕ เอกสารถูกดัดแปลงหลังการลงนาม · ลายมือชื่อดิจิทัลเป็นโมฆะ<span class="mono" style="font-weight:400;font-size:var(--fs-xs)">Signature Invalid: Document has been altered after signing</span></div>
  <div class="blk" style="opacity:.55"><h5><span>ผู้ลงนาม</span></h5><div class="step"><span class="n">–</span>ผู้แทน คู่สัญญา<small>ไม่ยืนยัน</small></div><div class="step"><span class="n">–</span>สมชาย · CEO<small>ไม่ยืนยัน</small></div></div>
  <div class="blk"><h5><span>สิ่งที่พบ</span></h5><div class="row2"><span>ส่วนที่ถูกแก้</span><span>หน้า 3 (ข้อมูลไม่ตรงกับที่ลงนาม)</span></div></div></div>
  <div class="abar"><button class="btn ghost" data-a="toast" data-v="แจ้ง Compliance แล้ว">แจ้ง Compliance</button><button class="btn p" data-a="toast" data-v="เปิดฉบับต้นฉบับจาก Archive (นอกขอบเขตการทดสอบ)">เปิดฉบับต้นฉบับ</button></div>`;
    return `${sbar()}<div class="mh"><button class="ib" data-a="inbox" aria-label="ปิด">✕</button><div class="t"><b>${head}</b><small>Completed</small></div></div>${ctx()}
  <div class="body"><div class="banner ok">✓ ลายมือชื่อดิจิทัลถูกต้องครบทุกผู้ลงนาม · เอกสารไม่ถูกแก้ไขหลังลงนาม</div>
  <div class="blk"><h5><span>ผู้ลงนาม</span></h5><div class="step"><span class="n done">✓</span>${S.signedTx ? "กัญญา · CFO" : "ผู้แทน คู่สัญญา"}<small>30/09 18:42</small></div><div class="step"><span class="n done">✓</span>สมชาย · CEO<small>${S.signedAt ? S.signedAt.slice(0, 16) : "29/09 10:05"}</small></div></div>
  <div class="blk"><h5><span>รายละเอียดทางเทคนิค</span></h5><div class="row2"><span>ผู้ออกใบรับรอง</span><span>Thai CA (ตัวอย่าง)</span></div><div class="row2"><span>ประทับเวลา</span><span class="mono" style="font-size:var(--fs-sm)">TSA ✓</span></div><div class="row2"><span>ตรวจสอบระยะยาว</span><span class="mono" style="font-size:var(--fs-sm)">LTV ✓</span></div></div></div>
  <div class="abar"><button class="btn p" data-a="inbox">กลับไป Inbox</button></div>`;
  },
};

function summary() {
  return `<div class="body">
  ${chipsRow()}
  ${blocked() ? `<div class="banner w">⚠ ยังลงนามไม่ได้: ไม่พบใบเสนอราคาเปรียบเทียบรายที่ 3 ซึ่งบังคับสำหรับวงเงินเกิน 10 ล้านบาท</div>` : ""}
  ${fourCards()}
  ${
    S.scen.doc === "noai"
      ? `<div class="blk" style="border-style:dashed"><h5><span>สรุปโดย AI</span><span style="color:var(--warn)">ไม่พร้อม</span></h5><div class="note">หน้า 20–42 เป็นภาพสแกนที่อ่านได้ไม่ชัด ระบบจึงยังไม่สรุปเพื่อหลีกเลี่ยงข้อมูลผิด</div></div>
     <div class="blk"><h5><span>บันทึกจากเลขาฯ</span><span class="mono">แพรว · 08:05</span></h5><div style="font-size:var(--fs-md)">ราคาต่ำกว่างบที่บอร์ดอนุมัติ 4% Legal แก้ข้อ 8.2 ตามที่ CFO ขอแล้ว</div></div>`
      : `<div class="blk"><h5><span>สรุปโดย AI</span><span class="mono">จาก 42 หน้า</span></h5>
   <div class="bul"><i>•</i><span>จ้าง ABC พัฒนาและดูแล ERP 12 เดือน แบ่งจ่าย 4 งวด <span class="pref" data-a="jump" data-v="6">น.6</span></span></div>
   <div class="bul"><i>•</i><span>เบี้ยปรับล่าช้า 0.1%/วัน เพดาน 5% ต่ำกว่ามาตรฐาน 10% <span class="pref" data-a="jump" data-v="12">น.12 ข้อ 8.2</span></span></div>
   <div class="bul"><i>•</i><span>ถือ Source code ร่วมกัน ฝ่ายกฎหมายรับทราบแล้ว <span class="pref" data-a="jump" data-v="19">น.19</span></span></div></div>`
  }
  ${cosign()}
  <div class="blk"><h5><span>ไฟล์แนบบังคับ</span>${blocked() ? '<span style="color:var(--warn)">2/3</span>' : '<span style="color:var(--ok)">ครบ 3/3</span>'}</h5>
   <div class="bul"><i>✓</i>มติคณะกรรมการ ครั้งที่ 9/2026</div><div class="bul"><i>✓</i>ใบเสนอราคา ราย A, ราย B</div>
   ${blocked() ? '<div class="bul" style="color:var(--warn)"><i>✕</i>ใบเสนอราคา รายที่ 3 · ยังไม่ได้แนบ</div>' : '<div class="bul"><i>✓</i>ใบเสนอราคา รายที่ 3</div>'}</div>
  <div class="note">ส่งโดย แพรว (เลขาฯ) · “ฝ่ายกฎหมายตรวจแล้ว ขอให้ทันก่อนประชุม 17:00”</div></div>`;
}

function sigVisual(done) {
  return `<div class="scrib">${S.style === "draw" ? "S. Jaidee" : S.style === "seal" ? "⦿ NAVA" : "Somchai J."}</div><div class="meta">Digitally Signed by: ${DOC.name}<br>Date &amp; Time: ${done ? S.signedAt + " UTC+7 (TSA)" : "ใส่จาก TSA ตอนลงนาม"}<br>Reason: ${S.reason} / Authorized Signatory<br>Signer ID: ${DOC.sn}</div>`;
}
function pageHtml(n) {
  let inner = "";
  if (n === 1)
    inner = `<h6>สัญญาจ้างบริการ (Master Service Agreement)</h6>${lines(6, "m")}`;
  else if (n === 6)
    inner = `<h6>ข้อ 4 ค่าบริการและการชำระเงิน</h6><div class="hl" id="hl6" style="color:var(--ink);outline-color:var(--line);background:transparent">ค่าบริการรวม 15,450,000 บาท แบ่งชำระ 4 งวด</div>${lines(5)}`;
  else if (n === 12)
    inner = `<h6>ข้อ 8 ค่าปรับ</h6>${lines(2, "m")}<div class="hl" id="hl12">ข้อ 8.2 เบี้ยปรับ 0.1% ต่อวัน รวมไม่เกิน 5% ของมูลค่าสัญญา</div>${lines(4)}`;
  else if (n === 19)
    inner = `<h6>ข้อ 14 ทรัพย์สินทางปัญญา</h6><div class="hl" id="hl19" style="color:var(--ink);outline-color:var(--line);background:transparent">คู่สัญญาเป็นเจ้าของ Source code ร่วมกัน</div>${lines(5)}`;
  else inner = lines(7, "m");
  const pi = DOC.pins.indexOf(n);
  if (pi > -1) {
    const chosen = S.styleChosen;
    inner += `<div class="pin ${pi === S.pin ? "cur" : ""}" id="pin${pi}" data-a="style"><span class="tag">จุดลงนาม ${pi + 1}/${DOC.pins.length}</span>${chosen ? `<div class="sigbox" style="padding:6px">${sigVisual(false)}</div>` : `<b>แตะเพื่อเลือกรูปแบบลายเซ็น</b>${lines(2)}`}</div>`;
  }
  return `<div class="page" data-p="${n}" id="pg${n}"><span class="pn">น. ${n}</span>${inner}</div>`;
}
function canvas() {
  return `<div class="pdf" id="pdf"><span class="pgind" id="pgind">น. 1 / ${DOC.pages}</span>${Array.from({ length: DOC.pages }, (_, i) => pageHtml(i + 1)).join("")}</div>
  <button class="attbtn" data-a="att">📎 ไฟล์แนบ ${blocked() ? "2" : "3"}</button>
  <div class="fab"><button data-a="pinstep" data-v="-1" aria-label="จุดก่อนหน้า">▲</button><button data-a="pinjump">จุดที่ ${S.pin + 1} จาก ${DOC.pins.length}</button><button data-a="pinstep" data-v="1" aria-label="จุดถัดไป">▼</button></div>`;
}
function ask() {
  const th = S.questions
    .map(
      (q) =>
        `<div class="msg ${q.me ? "me" : "them"}">${esc(q.t)}<small>${q.who} · ${q.time}</small></div>`,
    )
    .join("");
  return `<div class="body" style="gap:8px">${th || `<div class="note" style="text-align:center;padding:24px 10px">ยังไม่มีคำถามในเอกสารนี้<br>ข้อความในนี้เห็นเฉพาะทีมภายใน และไม่ถูกบันทึกลงในเอกสาร</div>`}</div>
  <div class="abar" style="flex-direction:column;align-items:stretch">
   <div class="tabs">${["แพรว (เลขาฯ)", "ฝ่ายกฎหมาย", "CFO"].map((t, i) => `<button class="${i === S.askTo ? "on" : ""}" data-a="askto" data-v="${i}">${t}</button>`).join("")}</div>
   <div style="display:flex;gap:8px;align-items:flex-end"><textarea id="draft" rows="2" style="min-height:48px" placeholder="พิมพ์คำถาม เช่น อ้างถึงข้อ 8.2">${esc(S.draft)}</textarea><button class="btn p" style="flex:0 0 auto" data-a="send">ส่ง</button></div></div>`;
}

/* ---------- sheets ---------- */
const SHEETS = {
  guard:
    () => `<div class="scrim" data-a="closesheet"></div><div class="sheet" role="dialog" aria-label="ตรวจทานก่อนลงนาม"><div class="grab"></div>
  <div class="sh"><b>ตรวจทานก่อนลงนาม</b><button class="ib" data-a="closesheet" aria-label="ปิด">✕</button></div>
  <div class="sb">
   <div class="banner i">คุณกำลังลงนามในนาม&nbsp;<b>${DOC.entity}</b></div>
   <div>
    <div class="row2"><span>คู่สัญญา</span><span>${DOC.cp}</span></div>
    <div class="row2"><span>มูลค่า</span><span class="mono" style="font-size:var(--fs-lg);font-weight:600">${DOC.val} THB</span></div>
    <div class="row2"><span>ไฟล์แนบบังคับ</span><span style="color:var(--ok)">✓ ครบ 3/3</span></div>
    <div class="row2"><span>จุดลงนาม</span><span>${DOC.pins.length} จุด · ${S.style === "draw" ? "เซ็นสด" : S.style === "seal" ? "ตราประทับ" : "ลายเซ็นที่ลงทะเบียนไว้"}</span></div>
    <div class="row2"><span>เหตุผลการลงนาม</span><select id="reason" aria-label="เหตุผลการลงนาม">${["Approved", "Agreed", "Certified"].map((r) => `<option ${r === S.reason ? "selected" : ""}>${r}</option>`).join("")}</select></div>
    <div class="row2"><span>ใบรับรอง</span><span class="mono" style="font-size:var(--fs-sm)"><span class="dot"></span> ใช้ได้ · Cloud HSM · …${DOC.sn}</span></div>
   </div>
   <div class="intent ${S.intent ? "on" : ""}" data-a="intent" role="checkbox" aria-checked="${S.intent}" tabindex="0"><span class="box">${S.intent ? "✓" : ""}</span><span>ข้าพเจ้าได้ตรวจสอบและตกลงผูกพันตามเอกสารฉบับนี้</span></div>
  </div>
  <div class="sf">${slider()}<div class="note" id="slidenote" style="text-align:center">${S.intent ? "ลากไปจนสุดแถบเพื่อยืนยันด้วย Face ID" : "ติ๊กยืนยันเจตนาก่อน ปุ่มลงนามจึงจะทำงาน"}</div></div></div>`,

  style:
    () => `<div class="scrim" data-a="closesheet"></div><div class="sheet"><div class="grab"></div><div class="sh"><b>รูปแบบลายเซ็น</b><span class="note">ใช้กับทั้ง ${DOC.pins.length} จุด</span></div>
  <div class="sb">${[
    ["stamp", "ลายเซ็นที่ลงทะเบียนไว้ · อัปเดต 12 ส.ค."],
    ["draw", "เซ็นสดด้วยนิ้ว (เดโม: ใช้ภาพตัวอย่าง)"],
    ["seal", "ตราประทับนิติบุคคล"],
  ]
    .map(
      ([k, t]) =>
        `<div class="opt ${S.style === k ? "on" : ""}" data-a="pickstyle" data-v="${k}"><span class="radio"></span>${t}</div>`,
    )
    .join("")}
   <div class="sigbox">${sigVisual(false)}</div></div>
  <div class="sf"><button class="btn p full" data-a="stylesave">ใช้รูปแบบนี้</button></div></div>`,

  att: () => `<div class="scrim" data-a="closesheet"></div><div class="sheet" style="max-height:62%"><div class="grab"></div>
  <div class="sh"><div class="tabs">${["ใบเสนอราคา", "มติบอร์ด"].map((t, i) => `<button class="${i === S.attTab ? "on" : ""}" data-a="atttab" data-v="${i}">${t}</button>`).join("")}</div><button class="ib" data-a="closesheet" aria-label="ปิด">✕</button></div>
  <div class="sb">${
    S.attTab === 0
      ? `<div class="page" style="min-height:0"><span class="pn">แนบ 2 · น.1</span><h6>สรุปใบเสนอราคาเปรียบเทียบ</h6>
     <div class="row2"><span>ABC (ผู้ชนะ)</span><span class="mono">15,450,000</span></div><div class="row2"><span>ราย A</span><span class="mono">16,980,000</span></div>
     ${blocked() ? `<div class="row2"><span>ราย B</span><span class="mono">17,200,000</span></div><div class="banner w">ไม่พบใบเสนอราคารายที่ 3</div>` : `<div class="row2"><span>ราย B</span><span class="mono">17,200,000</span></div><div class="row2"><span>ราย C</span><span class="mono">16,450,000</span></div>`}
     <div class="hl" style="color:var(--ok);outline-color:var(--ok);background:color-mix(in srgb,var(--ok) 14%,transparent)">ต่ำสุดในทุกราย · ต่ำกว่างบที่อนุมัติ 4%</div></div>`
      : `<div class="page" style="min-height:0"><span class="pn">แนบ 1 · น.1</span><h6>มติคณะกรรมการ ครั้งที่ 9/2026</h6>${lines(3)}<div class="hl" style="color:var(--ink);outline-color:var(--line);background:transparent">อนุมัติงบโครงการ ERP ไม่เกิน 16,100,000 บาท</div>${lines(2)}</div>`
  }</div></div>`,

  reject:
    () => `<div class="scrim" data-a="closesheet"></div><div class="sheet"><div class="grab"></div><div class="sh"><b>ปฏิเสธและส่งกลับ</b><button class="ib" data-a="closesheet" aria-label="ปิด">✕</button></div>
  <div class="sb"><div class="note">ผู้ส่งจะได้รับเหตุผลนี้ และเอกสารจะออกจากรายการรอลงนามของคุณ</div>
   <div class="tabs">${["ข้อ 8.2 ต้องเจรจาใหม่", "ขาดเอกสารประกอบ", "ขอเลื่อนเข้าประชุม"].map((t) => `<button data-a="rejpick" data-v="${t}">${t}</button>`).join("")}</div>
   <textarea id="rejtxt" placeholder="ระบุเหตุผล (จำเป็น)">${esc(S.rejectText)}</textarea></div>
  <div class="sf"><button class="hold" id="hold" ${S.rejectText.trim() ? "" : "disabled"}><span class="hf"></span><span>กดค้างเพื่อยืนยันการปฏิเสธ</span></button></div></div>`,
};

function slider() {
  const off = !S.intent;
  return `<div class="slide ${off ? "off" : "armed"}" id="slide" tabindex="${off ? -1 : 0}" role="slider" aria-label="เลื่อนเพื่อลงนาม" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" ${off ? 'aria-disabled="true"' : ""}>
   <div class="fill"></div><div class="lbl">${off ? "เลื่อนเพื่อลงนาม" : "เลื่อนเพื่อลงนามด้วย Face ID  ›››"}</div><div class="knob">${off ? "🔒" : "›"}</div></div>`;
}

/* ---------- overlays ---------- */
const OVER = {
  face: () => {
    const fs = S.faceState;
    const title =
      fs === "bad" ? "ไม่รู้จักใบหน้า" : fs === "good" ? "สำเร็จ" : "Face ID";
    const msg =
      fs === "bad"
        ? `ลองอีกครั้ง (${S.faceTry}/3)`
        : `ยืนยันตัวตนเพื่อปลดล็อกใบรับรองดิจิทัลและลงนามในเอกสาร “${DOC.title}”`;
    return `<div class="scrim" style="z-index:30"></div><div class="sysd" role="alertdialog" aria-label="Face ID"><div class="face ${fs === "scan" ? "scan" : fs}">${fs === "bad" ? "✕" : fs === "good" ? "✓" : "☺"}</div><b>${title}</b><p>${msg}</p>
  <div class="act"><button data-a="facecancel">ยกเลิก</button>${fs === "bad" ? `<button data-a="faceretry">ลองอีกครั้ง</button>` : ""}</div></div>`;
  },
  pin: () => `<div class="scrim" style="z-index:30"></div><div class="sheet" style="z-index:31;max-height:84%"><div class="grab"></div><div class="sh"><b>ใส่ Signer Security PIN</b><button class="ib" data-a="facecancel" aria-label="ยกเลิก">✕</button></div>
  <div class="sb" style="text-align:center"><div class="note">Face ID ถูกล็อกชั่วคราว ใช้ PIN 6 หลักที่ตั้งไว้ตอนลงทะเบียนใบรับรอง<br><b style="color:var(--ink)">ใช้รหัสปลดล็อกเครื่องแทนไม่ได้</b></div>
  <div class="pins" id="pins">${Array.from({ length: 6 }, (_, i) => `<i class="${i < S.pinCode.length ? "f" : ""}"></i>`).join("")}</div>
  <div class="pad">${["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k) => (k === "" ? `<button class="e" tabindex="-1" aria-hidden="true"></button>` : `<button data-a="key" data-v="${k}" aria-label="${k === "⌫" ? "ลบ" : k}">${k}</button>`)).join("")}</div>
  <div class="note" style="padding-bottom:10px">PIN สำหรับทดสอบ: ตัวเลข 6 หลักใดก็ได้</div></div></div>`,
};

/* ================= render ================= */
/* render แยกเป็น 4 เลเยอร์ (หน้า / sheet / overlay / toast)
   อัปเดตเฉพาะเลเยอร์ที่เปลี่ยนจริง → ไม่กระพริบ ไม่เล่นแอนิเมชันซ้ำ ไม่เสียตำแหน่งเลื่อนหรือโฟกัส */
const L = {};
function setLayer(id, key, html) {
  const el = $("#" + id),
    prev = L[id] || {};
  if (prev.html === html) return false;
  const same = prev.key === key && key != null;
  const scroll = same
    ? [...el.querySelectorAll(".body,.pdf,.sb")].map((n) => n.scrollTop)
    : null;
  const ae = document.activeElement,
    fid = same && ae && el.contains(ae) && ae.id ? ae.id : null;
  const sel =
    fid && "selectionStart" in ae ? [ae.selectionStart, ae.selectionEnd] : null;
  el.innerHTML = html;
  el.classList.toggle("in", !same && !!html);
  if (scroll)
    el.querySelectorAll(".body,.pdf,.sb").forEach((n, i) => {
      if (scroll[i] != null) n.scrollTop = scroll[i];
    });
  if (fid) {
    const f = $("#" + fid);
    if (f) {
      f.focus({ preventScroll: true });
      if (sel)
        try {
          f.setSelectionRange(...sel);
        } catch (e) {}
    }
  }
  L[id] = { key, html };
  return true;
}
function render() {
  const vk = S.view === "doc" ? "doc:" + S.tab : S.view;
  setLayer("lv", vk, V[S.view]());
  setLayer("ls", S.sheet, S.sheet ? SHEETS[S.sheet]() : "");
  setLayer("lo", S.overlay, S.overlay ? OVER[S.overlay]() : "");
  setLayer(
    "lt",
    S.toast,
    S.toast ? `<div class="toast" role="status">${esc(S.toast)}</div>` : "",
  );
  bindSlider();
  bindHold();
  bindPdf();
  bindClock();
  const d = $("#draft");
  if (d) d.oninput = (e) => (S.draft = e.target.value);
  const rt = $("#rejtxt");
  if (rt)
    rt.oninput = (e) => {
      S.rejectText = e.target.value;
      const b = $("#hold");
      if (b) b.disabled = !S.rejectText.trim();
    };
  const rs = $("#reason");
  if (rs)
    rs.onchange = (e) => {
      S.reason = e.target.value;
      ev("reason_" + S.reason);
    };
}
/* ย่อทั้งเครื่องให้พอดีหน้าต่าง (เดสก์ท็อป) · มือถือแสดงเต็มจอ */
let SCALE = 1;
function fit() {
  SCALE = matchMedia("(max-width:520px)").matches
    ? 1
    : Math.min(1, (innerHeight - 32) / 956, (innerWidth - 32) / 440);
  document.documentElement.style.setProperty("--s", SCALE);
}
addEventListener("resize", fit);
fit();
function toast(t, ms = 2600) {
  S.toast = t;
  render();
  later(() => {
    S.toast = null;
    render();
  }, ms);
}

/* ================= interactions ================= */
function openDoc() {
  reset();
  S.view = "skeleton";
  S.tab = 0;
  ev("open_doc");
  render();
  const wait = S.scen.load === "slow" ? 3500 : 900;
  later(() => {
    if (S.view !== "skeleton") return;
    S.view = "loading";
    ev("summary_ready");
    render();
    later(() => {
      if (S.view !== "loading") return;
      S.view = "doc";
      ev("doc_ready");
      render();
    }, 1100);
  }, wait);
}
function jumpPage(n) {
  S.tab = 1;
  S.sheet = null;
  render();
  const pg = $("#pg" + n),
    pdf = $("#pdf");
  if (!pg || !pdf) return;
  pdf.scrollTo({ top: pg.offsetTop - 12, behavior: "smooth" });
  const hl = $("#hl" + n);
  if (hl) {
    hl.classList.add("flash");
    later(() => hl.classList.remove("flash"), 2000);
  }
}
function jumpPin() {
  S.tab = 1;
  render();
  const el = $("#pin" + S.pin),
    pdf = $("#pdf");
  if (!el || !pdf) return;
  const pg = el.closest(".page");
  pdf.scrollTo({
    top: pg.offsetTop + el.offsetTop - pdf.clientHeight / 2 + 40,
    behavior: "smooth",
  });
}
function bindPdf() {
  const pdf = $("#pdf");
  if (!pdf) return;
  const ind = $("#pgind");
  let hide;
  pdf.onscroll = () => {
    const pages = pdf.querySelectorAll(".page");
    let cur = 1;
    for (const p of pages) {
      if (p.offsetTop - pdf.scrollTop < pdf.clientHeight * 0.4)
        cur = +p.dataset.p;
      else break;
    }
    ind.textContent = `น. ${cur} / ${DOC.pages}`;
    ind.style.opacity = 1;
    clearTimeout(hide);
    hide = setTimeout(() => (ind.style.opacity = 0), 1500);
  };
}
function startFace() {
  S.overlay = "face";
  S.faceState = "scan";
  render();
  later(() => {
    const sc = S.scen.face;
    const willFail = (sc === "fail1" && S.faceTry === 0) || sc === "lockout";
    if (willFail) {
      S.faceTry++;
      KPI.faceFail++;
      ev("faceid_fail_" + S.faceTry);
      if (S.faceTry >= 3) {
        S.overlay = "pin";
        S.pinCode = "";
        ev("biometric_lockout");
        render();
        return;
      }
      S.faceState = "bad";
      render();
      vibrate([40, 60, 40]);
    } else {
      S.faceState = "good";
      render();
      ev("faceid_ok");
      later(() => startSeal(), 400);
    }
  }, 1100);
}
function startSeal() {
  S.overlay = null;
  S.sheet = null;
  S.view = "sealing";
  render();
  const steps = [...document.querySelectorAll("#prog .ps")],
    dt = 480;
  const outcome = S.scen.outcome;
  const stopAt = outcome === "cert" ? 2 : outcome === "net" ? 2 : steps.length;
  steps.forEach((el, i) => {
    if (i <= stopAt)
      later(() => {
        if (i > 0) {
          steps[i - 1].className = "ps done";
          steps[i - 1].querySelector(".ic").textContent = "✓";
        }
        if (i < steps.length) el.className = "ps on";
      }, i * dt);
  });
  if (outcome === "ok") {
    later(() => {
      const l = steps[steps.length - 1];
      l.className = "ps done";
      l.querySelector(".ic").textContent = "✓";
    }, steps.length * dt);
    later(
      () => {
        S.signedAt = fmtNow();
        S.signedTx = "TX-" + Date.now().toString(36).toUpperCase().slice(-8);
        S.view = "success";
        S.styleChosen = true;
        ev(`SIGNED · time_to_sign=${((Date.now() - S.t0) / 1000).toFixed(1)}s`);
        vibrate(30);
        render();
      },
      steps.length * dt + 450,
    );
  } else if (outcome === "cert") {
    later(
      () => {
        S.view = "certerr";
        ev("error_cert_revoked");
        render();
      },
      3 * dt + 500,
    );
  } else {
    later(
      () => {
        const n = $("#sealnote");
        if (n) n.textContent = "ใช้เวลานานกว่าปกติ กำลังลองเชื่อมต่อ…";
      },
      3 * dt + 600,
    );
    later(
      () => {
        S.view = "neterr";
        ev("error_network_rollback");
        render();
      },
      3 * dt + 4000,
    );
  }
}
const vibrate = (p) => {
  try {
    navigator.vibrate && navigator.vibrate(p);
  } catch (e) {}
};

/* slider */
function bindSlider() {
  const el = $("#slide");
  if (!el || el.classList.contains("off") || el._b) return;
  el._b = 1;
  const knob = el.querySelector(".knob"),
    fill = el.querySelector(".fill"),
    lbl = el.querySelector(".lbl");
  let drag = false,
    sx = 0,
    p = 0,
    t0 = 0,
    crossed = false;
  const W = () => (el.clientWidth - 60) * SCALE; // pointer px อยู่ในหน่วยหลังย่อ
  const set = (v) => {
    p = Math.max(0, Math.min(1, v));
    knob.style.left = `calc(4px + ${p} * (100% - 60px))`;
    fill.style.width = `calc(60px + ${p} * (100% - 60px))`;
    lbl.textContent =
      p >= 0.92
        ? "ปล่อยเพื่อสแกน Face ID"
        : "เลื่อนเพื่อลงนามด้วย Face ID  ›››";
    el.setAttribute("aria-valuenow", Math.round(p * 100));
    if (p >= 0.92 && !crossed) {
      crossed = true;
      vibrate(15);
    }
    if (p < 0.92) crossed = false;
  };
  const fire = () => {
    if (Date.now() - t0 < 120) {
      springBack();
      $("#slidenote").textContent = "ลากช้าลงอีกนิด";
      ev("slide_too_fast");
      return;
    }
    set(1);
    ev("slide_complete");
    later(startFace, 150);
  };
  const springBack = () => {
    knob.style.transition = "left .25s cubic-bezier(.3,1.4,.5,1)";
    fill.style.transition = "width .25s";
    set(0);
  };
  knob.addEventListener("pointerdown", (e) => {
    drag = true;
    t0 = Date.now();
    sx = e.clientX - p * W();
    knob.setPointerCapture(e.pointerId);
    knob.style.transition = "none";
    fill.style.transition = "none";
  });
  knob.addEventListener("pointermove", (e) => {
    if (drag) set((e.clientX - sx) / W());
  });
  const end = () => {
    if (!drag) return;
    drag = false;
    if (p >= 0.92) fire();
    else {
      if (p > 0.15) {
        KPI.slipRelease++;
        ev("slide_released_early");
      }
      springBack();
    }
  };
  knob.addEventListener("pointerup", end);
  knob.addEventListener("pointercancel", end);
  el.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (!t0) t0 = Date.now() - 500;
      set(p + 0.2);
      if (p >= 0.92) fire();
    }
    if (e.key === "ArrowLeft" || e.key === "Escape") set(0);
  });
}
/* hold to confirm */
function bindHold() {
  const b = $("#hold");
  if (!b || b._b) return;
  b._b = 1;
  const f = b.querySelector(".hf");
  let raf, start;
  const tick = () => {
    const k = Math.min(1, (Date.now() - start) / 1500);
    f.style.width = k * 100 + "%";
    if (k >= 1) {
      stop();
      ev("rejected");
      S.sheet = null;
      S.view = "rejected";
      vibrate(30);
      render();
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
  };
  b.addEventListener("pointerdown", (e) => {
    if (b.disabled) return;
    start = Date.now();
    b.setPointerCapture(e.pointerId);
    tick();
  });
  const up = () => {
    stop();
    f.style.transition = "width .2s";
    f.style.width = "0";
    setTimeout(() => (f.style.transition = ""), 200);
  };
  b.addEventListener("pointerup", up);
  b.addEventListener("pointercancel", up);
  b.addEventListener("pointerleave", up);
}
/* facilitator: long-press the clock (or press F) */
function bindClock() {
  const c = $("#clock");
  if (!c) return;
  let t;
  c.onpointerdown = () => {
    t = setTimeout(toggleFac, 700);
  };
  c.onpointerup = c.onpointerleave = () => clearTimeout(t);
}
document.addEventListener("keydown", (e) => {
  if (
    (e.key === "f" || e.key === "F") &&
    !/TEXTAREA|INPUT|SELECT/.test(document.activeElement.tagName)
  )
    toggleFac();
});
let tripleN = 0,
  tripleT;
document.addEventListener("pointerdown", (e) => {
  // fallback for phones without status bar: 3-finger... use triple tap top-left corner
  if (e.clientX < 40 && e.clientY < 60) {
    tripleN++;
    clearTimeout(tripleT);
    tripleT = setTimeout(() => (tripleN = 0), 600);
    if (tripleN >= 3) {
      tripleN = 0;
      toggleFac();
    }
  }
});
function toggleFac() {
  const f = $("#fac");
  f.hidden = !f.hidden;
  if (!f.hidden) renderFac();
}
function renderFac() {
  const r = (k, opts) =>
    opts
      .map(
        ([v, t]) =>
          `<label><input type="radio" name="${k}" value="${v}" ${S.scen[k] === v ? "checked" : ""}> ${t}</label>`,
      )
      .join("");
  $("#fac").innerHTML =
    `<h4>Facilitator <button class="ib" style="width:24px;height:24px;font-size:12px" data-f="close">✕</button></h4>
  <fieldset><legend>Face ID</legend>${r("face", [
    ["ok", "ผ่านทันที"],
    ["fail1", "ไม่ผ่าน 1 ครั้ง แล้วผ่าน"],
    ["lockout", "ไม่ผ่าน 3 ครั้ง → PIN"],
  ])}</fieldset>
  <fieldset><legend>ผลการผนึกลายเซ็น</legend>${r("outcome", [
    ["ok", "สำเร็จ"],
    ["cert", "ใบรับรองถูกเพิกถอน"],
    ["net", "เน็ตหลุด (Rollback)"],
  ])}</fieldset>
  <fieldset><legend>เอกสาร MSA</legend>${r("doc", [
    ["normal", "ปกติ"],
    ["blocked", "ขาดไฟล์แนบ (บล็อก)"],
    ["noai", "AI สรุปไม่ได้"],
  ])}</fieldset>
  <fieldset><legend>ความเร็วโหลดเอกสาร</legend>${r("load", [
    ["normal", "ปกติ (~1 วินาที)"],
    ["slow", "ช้า (~3.5 วินาที)"],
  ])}</fieldset>
  <fieldset><legend>ไฟล์ NDA</legend>${r("verify", [
    ["valid", "ลายเซ็นถูกต้อง"],
    ["tamper", "ถูกดัดแปลง"],
  ])}</fieldset>
  <div class="kpi"><div>ปล่อยสไลด์ก่อนสุด<b>${KPI.slipRelease}</b></div><div>Face ID ไม่ผ่าน<b>${KPI.faceFail}</b></div></div>
  <div style="display:flex;gap:6px;margin-bottom:8px"><button class="btn ghost" style="height:32px;font-size:12px;flex:1" data-f="restart">เริ่มรอบใหม่</button><button class="btn ghost" style="height:32px;font-size:12px;flex:1" data-f="copy">คัดลอก Log</button></div>
  <div class="log" id="flog">${S.log.length ? esc(S.log.join("\n")) : "ยังไม่มีเหตุการณ์"}</div>
  <div class="note" style="margin-top:6px">เปิด/ปิดแผงนี้: กดค้างที่นาฬิกา, แตะมุมซ้ายบน 3 ครั้ง หรือกดปุ่ม F</div>`;
  const lg = $("#flog");
  lg.scrollTop = lg.scrollHeight;
}
$("#fac").addEventListener("change", (e) => {
  if (e.target.name) {
    S.scen[e.target.name] = e.target.value;
    ev(`scenario ${e.target.name}=${e.target.value}`);
    if (S.view === "doc") render();
  }
});
$("#fac").addEventListener("click", (e) => {
  const f = e.target.closest("[data-f]");
  if (!f) return;
  if (f.dataset.f === "close") toggleFac();
  if (f.dataset.f === "restart") {
    S.log.length = 0;
    KPI.slipRelease = 0;
    KPI.faceFail = 0;
    reset();
    render();
    renderFac();
  }
  if (f.dataset.f === "copy") {
    const t = S.log.join("\n");
    navigator.clipboard
      ?.writeText(t)
      .then(() => (f.textContent = "คัดลอกแล้ว"))
      .catch(() => {
        const r = document.createRange();
        r.selectNodeContents($("#flog"));
        getSelection().removeAllRanges();
        getSelection().addRange(r);
      });
  }
});

/* main click router */
$("#scr").addEventListener("click", (e) => {
  const el = e.target.closest("[data-a]");
  if (!el) return;
  const a = el.dataset.a,
    v = el.dataset.v;
  switch (a) {
    case "open":
      openDoc();
      break;
    case "openv":
      reset();
      S.view = "verify";
      ev("open_nda_verify_" + S.scen.verify);
      render();
      break;
    case "oos":
      toast("เอกสารนี้ไม่อยู่ในขอบเขตการทดสอบ");
      break;
    case "close":
    case "inbox":
      ev("close_to_inbox");
      S.view = "inbox";
      S.sheet = null;
      S.overlay = null;
      render();
      break;
    case "more":
      toast("เมนูเพิ่มเติมไม่อยู่ในขอบเขตการทดสอบ");
      break;
    case "tab":
      S.tab = +v;
      if (S.tab === 2) S.unread = false;
      S.sheet = null;
      ev("tab_" + ["summary", "document", "ask"][S.tab]);
      render();
      if (S.tab === 1) jumpPin();
      break;
    case "jump":
      ev("ai_ref_page_" + v);
      jumpPage(+v);
      break;
    case "pinstep":
      S.pin = (S.pin + +v + DOC.pins.length) % DOC.pins.length;
      ev("jump_pin_" + (S.pin + 1));
      jumpPin();
      break;
    case "pinjump":
      jumpPin();
      break;
    case "style":
      S.sheet = "style";
      ev("open_signature_style");
      render();
      break;
    case "pickstyle":
      S.style = v;
      render();
      break;
    case "stylesave":
      S.styleChosen = true;
      S.sheet = null;
      ev("style_" + S.style);
      render();
      break;
    case "att":
      S.sheet = "att";
      ev("open_attachments");
      render();
      break;
    case "atttab":
      S.attTab = +v;
      render();
      break;
    case "guard":
      S.sheet = "guard";
      S.intent = false;
      ev("open_guardrail");
      render();
      break;
    case "intent":
      S.intent = !S.intent;
      ev("intent_" + (S.intent ? "checked" : "unchecked"));
      render();
      break;
    case "closesheet":
      if (S.sheet === "guard") ev("guardrail_closed");
      S.sheet = null;
      render();
      break;
    case "facecancel":
      ev("faceid_cancel");
      S.overlay = null;
      S.faceTry = 0;
      S.pinCode = "";
      render();
      toast("ยกเลิกแล้ว ไม่มีการลงนามหรือบันทึกใดๆ");
      break;
    case "faceretry":
      startFace();
      break;
    case "key":
      if (v === "⌫") S.pinCode = S.pinCode.slice(0, -1);
      else if (S.pinCode.length < 6) S.pinCode += v;
      render();
      if (S.pinCode.length === 6) {
        ev("signer_pin_ok");
        later(startSeal, 300);
      }
      break;
    case "retrynet":
      S.view = "doc";
      S.sheet = "guard";
      S.intent = true;
      ev("retry_after_network");
      render();
      startFace();
      break;
    case "backdoc":
      S.view = "doc";
      S.tab = 0;
      render();
      break;
    case "verify":
      S.view = "verify";
      render();
      break;
    case "reject":
      S.sheet = "reject";
      S.rejectText = "";
      ev("open_reject");
      render();
      break;
    case "rejpick":
      S.rejectText = v;
      render();
      break;
    case "askattach":
      S.tab = 2;
      S.askTo = 0;
      S.draft = "รบกวนแนบใบเสนอราคาเปรียบเทียบรายที่ 3 ด้วยครับ";
      ev("ask_missing_attachment");
      render();
      break;
    case "askto":
      S.askTo = +v;
      render();
      break;
    case "send": {
      const t = (S.draft || "").trim();
      if (!t) {
        toast("พิมพ์คำถามก่อนส่ง");
        break;
      }
      const who = ["แพรว (เลขาฯ)", "ฝ่ายกฎหมาย", "CFO"][S.askTo];
      const tm = new Date().toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      });
      S.questions.push({ me: true, t, who: "ถึง " + who, time: tm });
      S.draft = "";
      ev("question_sent_to_" + ["secretary", "legal", "cfo"][S.askTo]);
      render();
      later(() => {
        S.questions.push({
          me: false,
          t:
            S.askTo === 1
              ? "ข้อ 8.2 ABC ขอลดเพดาน เราแลกกับส่วนลด 3% ครับ"
              : "รับทราบค่ะ กำลังตรวจสอบและจะตอบภายใน 15 นาที",
          who: who,
          time: new Date().toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
        if (S.tab !== 2) S.unread = true;
        if (S.view === "doc") render();
      }, 3500);
      break;
    }
    case "toast":
      toast(v);
      break;
  }
});
render();
