/**
 * kASIR - code.gs (Backend Controller)
 * ZettBOT Core v4.1 by Zettbos
 *
 * Aturan yang dipatuhi:
 * - Pengambilan data berbasis urutan kolom (COL), bukan nama header.
 * - Membaca dengan getDisplayValues(), menulis diakhiri SpreadsheetApp.flush().
 * - Penomoran MAX+1 dengan LockService (anti tabrakan).
 * - Fungsi pembantu berakhiran "_" bersifat privat (tidak bisa dipanggil dari browser).
 * - Satu-satunya pintu masuk data: apiCall() / doPost() dengan Kode Akses (token).
 */

var APP_NAME = 'kASIR';
var TZ = 'Asia/Jakarta';

var SHEETS = {
  PRODUK: 'DataProduk',
  TRX: 'DataTransaksi',
  DETAIL: 'DetailTransaksi',
  TOKO: 'ProfilToko'
};

var HEADERS = {
  DataProduk: ['IDProduk', 'NamaProduk', 'Kategori', 'HargaBeli', 'HargaJual', 'Stok', 'MinStok', 'Status'],
  DataTransaksi: ['NoTransaksi', 'WaktuTransaksi', 'IDToko', 'NamaToko', 'TotalItem', 'TotalOmzet', 'TotalHPP', 'TotalProfit', 'MetodeBayar', 'NominalBayar', 'Kembalian', 'Kasir'],
  DetailTransaksi: ['NoTransaksi', 'IDProduk', 'NamaProduk', 'HargaBeli', 'HargaJual', 'Qty', 'Subtotal', 'ProfitItem'],
  ProfilToko: ['IDToko', 'NamaToko', 'AlamatToko', 'TeleponToko', 'PesanFooter', 'IsDefault']
};

// Format sel: '@' = teks murni (kebal konversi tanggal/rumus), '0' = angka
var FMT = {
  DataProduk: ['@', '@', '@', '0', '0', '0', '0', '@'],
  DataTransaksi: ['@', '@', '@', '@', '0', '0', '0', '0', '@', '0', '0', '@'],
  DetailTransaksi: ['@', '@', '@', '0', '0', '0', '0', '0'],
  ProfilToko: ['@', '@', '@', '@', '@', '@']
};

const COL = {
  PRD: { ID: 0, NAMA: 1, KATEGORI: 2, BELI: 3, JUAL: 4, STOK: 5, MIN: 6, STATUS: 7 },
  TRX: { NO: 0, WAKTU: 1, IDTOKO: 2, NAMATOKO: 3, ITEM: 4, OMZET: 5, HPP: 6, PROFIT: 7, METODE: 8, BAYAR: 9, KEMBALI: 10, KASIR: 11 },
  DTL: { NO: 0, IDPRD: 1, NAMA: 2, BELI: 3, JUAL: 4, QTY: 5, SUB: 6, PROFIT: 7 },
  TOKO: { ID: 0, NAMA: 1, ALAMAT: 2, TELP: 3, FOOTER: 4, DEFAULT: 5 }
};

var METHODS = ['Tunai', 'QRIS', 'Transfer'];

/* ============================ ENTRY POINT ============================ */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('kASIR - Kasir Retail')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Dipakai jika index.html di-hosting terpisah (GitHub Pages / Vercel)
function doPost(e) {
  var out;
  try {
    var body = JSON.parse(e.postData.contents);
    out = { ok: true, data: apiCall(body.token, body.fn, body.args) };
  } catch (err) {
    out = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('kASIR')
      .addItem('1. Siapkan Database (Setup)', 'setupDatabase')
      .addItem('2. Tampilkan Kode Akses', 'tampilkanKodeAkses')
      .addToUi();
  } catch (e) {}
}

// Satu-satunya fungsi publik yang dipanggil dari browser
function apiCall(token, fn, args) {
  checkToken_(token);
  var map = apiMap_();
  if (!Object.prototype.hasOwnProperty.call(map, fn)) throw new Error('Fungsi tidak dikenal.');
  return map[fn].apply(null, args || []);
}

function apiMap_() {
  return {
    ping: ping_,
    listProducts: listProducts_,
    nextProductId: nextProductId_,
    saveProduct: saveProduct_,
    setProductStatus: setProductStatus_,
    listStores: listStores_,
    saveStore: saveStore_,
    setDefaultStore: setDefaultStore_,
    deleteStore: deleteStore_,
    saveTransaction: saveTransaction_,
    getTransaction: getTransaction_,
    getReport: getReport_
  };
}

function ping_() {
  return { app: APP_NAME, time: nowStr_() };
}

/* ============================ KEAMANAN ============================ */

function ensureToken_() {
  var props = PropertiesService.getScriptProperties();
  var t = props.getProperty('API_TOKEN');
  if (!t) {
    t = Utilities.getUuid().replace(/-/g, '').substring(0, 16).toUpperCase();
    props.setProperty('API_TOKEN', t);
  }
  return t;
}

function checkToken_(token) {
  var real = ensureToken_();
  if (!token || String(token) !== real) throw new Error('AUTH');
}

function tampilkanKodeAkses() {
  var t = ensureToken_();
  Logger.log('KODE AKSES kASIR: ' + t);
  try {
    SpreadsheetApp.getUi().alert('Kode Akses kASIR', 'Kode Akses Anda:\n\n' + t + '\n\nMasukkan kode ini saat aplikasi pertama kali dibuka.', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
  return t;
}

/* ============================ DATABASE HELPER ============================ */

function getDb_() {
  var ss = null;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {}
  if (!ss) {
    var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!id) throw new Error('Spreadsheet belum terhubung. Buat script dari menu Extensions > Apps Script di dalam Google Sheets Anda.');
    ss = SpreadsheetApp.openById(id);
  }
  return ss;
}

function getSheet_(name) {
  var ss = getDb_();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    setupDatabase();
    sh = ss.getSheetByName(name);
  }
  return sh;
}

function readRows_(name) {
  var sh = getSheet_(name);
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, HEADERS[name].length).getDisplayValues();
}

function writeRows_(name, startRow, matrix) {
  if (!matrix.length) return;
  var sh = getSheet_(name);
  var n = matrix[0].length;
  var fmtRow = FMT[name].slice(0, n);
  var fmts = [];
  for (var i = 0; i < matrix.length; i++) fmts.push(fmtRow);
  var rg = sh.getRange(startRow, 1, matrix.length, n);
  rg.setNumberFormats(fmts);
  rg.setValues(matrix);
}

function nextRow_(name) {
  return getSheet_(name).getLastRow() + 1;
}

function findRowIndex_(name, colIdx, value) {
  var sh = getSheet_(name);
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var vals = sh.getRange(2, colIdx + 1, last - 1, 1).getDisplayValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]) === String(value)) return i + 2;
  }
  return 0;
}

// Penomoran MAX + 1 (bukan jumlah baris)
function nextId_(name, colIdx, prefix, pad) {
  var sh = getSheet_(name);
  var last = sh.getLastRow();
  var max = 0;
  if (last >= 2) {
    var vals = sh.getRange(2, colIdx + 1, last - 1, 1).getDisplayValues();
    for (var i = 0; i < vals.length; i++) {
      var v = String(vals[i][0]);
      if (v.indexOf(prefix) === 0) {
        var n = parseInt(v.substring(prefix.length), 10);
        if (!isNaN(n) && n > max) max = n;
      }
    }
  }
  return prefix + padNum_(max + 1, pad);
}

function padNum_(n, len) {
  var s = String(n);
  while (s.length < len) s = '0' + s;
  return s;
}

function num_(v) {
  var n = Number(String(v === null || v === undefined ? '' : v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function clean_(v, maxLen) {
  var s = String(v === null || v === undefined ? '' : v).replace(/[\u0000-\u001F]/g, ' ').trim();
  return s.substring(0, maxLen || 200);
}

function nowStr_() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/* ============================ PRODUK ============================ */

function mapProduct_(r) {
  var beli = num_(r[COL.PRD.BELI]);
  var jual = num_(r[COL.PRD.JUAL]);
  return {
    id: String(r[COL.PRD.ID]),
    nama: String(r[COL.PRD.NAMA]),
    kategori: String(r[COL.PRD.KATEGORI]),
    hargaBeli: beli,
    hargaJual: jual,
    stok: num_(r[COL.PRD.STOK]),
    minStok: num_(r[COL.PRD.MIN]),
    status: String(r[COL.PRD.STATUS]) === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
    profit: jual - beli,
    margin: beli > 0 ? Math.round((jual - beli) / beli * 1000) / 10 : null
  };
}

// p: { search, filter: aktif|semua|menipis|nonaktif, page, pageSize }
function listProducts_(p) {
  p = p || {};
  var q = clean_(p.search, 100).toLowerCase();
  var filter = p.filter || 'aktif';
  var page = Math.max(0, parseInt(p.page, 10) || 0);
  var size = Math.min(100, Math.max(1, parseInt(p.pageSize, 10) || 20));
  var rows = readRows_(SHEETS.PRODUK);
  var list = [];
  var activeCount = 0;
  var lowCount = 0;
  for (var i = 0; i < rows.length; i++) {
    if (!rows[i][COL.PRD.ID]) continue;
    var pr = mapProduct_(rows[i]);
    var isLow = pr.status === 'Aktif' && pr.stok <= pr.minStok;
    if (pr.status === 'Aktif') {
      activeCount++;
      if (isLow) lowCount++;
    }
    if (filter === 'aktif' && pr.status !== 'Aktif') continue;
    if (filter === 'nonaktif' && pr.status !== 'Nonaktif') continue;
    if (filter === 'menipis' && !isLow) continue;
    if (q && pr.nama.toLowerCase().indexOf(q) < 0 && pr.id.toLowerCase().indexOf(q) < 0 && pr.kategori.toLowerCase().indexOf(q) < 0) continue;
    list.push(pr);
  }
  list.sort(function (a, b) { return a.nama.toLowerCase() < b.nama.toLowerCase() ? -1 : (a.nama.toLowerCase() > b.nama.toLowerCase() ? 1 : 0); });
  var total = list.length;
  return {
    rows: list.slice(page * size, page * size + size),
    total: total,
    page: page,
    pageSize: size,
    hasMore: (page + 1) * size < total,
    activeCount: activeCount,
    lowCount: lowCount
  };
}

function nextProductId_() {
  return nextId_(SHEETS.PRODUK, COL.PRD.ID, 'PRD-', 4);
}

function saveProduct_(o) {
  o = o || {};
  var nama = clean_(o.nama, 120);
  if (!nama) throw new Error('Nama produk wajib diisi.');
  var beli = Math.round(num_(o.hargaBeli));
  var jual = Math.round(num_(o.hargaJual));
  var stok = Math.floor(num_(o.stok));
  var min = Math.floor(num_(o.minStok));
  if (beli < 0 || jual < 0 || stok < 0 || min < 0) throw new Error('Harga dan stok tidak boleh negatif.');
  var kategori = clean_(o.kategori, 60);
  var status = o.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif';
  var id = clean_(o.id, 30);

  return withLock_(function () {
    var row;
    if (id) {
      row = findRowIndex_(SHEETS.PRODUK, COL.PRD.ID, id);
      if (!row) throw new Error('Produk ' + id + ' tidak ditemukan.');
    } else {
      id = nextProductId_();
      row = nextRow_(SHEETS.PRODUK);
    }
    writeRows_(SHEETS.PRODUK, row, [[id, nama, kategori, beli, jual, stok, min, status]]);
    SpreadsheetApp.flush();
    return { product: mapProduct_([id, nama, kategori, beli, jual, stok, min, status]) };
  });
}

function setProductStatus_(id, status) {
  id = clean_(id, 30);
  var st = status === 'Nonaktif' ? 'Nonaktif' : 'Aktif';
  return withLock_(function () {
    var row = findRowIndex_(SHEETS.PRODUK, COL.PRD.ID, id);
    if (!row) throw new Error('Produk tidak ditemukan.');
    var sh = getSheet_(SHEETS.PRODUK);
    sh.getRange(row, COL.PRD.STATUS + 1).setNumberFormat('@').setValue(st);
    SpreadsheetApp.flush();
    var r = sh.getRange(row, 1, 1, HEADERS.DataProduk.length).getDisplayValues()[0];
    return { product: mapProduct_(r) };
  });
}

/* ============================ PROFIL TOKO ============================ */

function mapStore_(r) {
  return {
    id: String(r[COL.TOKO.ID]),
    nama: String(r[COL.TOKO.NAMA]),
    alamat: String(r[COL.TOKO.ALAMAT]),
    telepon: String(r[COL.TOKO.TELP]),
    footer: String(r[COL.TOKO.FOOTER]),
    isDefault: String(r[COL.TOKO.DEFAULT]) === 'Ya'
  };
}

function listStores_() {
  var rows = readRows_(SHEETS.TOKO);
  var list = [];
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][COL.TOKO.ID]) list.push(mapStore_(rows[i]));
  }
  return list;
}

function normalizeDefault_() {
  var rows = readRows_(SHEETS.TOKO);
  if (!rows.length) return;
  var has = false;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][COL.TOKO.DEFAULT]) === 'Ya') { has = true; break; }
  }
  if (!has) {
    getSheet_(SHEETS.TOKO).getRange(2, COL.TOKO.DEFAULT + 1).setNumberFormat('@').setValue('Ya');
  }
}

function saveStore_(o) {
  o = o || {};
  var nama = clean_(o.nama, 80);
  if (!nama) throw new Error('Nama toko wajib diisi.');
  var alamat = clean_(o.alamat, 200);
  var telp = clean_(o.telepon, 30).replace(/[^0-9+\- ]/g, '');
  var footer = clean_(o.footer, 120);
  var id = clean_(o.id, 30);

  return withLock_(function () {
    var row;
    var existingCount = listStores_().length;
    var wantDefault = !!o.isDefault || existingCount === 0;
    if (id) {
      row = findRowIndex_(SHEETS.TOKO, COL.TOKO.ID, id);
      if (!row) throw new Error('Profil toko tidak ditemukan.');
    } else {
      id = nextId_(SHEETS.TOKO, COL.TOKO.ID, 'SHP-', 3);
      row = nextRow_(SHEETS.TOKO);
    }
    var curDefault = 'Tidak';
    if (id && findRowIndex_(SHEETS.TOKO, COL.TOKO.ID, id)) {
      var cur = getSheet_(SHEETS.TOKO).getRange(row, COL.TOKO.DEFAULT + 1).getDisplayValue();
      if (cur === 'Ya') curDefault = 'Ya';
    }
    writeRows_(SHEETS.TOKO, row, [[id, nama, alamat, telp, footer, wantDefault ? 'Ya' : curDefault]]);
    if (wantDefault) setOnlyDefault_(id);
    normalizeDefault_();
    SpreadsheetApp.flush();
    return listStores_();
  });
}

function setOnlyDefault_(id) {
  var sh = getSheet_(SHEETS.TOKO);
  var rows = readRows_(SHEETS.TOKO);
  if (!rows.length) return;
  var col = [];
  for (var i = 0; i < rows.length; i++) {
    col.push([String(rows[i][COL.TOKO.ID]) === String(id) ? 'Ya' : 'Tidak']);
  }
  var rg = sh.getRange(2, COL.TOKO.DEFAULT + 1, rows.length, 1);
  rg.setNumberFormat('@');
  rg.setValues(col);
}

function setDefaultStore_(id) {
  id = clean_(id, 30);
  return withLock_(function () {
    if (!findRowIndex_(SHEETS.TOKO, COL.TOKO.ID, id)) throw new Error('Profil toko tidak ditemukan.');
    setOnlyDefault_(id);
    SpreadsheetApp.flush();
    return listStores_();
  });
}

function deleteStore_(id) {
  id = clean_(id, 30);
  return withLock_(function () {
    if (listStores_().length <= 1) throw new Error('Minimal harus ada satu profil toko.');
    var row = findRowIndex_(SHEETS.TOKO, COL.TOKO.ID, id);
    if (!row) throw new Error('Profil toko tidak ditemukan.');
    getSheet_(SHEETS.TOKO).deleteRow(row);
    normalizeDefault_();
    SpreadsheetApp.flush();
    return listStores_();
  });
}

/* ============================ TRANSAKSI ============================ */

// payload: { storeId, method, paid, kasir, items: [{id, qty}] }
// Harga selalu diambil dari database (bukan dari browser) agar aman.
function saveTransaction_(payload) {
  payload = payload || {};
  var items = payload.items;
  if (!items || !items.length) throw new Error('Keranjang kosong.');
  if (items.length > 100) throw new Error('Maksimal 100 baris barang per transaksi.');
  var method = METHODS.indexOf(payload.method) >= 0 ? payload.method : 'Tunai';
  var kasir = clean_(payload.kasir, 40) || 'Kasir';

  // Gabungkan baris dengan ID sama
  var want = {};
  var order = [];
  for (var i = 0; i < items.length; i++) {
    var pid = clean_(items[i].id, 30);
    var q = Math.floor(num_(items[i].qty));
    if (!pid || q < 1) throw new Error('Data barang tidak valid.');
    if (!want[pid]) { want[pid] = 0; order.push(pid); }
    want[pid] += q;
  }

  return withLock_(function () {
    var prdRows = readRows_(SHEETS.PRODUK);
    var map = {};
    for (var r = 0; r < prdRows.length; r++) {
      map[String(prdRows[r][COL.PRD.ID])] = { rowIdx: r + 2, p: mapProduct_(prdRows[r]) };
    }

    var stores = listStores_();
    if (!stores.length) throw new Error('Belum ada profil toko. Tambahkan dulu di menu Profil Toko.');
    var store = null;
    for (var s = 0; s < stores.length; s++) {
      if (stores[s].id === String(payload.storeId)) store = stores[s];
    }
    if (!store) {
      for (var s2 = 0; s2 < stores.length; s2++) { if (stores[s2].isDefault) store = stores[s2]; }
    }
    if (!store) store = stores[0];

    var total = 0, hpp = 0, totalItem = 0;
    var lines = [];
    for (var k = 0; k < order.length; k++) {
      var e = map[order[k]];
      if (!e) throw new Error('Produk ' + order[k] + ' tidak ditemukan.');
      if (e.p.status !== 'Aktif') throw new Error('Produk "' + e.p.nama + '" sudah nonaktif.');
      var qty = want[order[k]];
      if (qty > e.p.stok) throw new Error('Stok "' + e.p.nama + '" tidak cukup (sisa ' + e.p.stok + ').');
      var sub = e.p.hargaJual * qty;
      var cost = e.p.hargaBeli * qty;
      total += sub;
      hpp += cost;
      totalItem += qty;
      lines.push({ e: e, qty: qty, sub: sub, profit: sub - cost });
    }

    var paid = method === 'Tunai' ? Math.round(num_(payload.paid)) : total;
    if (paid < total) throw new Error('Nominal bayar kurang dari total belanja.');
    var change = paid - total;

    var period = Utilities.formatDate(new Date(), TZ, 'yyyyMM');
    var no = nextId_(SHEETS.TRX, COL.TRX.NO, 'TRX-' + period + '-', 4);
    var waktu = nowStr_();

    writeRows_(SHEETS.TRX, nextRow_(SHEETS.TRX), [[no, waktu, store.id, store.nama, totalItem, total, hpp, total - hpp, method, paid, change, kasir]]);

    var detail = [];
    for (var d = 0; d < lines.length; d++) {
      var L = lines[d];
      detail.push([no, L.e.p.id, L.e.p.nama, L.e.p.hargaBeli, L.e.p.hargaJual, L.qty, L.sub, L.profit]);
    }
    writeRows_(SHEETS.DETAIL, nextRow_(SHEETS.DETAIL), detail);

    var prdSheet = getSheet_(SHEETS.PRODUK);
    var stocks = [];
    for (var u = 0; u < lines.length; u++) {
      var ns = lines[u].e.p.stok - lines[u].qty;
      prdSheet.getRange(lines[u].e.rowIdx, COL.PRD.STOK + 1).setNumberFormat('0').setValue(ns);
      stocks.push({ id: lines[u].e.p.id, stok: ns });
    }
    SpreadsheetApp.flush();

    var receiptItems = [];
    for (var m = 0; m < lines.length; m++) {
      receiptItems.push({ nama: lines[m].e.p.nama, qty: lines[m].qty, harga: lines[m].e.p.hargaJual, subtotal: lines[m].sub });
    }
    return {
      receipt: buildReceipt_(no, waktu, store, receiptItems, totalItem, total, method, paid, change, kasir),
      stocks: stocks
    };
  });
}

function buildReceipt_(no, waktu, store, items, totalItem, total, method, paid, change, kasir) {
  return {
    no: no,
    waktu: waktu,
    store: { nama: store.nama, alamat: store.alamat, telepon: store.telepon, footer: store.footer },
    items: items,
    totalItem: totalItem,
    total: total,
    metode: method,
    bayar: paid,
    kembali: change,
    kasir: kasir
  };
}

function getTransaction_(no) {
  no = clean_(no, 40);
  var rows = readRows_(SHEETS.TRX);
  var t = null;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][COL.TRX.NO]) === no) { t = rows[i]; break; }
  }
  if (!t) throw new Error('Transaksi tidak ditemukan.');

  var dRows = readRows_(SHEETS.DETAIL);
  var rItems = [];
  var dItems = [];
  for (var j = 0; j < dRows.length; j++) {
    if (String(dRows[j][COL.DTL.NO]) !== no) continue;
    var qty = num_(dRows[j][COL.DTL.QTY]);
    var jual = num_(dRows[j][COL.DTL.JUAL]);
    rItems.push({ nama: String(dRows[j][COL.DTL.NAMA]), qty: qty, harga: jual, subtotal: num_(dRows[j][COL.DTL.SUB]) });
    dItems.push({
      nama: String(dRows[j][COL.DTL.NAMA]),
      qty: qty,
      hargaBeli: num_(dRows[j][COL.DTL.BELI]),
      hargaJual: jual,
      subtotal: num_(dRows[j][COL.DTL.SUB]),
      profit: num_(dRows[j][COL.DTL.PROFIT])
    });
  }

  var stores = listStores_();
  var store = { nama: String(t[COL.TRX.NAMATOKO]), alamat: '', telepon: '', footer: '' };
  for (var s = 0; s < stores.length; s++) {
    if (stores[s].id === String(t[COL.TRX.IDTOKO])) store = stores[s];
  }

  return {
    receipt: buildReceipt_(no, String(t[COL.TRX.WAKTU]), store, rItems, num_(t[COL.TRX.ITEM]), num_(t[COL.TRX.OMZET]), String(t[COL.TRX.METODE]), num_(t[COL.TRX.BAYAR]), num_(t[COL.TRX.KEMBALI]), String(t[COL.TRX.KASIR])),
    items: dItems,
    hpp: num_(t[COL.TRX.HPP]),
    profit: num_(t[COL.TRX.PROFIT])
  };
}

/* ============================ LAPORAN & PROFIT ============================ */

function validDate_(s) {
  s = String(s || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function rangeBounds_(p) {
  var today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  var r = p.range || 'month';
  if (r === 'today') return [today, today];
  if (r === '7d') {
    var d = new Date(new Date().getTime() - 6 * 86400000);
    return [Utilities.formatDate(d, TZ, 'yyyy-MM-dd'), today];
  }
  if (r === 'month') return [today.substring(0, 8) + '01', today];
  if (r === 'custom') return [validDate_(p.dateFrom) || '0000-00-00', validDate_(p.dateTo) || '9999-12-31'];
  return ['0000-00-00', '9999-12-31'];
}

// p: { range: today|7d|month|all|custom, dateFrom, dateTo, search, page, pageSize }
function getReport_(p) {
  p = p || {};
  var b = rangeBounds_(p);
  var q = clean_(p.search, 60).toLowerCase();
  var page = Math.max(0, parseInt(p.page, 10) || 0);
  var size = Math.min(100, Math.max(1, parseInt(p.pageSize, 10) || 20));
  var rows = readRows_(SHEETS.TRX);
  var sum = { omzet: 0, hpp: 0, profit: 0, count: 0, items: 0 };
  var list = [];
  for (var i = rows.length - 1; i >= 0; i--) {
    var r = rows[i];
    if (!r[COL.TRX.NO]) continue;
    var day = String(r[COL.TRX.WAKTU]).substring(0, 10);
    if (day < b[0] || day > b[1]) continue;
    sum.omzet += num_(r[COL.TRX.OMZET]);
    sum.hpp += num_(r[COL.TRX.HPP]);
    sum.profit += num_(r[COL.TRX.PROFIT]);
    sum.items += num_(r[COL.TRX.ITEM]);
    sum.count++;
    if (q && String(r[COL.TRX.NO]).toLowerCase().indexOf(q) < 0 && String(r[COL.TRX.NAMATOKO]).toLowerCase().indexOf(q) < 0) continue;
    list.push({
      no: String(r[COL.TRX.NO]),
      waktu: String(r[COL.TRX.WAKTU]),
      toko: String(r[COL.TRX.NAMATOKO]),
      item: num_(r[COL.TRX.ITEM]),
      omzet: num_(r[COL.TRX.OMZET]),
      hpp: num_(r[COL.TRX.HPP]),
      profit: num_(r[COL.TRX.PROFIT]),
      metode: String(r[COL.TRX.METODE]),
      kasir: String(r[COL.TRX.KASIR])
    });
  }
  var total = list.length;
  return {
    summary: sum,
    rows: list.slice(page * size, page * size + size),
    total: total,
    page: page,
    pageSize: size,
    hasMore: (page + 1) * size < total
  };
}
