import { all, get, put, del, getSetting, setSetting, exportAll, importAll } from './db.js';
import { toFa, num, fmt, rial, esc, words, showDate, longDate, isoToday, isoToJ, jToIso, parseJ, MONTHS, jMonthKey } from './util.js';

const $ = s => document.querySelector(s), view = $('#view');
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2200); };
const sheet = html => new Promise(res => { const d = document.createElement('div'); d.className = 'dlg'; d.innerHTML = `<div>${html}</div>`; d.onclick = e => { if (e.target === d) { d.remove(); res(null); } }; document.body.append(d); d.close = v => { d.remove(); res(v); }; d.res = res; sheet.cur = d; });
const confirmBox = msg => { const p = sheet(`<h3>${msg}</h3><div class="btns"><button class="btn red" id="y">بله</button><button class="btn sec" id="n">انصراف</button></div>`); const d = sheet.cur; d.querySelector('#y').onclick = () => d.close(true); d.querySelector('#n').onclick = () => d.close(false); return p; };
const ask = confirmBox;

function chrome({ title, back, fab, act } = {}) {
  $('#title').textContent = title || 'فاکتورساز';
  $('#back').hidden = !back; $('#back').onclick = () => (typeof back === 'string' ? (location.hash = back) : history.back());
  $('#fab').hidden = !fab; $('#fab').onclick = fab || null;
  $('#topact').innerHTML = act ? `<button>${act.label}</button>` : ''; if (act) $('#topact button').onclick = act.fn;
}
// ---------- فروشگاه‌ها (چند کسب‌وکار) ----------
const shops = async () => {
  let l = await getSetting('shops');
  if (!l) { const old = await getSetting('biz', {}); l = [{ id: 's1', name: 'فروشگاه من', ...old }]; await setSetting('shops', l); await setSetting('activeShop', 's1'); }
  return l;
};
const activeShop = async () => { const l = await shops(); const id = await getSetting('activeShop', l[0].id); return l.find(x => x.id === id) || l[0]; };
const shopById = async id => { const l = await shops(); return l.find(x => x.id === id) || activeShop(); };
const inShop = (i, sh) => (i.shopId || 's1') === sh.id;
const readLogo = (file, cb) => { const img = new Image(); img.onload = () => { const k = Math.min(1, 300 / img.width), c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); cb(c.toDataURL('image/png')); }; img.src = URL.createObjectURL(file); };
const empty = (i, t) => `<div class="empty"><b>${i}</b>${t}</div>`;

/* ---------- مشتریان ---------- */
async function customers() {
  chrome({ title: 'مشتریان', fab: () => (location.hash = '#/customer/new') });
  const list = (await all('customers')).sort((a, b) => a.name.localeCompare(b.name, 'fa'));
  view.innerHTML = `<input class="search" id="q" placeholder="جستجوی نام یا تلفن…"><div id="l"></div>`;
  const draw = q => { const r = list.filter(c => (c.name + c.phone).includes(q)); $('#l').innerHTML = r.length ? r.map(c => `<a class="card item" href="#/customer/${c.id}"><div class="big">${esc(c.name)}</div><div class="sub">${toFa(esc(c.phone || ''))} ${c.address ? '· ' + esc(c.address) : ''}</div></a>`).join('') : empty('👥', 'مشتری‌ای ثبت نشده'); };
  draw(''); $('#q').oninput = e => draw(e.target.value);
}
async function customerForm(id) {
  const c = id === 'new' ? {} : await get('customers', +id);
  chrome({ title: id === 'new' ? 'مشتری جدید' : 'ویرایش مشتری', back: '#/customers' });
  view.innerHTML = `<div class="card"><label>نام مشتری *<input id="name" value="${esc(c.name || '')}"></label><label>تلفن<input id="phone" inputmode="tel" value="${esc(c.phone || '')}"></label><label>آدرس<textarea id="addr" rows="2">${esc(c.address || '')}</textarea></label><label>کد ملی / شناسه اقتصادی<input id="nid" value="${esc(c.nid || '')}"></label></div><button class="btn" id="s">ذخیره</button>${c.id ? '<br><button class="btn red" id="d">حذف مشتری</button>' : ''}`;
  $('#s').onclick = async () => { const name = $('#name').value.trim(); if (!name) return toast('نام را وارد کنید'); await put('customers', { ...c, name, phone: $('#phone').value.trim(), address: $('#addr').value.trim(), nid: $('#nid').value.trim() }); toast('ذخیره شد'); location.hash = '#/customers'; };
  if (c.id) $('#d').onclick = async () => { if (await ask('این مشتری حذف شود؟')) { await del('customers', c.id); location.hash = '#/customers'; } };
}

/* ---------- کالاها ---------- */
async function products() {
  chrome({ title: 'کالاها و خدمات', fab: () => (location.hash = '#/product/new') });
  const list = (await all('products')).sort((a, b) => a.name.localeCompare(b.name, 'fa'));
  view.innerHTML = `<input class="search" id="q" placeholder="جستجوی کالا…"><div id="l"></div>`;
  const draw = q => { const r = list.filter(p => p.name.includes(q)); $('#l').innerHTML = r.length ? r.map(p => `<a class="card item" href="#/product/${p.id}"><div class="row"><div class="big">${esc(p.name)}</div><div>${rial(p.price)}</div></div><div class="sub">واحد: ${esc(p.unit || 'عدد')}</div></a>`).join('') : empty('📦', 'کالایی ثبت نشده'); };
  draw(''); $('#q').oninput = e => draw(e.target.value);
}
async function productForm(id) {
  const p = id === 'new' ? {} : await get('products', +id);
  chrome({ title: id === 'new' ? 'کالای جدید' : 'ویرایش کالا', back: '#/products' });
  view.innerHTML = `<div class="card"><label>نام کالا / خدمت *<input id="name" value="${esc(p.name || '')}"></label><div class="g2"><label>قیمت واحد (ریال)<input id="price" inputmode="numeric" value="${p.price ? fmt(p.price) : ''}"></label><label>واحد<input id="unit" value="${esc(p.unit || 'عدد')}"></label></div></div><button class="btn" id="s">ذخیره</button>${p.id ? '<br><button class="btn red" id="d">حذف</button>' : ''}`;
  $('#price').oninput = e => { const n = num(e.target.value); e.target.value = n ? fmt(n) : ''; };
  $('#s').onclick = async () => { const name = $('#name').value.trim(); if (!name) return toast('نام را وارد کنید'); await put('products', { ...p, name, price: num($('#price').value), unit: $('#unit').value.trim() || 'عدد' }); toast('ذخیره شد'); location.hash = '#/products'; };
  if (p.id) $('#d').onclick = async () => { if (await ask('این کالا حذف شود؟')) { await del('products', p.id); location.hash = '#/products'; } };
}

/* ---------- فاکتورها ---------- */
const calc = inv => { const sub = inv.items.reduce((s, i) => s + i.qty * i.price, 0); const disc = Math.min(inv.discount || 0, sub); const tax = Math.round((sub - disc) * (inv.taxRate || 0) / 100); const total = sub - disc + tax; const paid = inv.paid || 0; return { sub, disc, tax, total, paid, due: total - paid }; };
const status = inv => { const t = calc(inv); return t.due <= 0 ? ['paid', 'پرداخت‌شده'] : t.paid > 0 ? ['part', 'پرداخت ناقص'] : ['unpaid', 'پرداخت‌نشده']; };

async function invoices() {
  chrome({ title: 'فاکتورها', fab: () => (location.hash = '#/invoice/new') });
  const sh = await activeShop(), sl = await shops();
  const list = (await all('invoices')).filter(i => inShop(i, sh)).sort((a, b) => b.number - a.number);
  view.innerHTML = `<select id="sw">${sl.map(x => `<option value="${x.id}" ${x.id === sh.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select><input class="search" id="q" placeholder="جستجوی مشتری یا شماره…"><div id="l"></div>`;
  $('#sw').onchange = async e => { await setSetting('activeShop', e.target.value); invoices(); };
  const draw = q => { const r = list.filter(i => (i.customerName + toFa(i.number)).includes(q)); $('#l').innerHTML = r.length ? r.map(i => { const [c, l] = status(i); return `<a class="card item" href="#/invoice/${i.id}"><div class="row"><div class="big">${esc(i.customerName || 'بدون نام')}</div><span class="badge ${c}">${l}</span></div><div class="row sub"><span>شماره ${toFa(i.number)} · ${showDate(i.date)}</span><b style="color:var(--tx)">${rial(calc(i).total)}</b></div></a>`; }).join('') : empty('🧾', 'هنوز فاکتوری نساخته‌اید<br>با دکمه + شروع کنید'); };
  draw(''); $('#q').oninput = e => draw(e.target.value);
}

async function invoiceForm(id) {
  const settings = await activeShop();
  let inv;
  if (id === 'new') { const nums = (await all('invoices')).filter(i => inShop(i, settings)).map(i => i.number); inv = { shopId: settings.id, number: Math.max(settings.startNo ? settings.startNo - 1 : 0, ...nums, 0) + 1, date: isoToday(), customerId: null, customerName: '', items: [{ name: '', qty: 1, price: 0, unit: 'عدد' }], discount: 0, taxRate: settings.defTax || 0, paid: 0, note: '' }; }
  else inv = await get('invoices', +id);
  chrome({ title: id === 'new' ? 'فاکتور جدید' : 'ویرایش فاکتور ' + toFa(inv.number), back: true });
  const custs = await all('customers'), prods = await all('products');
  const [jy, jm, jd] = isoToJ(inv.date);
  view.innerHTML = `
  <div class="card"><div class="g2"><label>شماره<input id="no" inputmode="numeric" value="${toFa(inv.number)}"></label><label>تاریخ (شمسی)<input id="date" inputmode="numeric" value="${showDate(inv.date)}"></label></div>
  <label>مشتری<div class="row" style="gap:6px"><input id="cn" placeholder="نام مشتری" value="${esc(inv.customerName)}"><button class="btn sec" id="pc" style="width:auto;padding:10px 14px;margin-top:4px">انتخاب</button></div></label></div>
  <h3>اقلام</h3><div id="items"></div>
  <button class="btn sec" id="add">+ افزودن ردیف</button><br><button class="btn sec" id="addp">📦 افزودن از لیست کالا</button><br>
  <div class="card"><div class="g2"><label>تخفیف (ریال)<input id="disc" inputmode="numeric" value="${inv.discount ? fmt(inv.discount) : ''}"></label><label>مالیات بر ارزش افزوده (٪)<input id="tax" inputmode="numeric" value="${toFa(inv.taxRate || 0)}"></label></div>
  <label>مبلغ پرداخت‌شده (ریال)<input id="paid" inputmode="numeric" value="${inv.paid ? fmt(inv.paid) : ''}"></label>
  <label>توضیحات<textarea id="note" rows="2">${esc(inv.note || '')}</textarea></label></div>
  <div class="card tot" id="tot"></div><button class="btn" id="save">ذخیره فاکتور</button>`;
  const itemsEl = $('#items');
  const drawItems = () => { itemsEl.innerHTML = inv.items.map((it, k) => `<div class="line"><div class="row"><input data-k="${k}" data-f="name" placeholder="شرح کالا / خدمت" value="${esc(it.name)}"><button class="x" data-del="${k}">✕</button></div><div class="g2" style="margin-top:6px"><label>تعداد<input data-k="${k}" data-f="qty" inputmode="decimal" value="${toFa(it.qty)}"></label><label>قیمت واحد<input data-k="${k}" data-f="price" inputmode="numeric" value="${it.price ? fmt(it.price) : ''}"></label></div><div class="sub" style="text-align:left">جمع: ${rial(it.qty * it.price)}</div></div>`).join(''); };
  const readTop = () => { inv.customerName = $('#cn').value.trim(); inv.discount = num($('#disc').value); inv.taxRate = num($('#tax').value); inv.paid = num($('#paid').value); inv.note = $('#note').value; };
  const totals = () => { readTop(); const t = calc(inv); $('#tot').innerHTML = `<div><span>جمع اقلام</span><span>${rial(t.sub)}</span></div><div><span>تخفیف</span><span>${rial(t.disc)}</span></div><div><span>مالیات (${toFa(inv.taxRate)}٪)</span><span>${rial(t.tax)}</span></div><div class="gt"><span>مبلغ قابل پرداخت</span><span>${rial(t.total)}</span></div><div class="words">${words(t.total)} ریال</div><div><span>مانده</span><span style="color:${t.due > 0 ? 'var(--red)' : 'var(--ok)'}">${rial(t.due)}</span></div>`; };
  drawItems(); totals();
  itemsEl.addEventListener('input', e => { const { k, f } = e.target.dataset; if (k === undefined) return; const it = inv.items[k]; if (f === 'name') it.name = e.target.value; else { it[f] = num(e.target.value); if (f === 'price') { const v = it.price; e.target.value = v ? fmt(v) : ''; } e.target.closest('.line').querySelector('.sub').textContent = 'جمع: ' + rial(it.qty * it.price); } totals(); });
  itemsEl.addEventListener('click', e => { const k = e.target.dataset.del; if (k === undefined) return; inv.items.splice(k, 1); if (!inv.items.length) inv.items.push({ name: '', qty: 1, price: 0 }); drawItems(); totals(); });
  ['disc', 'paid'].forEach(i => $('#' + i).addEventListener('input', e => { const n = num(e.target.value); e.target.value = n ? fmt(n) : ''; totals(); }));
  ['tax', 'cn', 'note'].forEach(i => $('#' + i).addEventListener('input', totals));
  $('#add').onclick = () => { inv.items.push({ name: '', qty: 1, price: 0 }); drawItems(); itemsEl.lastElementChild.querySelector('input').focus(); totals(); };
  $('#pc').onclick = async () => { if (!custs.length) return toast('ابتدا مشتری ثبت کنید'); const d = sheet(`<h3>انتخاب مشتری</h3>${custs.map(c => `<div class="card" data-c="${c.id}"><b>${esc(c.name)}</b><div class="sub">${toFa(esc(c.phone || ''))}</div></div>`).join('')}`); setTimeout(() => { sheet.cur.onclick = e => { const el = e.target.closest('[data-c]'); if (el) { const c = custs.find(x => x.id == el.dataset.c); inv.customerId = c.id; $('#cn').value = c.name; sheet.cur.close(); totals(); } else if (e.target === sheet.cur) sheet.cur.close(); }; }); };
  $('#addp').onclick = () => { if (!prods.length) return toast('ابتدا کالا ثبت کنید'); sheet(`<h3>انتخاب کالا</h3>${prods.map(p => `<div class="card" data-p="${p.id}"><div class="row"><b>${esc(p.name)}</b><span>${rial(p.price)}</span></div></div>`).join('')}`); setTimeout(() => { sheet.cur.onclick = e => { const el = e.target.closest('[data-p]'); if (el) { const p = prods.find(x => x.id == el.dataset.p); const last = inv.items[inv.items.length - 1]; if (last && !last.name && !last.price) inv.items.pop(); inv.items.push({ name: p.name, qty: 1, price: p.price, unit: p.unit }); sheet.cur.close(); drawItems(); totals(); } else if (e.target === sheet.cur) sheet.cur.close(); }; }); };
  $('#save').onclick = async () => {
    readTop(); const date = parseJ($('#date').value); if (!date) return toast('تاریخ نامعتبر است (مثال ۱۴۰۴/۰۵/۱۲)');
    const items = inv.items.filter(i => i.name.trim() || i.price); if (!items.length) return toast('حداقل یک قلم وارد کنید');
    const number = num($('#no').value); const dup = (await all('invoices')).find(i => inShop(i, settings) && i.number === number && i.id !== inv.id); if (dup) return toast('این شماره قبلاً استفاده شده');
    const rec = { ...inv, items, number, date }; const nid = await put('invoices', rec); toast('ذخیره شد'); location.hash = '#/invoice/' + (inv.id || nid) + '/view';
  };
}

async function invoiceView(id) {
  const inv = await get('invoices', +id); if (!inv) return (location.hash = '#/invoices');
  const biz = await shopById(inv.shopId || 's1'); const t = calc(inv); const cust = inv.customerId ? await get('customers', inv.customerId) : null;
  const [c, l] = status(inv);
  chrome({ title: 'فاکتور ' + toFa(inv.number), back: '#/invoices' });
  view.innerHTML = `<div class="sheet" id="sheet">
   <div class="hd"><div>${biz.logo ? `<img src="${biz.logo}">` : ''}<h2>${esc(biz.name || 'فاکتور فروش')}</h2><div>${toFa(esc(biz.phone || ''))}</div><div>${esc(biz.address || '')}</div></div>
   <div class="meta"><b>فاکتور فروش</b><br>شماره: ${toFa(inv.number)}<br>تاریخ: ${showDate(inv.date)}</div></div>
   <div class="parties"><b>خریدار:</b> ${esc(inv.customerName || '—')}${cust?.phone ? ' · ' + toFa(esc(cust.phone)) : ''}${cust?.address ? '<br>' + esc(cust.address) : ''}</div>
   <table><thead><tr><th>#</th><th>شرح</th><th>تعداد</th><th>قیمت واحد</th><th>جمع</th></tr></thead><tbody>${inv.items.map((i, k) => `<tr><td>${toFa(k + 1)}</td><td>${esc(i.name)}</td><td>${toFa(i.qty)}</td><td>${fmt(i.price)}</td><td>${fmt(i.qty * i.price)}</td></tr>`).join('')}</tbody></table>
   <div class="sum"><div><span>جمع کل</span><span>${rial(t.sub)}</span></div>${t.disc ? `<div><span>تخفیف</span><span>${rial(t.disc)}</span></div>` : ''}${t.tax ? `<div><span>مالیات (${toFa(inv.taxRate)}٪)</span><span>${rial(t.tax)}</span></div>` : ''}<div class="gt"><span>مبلغ قابل پرداخت</span><span>${rial(t.total)}</span></div>${t.paid ? `<div><span>پرداخت‌شده</span><span>${rial(t.paid)}</span></div><div><span>مانده</span><span>${rial(t.due)}</span></div>` : ''}</div>
   <div class="words">${words(t.total)} ریال</div>
   <div class="ft">${inv.note ? 'توضیحات: ' + esc(inv.note) + '<br>' : ''}${esc(biz.footer || '')}</div></div>
   <div class="noprint"><div class="card" style="margin-top:10px"><div class="row"><span>وضعیت پرداخت</span><span class="badge ${c}">${l}</span></div></div>
   <div class="btns"><button class="btn" id="pdf">📄 PDF / چاپ</button><button class="btn sec" id="share">📤 اشتراک‌گذاری</button><a class="btn sec" href="#/invoice/${inv.id}">✏️ ویرایش</a><button class="btn red" id="del">🗑 حذف</button></div>
   ${t.due > 0 ? '<br><button class="btn sec" id="pay">✅ ثبت تسویه کامل</button>' : ''}</div>`;
  $('#pdf').onclick = () => { document.title = 'فاکتور-' + inv.number; window.print(); };
  $('#share').onclick = async () => { const txt = `فاکتور شماره ${toFa(inv.number)} - ${biz.name || ''}\nمشتری: ${inv.customerName}\nتاریخ: ${showDate(inv.date)}\n${inv.items.map(i => `• ${i.name} × ${toFa(i.qty)} = ${fmt(i.qty * i.price)}`).join('\n')}\nمبلغ کل: ${rial(t.total)}\n(${words(t.total)} ریال)${t.due > 0 ? '\nمانده: ' + rial(t.due) : ''}`; if (navigator.share) try { await navigator.share({ text: txt }); } catch { } else { await navigator.clipboard?.writeText(txt); toast('متن فاکتور کپی شد'); } };
  $('#del').onclick = async () => { if (await ask('این فاکتور حذف شود؟')) { await del('invoices', inv.id); location.hash = '#/invoices'; } };
  if ($('#pay')) $('#pay').onclick = async () => { inv.paid = t.total; await put('invoices', inv); invoiceView(id); toast('تسویه شد'); };
}

/* ---------- گزارش ---------- */
async function reports() {
  chrome({ title: 'گزارش فروش' });
  const sh = await activeShop(); const inv = (await all('invoices')).filter(i => inShop(i, sh)); const tot = inv.reduce((s, i) => s + calc(i).total, 0), due = inv.reduce((s, i) => s + Math.max(0, calc(i).due), 0);
  const by = {}; inv.forEach(i => { const k = jMonthKey(i.date); by[k] = (by[k] || 0) + calc(i).total; });
  const keys = Object.keys(by).sort((a, b) => b - a).slice(0, 6); const max = Math.max(...keys.map(k => by[k]), 1);
  const cu = {}; inv.forEach(i => { const n = i.customerName || 'بدون نام'; cu[n] = (cu[n] || 0) + calc(i).total; });
  const top = Object.entries(cu).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const nowK = jMonthKey(isoToday());
  view.innerHTML = `<div class="stats"><div class="stat hl"><small>کل فروش</small><div>${rial(tot)}</div></div><div class="stat"><small>مطالبات معوق</small><div style="color:var(--red)">${rial(due)}</div></div><div class="stat"><small>تعداد فاکتور</small><div>${toFa(inv.length)}</div></div><div class="stat"><small>فروش این ماه</small><div>${rial(by[nowK] || 0)}</div></div></div>
  <div class="card"><h3>فروش ماهانه</h3>${keys.length ? keys.map(k => `<div style="margin-bottom:10px"><div class="row sub"><span>${MONTHS[k % 100 - 1]} ${toFa(~~(k / 100))}</span><b style="color:var(--tx)">${rial(by[k])}</b></div><div class="bar" style="width:${Math.max(3, by[k] / max * 100)}%"></div></div>`).join('') : empty('📊', 'داده‌ای نیست')}</div>
  <div class="card"><h3>مشتریان برتر</h3>${top.length ? top.map(([n, v], i) => `<div class="row" style="padding:5px 0"><span>${toFa(i + 1)}. ${esc(n)}</span><b>${rial(v)}</b></div>`).join('') : '<div class="sub">—</div>'}</div>`;
}

/* ---------- تنظیمات و فروشگاه‌ها ---------- */
async function settings() {
  chrome({ title: 'تنظیمات' });
  const l = await shops(), act = await activeShop();
  view.innerHTML = `<div class="card"><h3>فروشگاه‌ها</h3>
  ${l.map(s => `<div class="row" style="padding:8px 0;border-bottom:1px solid #e3ebe9"><label style="display:flex;gap:8px;align-items:center;margin:0;flex:1"><input type="radio" name="act" value="${s.id}" ${s.id === act.id ? 'checked' : ''} style="width:auto;margin:0"><span>${s.logo ? `<img src="${s.logo}" style="height:28px;vertical-align:middle">` : ''} ${esc(s.name)}</span></label><a href="#/shop/${s.id}" class="btn sec" style="width:auto;padding:6px 12px;margin:0">ویرایش</a></div>`).join('')}
  <a class="btn" href="#/shop/new" style="margin-top:12px">+ افزودن فروشگاه</a></div>
  <div class="card" style="margin-top:14px"><h3>پشتیبان‌گیری</h3><div class="sub" style="margin-bottom:10px">همه‌ی اطلاعات (همه‌ی فروشگاه‌ها) فقط روی همین گوشی ذخیره می‌شود. مرتب پشتیبان بگیرید.</div><div class="btns"><button class="btn sec" id="exp">⬇️ دریافت پشتیبان</button><button class="btn sec" id="imp">⬆️ بازیابی</button></div><input type="file" id="f" accept=".json" hidden></div>`;
  document.querySelectorAll('input[name=act]').forEach(r => r.onchange = async () => { await setSetting('activeShop', r.value); toast('فروشگاه فعال تغییر کرد'); });
  $('#exp').onclick = async () => { const blob = new Blob([JSON.stringify(await exportAll())], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `factor-backup-${isoToday()}.json`; a.click(); };
  $('#imp').onclick = () => $('#f').click();
  $('#f').onchange = async e => { try { const o = JSON.parse(await e.target.files[0].text()); if (await ask('اطلاعات فعلی با پشتیبان جایگزین شود؟')) { await importAll(o); toast('بازیابی شد'); settings(); } } catch { toast('فایل نامعتبر است'); } };
}

async function shopForm(id) {
  const l = await shops(), s = id === 'new' ? {} : (l.find(x => x.id === id) || {});
  let logo = s.logo || '';
  chrome({ title: s.id ? 'ویرایش فروشگاه' : 'فروشگاه جدید', back: '#/settings' });
  view.innerHTML = `<div class="card"><label>نام فروشگاه / شرکت *<input id="name" value="${esc(s.name || '')}"></label><label>تلفن<input id="phone" value="${esc(s.phone || '')}"></label><label>آدرس<textarea id="addr" rows="2">${esc(s.address || '')}</textarea></label>
  <div class="g2"><label>مالیات پیش‌فرض (٪)<input id="tax" inputmode="numeric" value="${toFa(s.defTax || 0)}"></label><label>شروع شماره فاکتور<input id="start" inputmode="numeric" value="${toFa(s.startNo || 1)}"></label></div>
  <label>متن پایین فاکتور<input id="footer" value="${esc(s.footer || '')}" placeholder="مثلاً شماره کارت، قوانین…"></label>
  <label>لوگو<input type="file" id="logo" accept="image/*"></label><div id="lp">${logo ? `<img src="${logo}" style="max-height:60px">` : ''}</div></div>
  <button class="btn" id="s">ذخیره</button>${s.id && l.length > 1 ? '<br><button class="btn red" id="d">حذف فروشگاه</button>' : ''}`;
  $('#logo').onchange = e => { const f = e.target.files[0]; if (f) readLogo(f, u => { logo = u; $('#lp').innerHTML = `<img src="${u}" style="max-height:60px">`; }); };
  $('#s').onclick = async () => {
    const name = $('#name').value.trim(); if (!name) return toast('نام فروشگاه را وارد کنید');
    const rec = { ...s, id: s.id || 's' + Date.now().toString(36), name, phone: $('#phone').value.trim(), address: $('#addr').value.trim(), defTax: num($('#tax').value), startNo: num($('#start').value) || 1, footer: $('#footer').value.trim(), logo };
    const nl = s.id ? l.map(x => x.id === rec.id ? rec : x) : [...l, rec];
    await setSetting('shops', nl); if (!s.id) await setSetting('activeShop', rec.id);
    toast('ذخیره شد'); location.hash = '#/settings';
  };
  if (s.id && l.length > 1) $('#d').onclick = async () => {
    if (!await ask('این فروشگاه و همه‌ی فاکتورهایش حذف شود؟')) return;
    await setSetting('shops', l.filter(x => x.id !== s.id));
    if ((await getSetting('activeShop')) === s.id) await setSetting('activeShop', l.find(x => x.id !== s.id).id);
    for (const i of (await all('invoices')).filter(i => (i.shopId || 's1') === s.id)) await del('invoices', i.id);
    location.hash = '#/settings';
  };
}

/* ---------- مسیریابی ---------- */
const routes = [
  [/^#\/customers$/, customers], [/^#\/customer\/(\w+)$/, customerForm], [/^#\/products$/, products], [/^#\/product\/(\w+)$/, productForm],
  [/^#\/invoices$/, invoices], [/^#\/invoice\/(\d+)\/view$/, invoiceView], [/^#\/invoice\/(\w+)$/, invoiceForm], [/^#\/reports$/, reports], [/^#\/settings$/, settings], [/^#\/shop\/(\w+)$/, shopForm]];
async function route() {
  const h = location.hash || '#/invoices';
  document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', h.startsWith(a.getAttribute('href').replace(/s$/, ''))));
  for (const [re, fn] of routes) { const m = h.match(re); if (m) { await fn(m[1]); window.scrollTo(0, 0); return; } }
  location.hash = '#/invoices';
}
addEventListener('hashchange', route); route();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
