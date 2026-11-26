/**
 * kASIR - setup.gs (Inisialisasi Database - Safe Migration)
 * ZettBOT Core v4.1 by Zettbos
 *
 * Aman dijalankan berulang kali:
 * - Tab yang sudah ada TIDAK dihapus / dikosongkan.
 * - Kolom baru (jika ada di versi mendatang) ditambahkan di kanan saja.
 * - Data contoh hanya diisi jika tab benar-benar baru dibuat.
 * - Nama tab tanpa karakter underscore.
 */

function setupDatabase() {
  var ss = getDb_();
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  var names = [SHEETS.PRODUK, SHEETS.TRX, SHEETS.DETAIL, SHEETS.TOKO];
  var report = [];

  for (var n = 0; n < names.length; n++) {
    var name = names[n];
    var sh = ss.getSheetByName(name);
    var isNew = false;
    if (!sh) {
      sh = ss.insertSheet(name);
      isNew = true;
    }

    var headers = HEADERS[name];
    var lastCol = sh.getLastColumn();
    var existing = lastCol > 0 ? sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0] : [];
    var added = 0;
    for (var i = 0; i < headers.length; i++) {
      if (!existing[i]) {
        sh.getRange(1, i + 1).setNumberFormat('@').setValue(headers[i]);
        added++;
      }
    }

    // Tampilan header & format kolom
    var head = sh.getRange(1, 1, 1, headers.length);
    head.setFontWeight('bold').setBackground('#1e3a5f').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    var rowsFmt = Math.max(sh.getMaxRows() - 1, 1);
    for (var c = 0; c < headers.length; c++) {
      sh.getRange(2, c + 1, rowsFmt, 1).setNumberFormat(FMT[name][c]);
    }

    // Data contoh HANYA untuk tab yang baru dibuat
    if (isNew && name === SHEETS.PRODUK) {
      writeRows_(name, 2, [
        ['PRD-0001', 'Beras Pandan Wangi 5kg', 'Sembako', 65000, 75000, 24, 5, 'Aktif'],
        ['PRD-0002', 'Minyak Goreng 1L', 'Sembako', 15500, 18000, 40, 10, 'Aktif'],
        ['PRD-0003', 'Gula Pasir 1kg', 'Sembako', 14000, 16500, 30, 8, 'Aktif'],
        ['PRD-0004', 'Mie Instan Goreng', 'Makanan', 2800, 3500, 120, 24, 'Aktif'],
        ['PRD-0005', 'Air Mineral 600ml', 'Minuman', 2200, 3000, 60, 12, 'Aktif']
      ]);
    }
    if (isNew && name === SHEETS.TOKO) {
      writeRows_(name, 2, [
        ['SHP-001', 'Toko Contoh', 'Jl. Raya No. 1, Kota Anda', '081234567890', 'Terima kasih atas kunjungan Anda!', 'Ya']
      ]);
    }

    report.push(name + (isNew ? ' (dibuat baru)' : ' (sudah ada, aman)') + (added ? ' +' + added + ' header' : ''));
  }

  SpreadsheetApp.flush();
  var token = ensureToken_();
  report.push('Kode Akses: ' + token);
  Logger.log(report.join('\n'));
  return report.join('\n');
}

// Opsional: buat Kode Akses baru (kode lama langsung tidak berlaku)
function buatKodeAksesBaru() {
  PropertiesService.getScriptProperties().deleteProperty('API_TOKEN');
  return tampilkanKodeAkses();
}
