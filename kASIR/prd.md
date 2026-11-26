# DOKUMEN SPESIFIKASI PRODUK (PRD) & BLUEPRINT SISTEM
================================================================================
PROJEK: Aplikasi Kasir Pintar Retail & Toko (kASIR)
VERSI ENGINE: ZettBOT Core v4.1 (by Zettbos)
STATUS: DISETUJUI & KODE v1.0 TELAH DIBUAT (2026-11-25)
TANGGAL PENYUSUNAN: 21 November 2026
GAYA DESAIN: Clean Modern (Desain Anti-AI Human-Crafted, Slate/Navy Palette)
TARGET PERANGKAT: Responsif Fleksibel (Laptop Kasir & Handphone Smartphone)
================================================================================

================================================================================
ZONA ATAS: SPESIFIKASI KEBUTUHAN PRODUK (BLUEPRINT AWAL)
================================================================================

## 1. NAMA PROJEK & PROBLEM STATEMENT
- **Nama Projek:** kASIR - Sistem Kasir Retail, Manajemen Stok, Multi-Profil Toko & Analisis Laba Bersih.
- **Problem Statement:**
  Pemilik toko retail / kelontong sering kesulitan memantau laba bersih riil karena aplikasi kasir yang ada terlalu mahal (biaya langganan bulanan), data terkunci di vendor luar, tidak menampilkan margin laba per barang, serta sulit berganti identitas toko saat mencetak struk untuk beberapa unit usaha.
- **Solusi yang Dihadirkan:**
  Aplikasi kasir berbasis Web App mandiri (didukung Google Sheets & Google Apps Script gratis selamanya), dengan fitur kalkulasi modal (HPP) vs harga jual otomatis, metrik profit per produk dan profit global, multi-profil toko untuk template struk, manajemen stok dengan alert, serta dukungan koneksi langsung ke printer thermal Bluetooth (ESC/POS 58mm/80mm).

---

## 2. PERAN PENGGUNA (USER ROLES)
1. **Kasir / Operator Toko:**
   - Membuka antarmuka kasir (POS).
   - Memilih profil toko aktif (jika memiliki lebih dari satu toko/cabang).
   - Memilih produk atau mencari produk berdasarkan nama/kode.
   - Mengatur kuantitas (Qty), memilih metode bayar (Tunai, QRIS, Transfer), menghitung kembalian otomatis.
   - Menyimpan transaksi dan mencetak struk langsung ke printer Bluetooth thermal atau cetak dialog browser.
2. **Pemilik Toko (Owner / Admin):**
   - Mengelola master produk (Nama, Harga Beli/Modal, Harga Jual, Jumlah Stok, Alert Stok Menipis).
   - Memantau metrik bisnis (Total Omzet, Total Modal HPP, Total Profit Bersih).
   - Mengelola template profil toko (Nama Toko, Alamat, No Telepon/WA, Pesan Kaki Struk).
   - Melihat riwayat transaksi lengkap dan mengekspor rekap laporan.

---

## 3. ARSITEKTUR & LINGKUNGAN KERJA
- **Frontend:** Single Page Application (SPA) HTML5, CSS3 kustom berpalet Slate/Navy (Anti-AI Aesthetic), JavaScript Modern ES6+. Menggunakan Optimistic UI dan In-Memory Caching untuk perpindahan menu instan (0 detik).
- **Backend Controller:** Google Apps Script (`code.gs`) yang menangani `doGet()`, sanitasi data, transaksi atomik, dan sinkronisasi `SpreadsheetApp.flush()`.
- **Database Engine:** Google Sheets pribadi (aman di Google Drive, bebas biaya bulanan, kapasitas tinggi, kebal pemadaman server sewa).
- **Inisialisasi & Migrasi:** `setup.gs` dengan pola *Safe Migration* (idempoten, tidak menghapus data pengguna, nama sheet tanpa karakter underscore).
- **Konektivitas Printer:**
  - **Web Bluetooth API:** Mengirim perintah ESC/POS biner langsung ke printer thermal Bluetooth 58mm/80mm.
  - **Standard Browser Print Fallback:** Pop-up struk thermal dengan CSS `@media print` untuk printer kabel USB / jaringan / PDF.

---

## 4. ALUR KERJA APLIKASI (USER FLOW)
```
[Buka Aplikasi]
       │
       ├───► [Menu 1: Kasir (POS)]
       │        ├── Pilih Profil Toko Aktif (Dropdown)
       │        ├── Pilih / Cari Produk (Muncul nama, harga, sisa stok)
       │        ├── Tambah ke Keranjang Belanja (Hitung Subtotal otomatis)
       │        ├── Pilih Pembayaran (Tunai + Input Bayar/Kembalian, QRIS, Transfer)
       │        ├── Klik "Simpan & Cetak Struk"
       │        │     ├── Backend kurangi stok otomatis di Google Sheets
       │        │     ├── Generate No. Transaksi Unik (TRX-YYYYMM-XXXX)
       │        │     └── Kirim data ke Printer Bluetooth (ESC/POS) / Tampilkan Modal Struk
       │
       ├───► [Menu 2: Master Produk & Stok]
       │        ├── Tabel Daftar Produk (Nama, Harga Beli, Harga Jual, Margin Profit, Stok)
       │        ├── Form Tambah / Edit Produk
       │        └── Peringatan Stok Menipis (Badge warna oranye/merah jika stok <= batas minimum)
       │
       ├───► [Menu 3: Laporan & Analisis Profit]
       │        ├── Kartu Metrik: Total Omzet, Total Modal (HPP), Total Laba Bersih
       │        ├── Filter Rentang Tanggal (Hari ini, 7 hari terakhir, Bulan ini, Semua)
       │        └── Tabel Riwayat Transaksi (No TRX, Waktu, Toko, Total Bayar, Profit Transaksi)
       │
       └───► [Menu 4: Pengaturan Profil Toko (Template Struk)]
                ├── Daftar Profil Toko yang Tersimpan
                ├── Form Tambah / Edit Identitas Toko (Nama, Alamat, No Kontak, Footer Struk)
                └── Set Toko Default
```

---

## 5. DESAIN BASIS DATA (GOOGLE SHEETS SCHEMA)
*Catatan Standar ZettBOT: Seluruh nama tab DILARANG menggunakan karakter underscore `_`.*

### Tab 1: `DataProduk`
| No Kolom | Nama Kolom | Tipe Data | Deskripsi & Contoh |
| :---: | :--- | :--- | :--- |
| A (0) | IDProduk | String | Kode unik produk, misal: `PRD-0001` |
| B (1) | NamaProduk | String | Nama barang, misal: `Beras Pandan Wangi 5kg` |
| C (2) | Kategori | String | Kategori barang, misal: `Sembako` |
| D (3) | HargaBeli | Number | Modal pokok (HPP), misal: `65000` |
| E (4) | HargaJual | Number | Harga jual ke konsumen, misal: `75000` |
| F (5) | Stok | Number | Sisa stok barang fisik, misal: `24` |
| G (6) | MinStok | Number | Batas minimal peringatan stok, misal: `5` |
| H (7) | Status | String | `Aktif` / `Nonaktif` |

### Tab 2: `DataTransaksi`
| No Kolom | Nama Kolom | Tipe Data | Deskripsi & Contoh |
| :---: | :--- | :--- | :--- |
| A (0) | NoTransaksi | String | ID Transaksi otomatis, misal: `TRX-202611-0001` |
| B (1) | WaktuTransaksi | String | Timestamp baku, misal: `2026-11-21 20:30:00` |
| C (2) | IDToko | String | Relasi profil toko, misal: `SHP-001` |
| D (3) | NamaToko | String | Nama toko saat transaksi, misal: `Toko Berkah Mandiri` |
| E (4) | TotalItem | Number | Total kuantitas barang, misal: `3` |
| F (5) | TotalOmzet | Number | Total nilai belanja konsumen, misal: `150000` |
| G (6) | TotalHPP | Number | Total modal dari barang terjual, misal: `130000` |
| H (7) | TotalProfit | Number | Keuntungan bersih transaksi, misal: `20000` |
| I (8) | MetodeBayar | String | `Tunai`, `QRIS`, `Transfer` |
| J (9) | NominalBayar | Number | Uang yang diserahkan konsumen, misal: `150000` |
| K (10)| Kembalian | Number | Nominal uang kembalian, misal: `0` |
| L (11)| Kasir | String | Nama operator/kasir, misal: `Kasir 1` |

### Tab 3: `DetailTransaksi`
| No Kolom | Nama Kolom | Tipe Data | Deskripsi & Contoh |
| :---: | :--- | :--- | :--- |
| A (0) | NoTransaksi | String | Relasi ke NoTransaksi, misal: `TRX-202611-0001` |
| B (1) | IDProduk | String | Kode barang, misal: `PRD-0001` |
| C (2) | NamaProduk | String | Nama barang saat transaksi |
| D (3) | HargaBeli | Number | Modal satuan saat transaksi, misal: `65000` |
| E (4) | HargaJual | Number | Harga jual satuan, misal: `75000` |
| F (5) | Qty | Number | Jumlah yang dibeli, misal: `2` |
| G (6) | Subtotal | Number | `Qty * HargaJual`, misal: `150000` |
| H (7) | ProfitItem | Number | `(HargaJual - HargaBeli) * Qty`, misal: `20000` |

### Tab 4: `ProfilToko`
| No Kolom | Nama Kolom | Tipe Data | Deskripsi & Contoh |
| :---: | :--- | :--- | :--- |
| A (0) | IDToko | String | ID Profil Toko, misal: `SHP-001` |
| B (1) | NamaToko | String | Nama toko di struk, misal: `Toko Berkah Utama` |
| C (2) | AlamatToko | String | Alamat fisik toko, misal: `Jl. Raya Pasar No. 12` |
| D (3) | TeleponToko | String | Nomor HP/WhatsApp toko, misal: `081234567890` |
| E (4) | PesanFooter | String | Catatan kaki struk, misal: `Terima Kasih Atas Kunjungan Anda!` |
| F (5) | IsDefault | Boolean | `true` jika menjadi template default kasir |

---

## 6. ATURAN VALIDASI & LOGIKA KHUSUS
1. **Formula Perhitungan Profit:**
   - `Profit per Produk = HargaJual - HargaBeli`
   - `Margin Persentase = ((HargaJual - HargaBeli) / HargaBeli) * 100%`
   - `Profit Transaksi = TotalOmzet - TotalHPP`
   - `Profit Global (Laba Bersih Toko) = SUM(TotalProfit Transaksi)`
2. **Penomoran Otomatis Sekuensial:**
   - Format Transaksi: `TRX-YYYYMM-XXXX` (contoh: `TRX-202611-0001`, `TRX-202611-0002`).
   - Format Produk: `PRD-XXXX` (contoh: `PRD-0001`, `PRD-0002`).
   - Format Profil Toko: `SHP-XXX` (contoh: `SHP-001`).
   - Dihitung via `LockService` di backend Google Apps Script untuk mencegah nomor dobel saat multi-device.
3. **Validasi Pengurangan Stok:**
   - Jika `Qty Belanja > Sisa Stok`, sistem memunculkan peringatan konfirmasi dan mencegah stok menjadi negatif tanpa izin kasir.
4. **Logika Koneksi Printer Bluetooth:**
   - Menyediakan tombol "Hubungkan Printer Bluetooth" di antarmuka kasir.
   - Menggunakan Web Bluetooth API untuk mengirim buffer ESC/POS biner (teks rata tengah, nama toko tebal, baris pemisah titik-titik, dan *line feed*).
   - Menyediakan tombol cadangan "Cetak Layar / Struk Browser" jika perangkat tidak mendukung Web Bluetooth (misal browser iOS atau PC tanpa adaptor Bluetooth).

---

## 7. RENCANA ANTARMUKA PENGGUNA (UI/UX)
- **Tema Desain:** Clean Modern (Slate 900 untuk tipografi dan header, Slate 50 untuk latar canvas, Indigo/Navy untuk tombol primer, Emerald untuk status profit dan sukses).
- **Navigasi:** Navbar responsif dengan navigasi tab:
  1. `Kasir (POS)`
  2. `Produk & Stok`
  3. `Laporan & Profit`
  4. `Profil Toko`
- **Fitur Khusus UI:**
  - Desain Anti-AI: Bersih, menggunakan ikon SVG vektor yang tajam (tanpa emoji norak).
  - Tampilan kasir 2 panel di desktop (panel kiri: katalog produk & pencarian, panel kanan: keranjang belanja & kasir) yang otomatis menjadi vertikal bertingkat di layar ponsel pintar.
  - Kartu ringkasan metrik dashboard (Omzet, Modal, Profit) tersusun dalam grid responsif 3 kolom yang kompak.
  - Modal cetak struk interaktif dengan pratinjau tampilan kertas thermal 58mm yang rapi.

---

## 8. KRITERIA PENGUJIAN (TESTING CHECKLIST)
- [ ] Profil toko baru berhasil ditambahkan dan dapat dipilih di halaman kasir.
- [ ] Tambah produk baru berhasil menghitung margin profit secara otomatis.
- [ ] Transaksi kasir dengan beberapa item berhasil menghitung Subtotal, Total, dan Kembalian Tunai secara akurat.
- [ ] Tombol simpan transaksi memotong stok produk di tab `DataProduk` secara instan.
- [ ] No. Transaksi terbit secara urut (`TRX-YYYYMM-XXXX`) tanpa duplikasi.
- [ ] Halaman laporan laba rugi menampilkan akumulasi omzet, HPP, dan laba bersih secara tepat.
- [ ] Cetak struk Bluetooth berhasil terkirim ke printer thermal atau muncul di pratinjau cetak browser.

================================================================================
ZONA BAWAH: MASTER CONTEXT & LOGIKA SISTEM TERKINI (LIVING CONTEXT)
================================================================================

### Status Arsitektur & Lingkungan Aktif
- **Workspace:** `c:\Users\HP\kASIR`
- **Engine Status:** ZettBOT Core v4.1 Active
- **Arsitektur:** Monolith (3 berkas inti): `code.gs` (backend + API), `setup.gs` (safe migration & penyimpan `SPREADSHEET_ID`), `index.html` (UI + CSS + JS). Ditambah `.vercelignore` dan `PANDUAN-VERCEL.md` untuk deployment frontend ke Vercel.
- **Status:** Kode v1.1 SIAP DEPLOY KE VERCEL + GOOGLE SHEETS.
- **Mode Frontend (satu berkas, dua mode):**
  - Mode Utama (Vercel / HTTPS): `index.html` dihosting di Vercel (`.vercelignore` mengecualikan berkas `.gs` & `.md`), memanggil `doPost()` Apps Script via `fetch` (`text/plain`). Web Bluetooth aktif. Mendukung auto-setup cepat via `#url=...&token=...` (langsung dibersihkan dari address bar).
  - Mode GAS (Opsional / Tanpa Bluetooth): `index.html` disajikan `doGet()`, memanggil backend via `google.script.run.apiCall(token, fn, args)`.
- **Keamanan:** Hanya `apiCall`/`doPost` yang publik; semua fungsi data berakhiran `_` (privat). Deployment Apps Script menggunakan akses *Anyone* dengan validasi wajib 16 karakter Kode Akses (`API_TOKEN` di Script Properties). Harga transaksi selalu dihitung ulang di backend. Deteksi otomatis jika URL `/dev` atau respon server HTML (bukan JSON).
- **Batasan Teknis:** Web Bluetooth diblokir di iframe Google Apps Script maupun browser iOS (iPhone/iPad), serta memerlukan printer BLE. Cadangan universal: Cetak Browser (`window.print`, @page 58/80mm).
- **Printer:** ESC/POS via Web Bluetooth (58mm = 32 karakter, 80mm = 48 karakter), teks dikonversi ASCII.

### Skema Database Aktif
Nama tab tanpa underscore. Pembacaan berbasis indeks kolom (konstanta `COL` di `code.gs`), kolom baru hanya boleh ditambah di kanan.
- `DataProduk` (A-H): IDProduk, NamaProduk, Kategori, HargaBeli, HargaJual, Stok, MinStok, Status (`Aktif`/`Nonaktif`).
- `DataTransaksi` (A-L): NoTransaksi, WaktuTransaksi, IDToko, NamaToko, TotalItem, TotalOmzet, TotalHPP, TotalProfit, MetodeBayar, NominalBayar, Kembalian, Kasir.
- `DetailTransaksi` (A-H): NoTransaksi, IDProduk, NamaProduk, HargaBeli, HargaJual, Qty, Subtotal, ProfitItem (snapshot harga saat transaksi).
- `ProfilToko` (A-F): IDToko, NamaToko, AlamatToko, TeleponToko, PesanFooter, IsDefault (`Ya`/`Tidak`).

### Logika Bisnis & Formula Hitung Aktif
- `ProfitItem = (HargaJual - HargaBeli) * Qty`
- `ProfitTransaksi = TotalOmzet - TotalHPP`
- `NetProfitGlobal = SUM(ProfitTransaksi)`
- `KodeFormat = TRX-YYYYMM-XXXX` (MAX+1 per bulan, dikunci `LockService`), `PRD-XXXX`, `SHP-XXX`.
- Stok tidak boleh negatif: transaksi ditolak jika Qty > Stok. Produk tidak dihapus, hanya dinonaktifkan (riwayat aman).
- Metode bayar: Tunai (wajib bayar >= total, kembalian otomatis), QRIS & Transfer (bayar = total).
- Laporan: filter Hari ini / 7 hari / Bulan ini / Semua / Rentang tanggal; pagination & filter di backend (20 baris per muat).
- Cache klien: data dimuat sekali per menu, di-invalidate saat ada mutasi; stok diperbarui optimistik setelah transaksi.

### Log Pembaruan Resmi
- *2026-11-21:* Draf spesifikasi awal (PRD v1.0) disusun.
- *2026-11-25:* Kode v1.0 dibuat (`code.gs`, `setup.gs`, `index.html`).
- *2026-11-26:* Penerapan kesiapan deploy Vercel + Google Sheets (v1.1): tambah `.vercelignore`, `PANDUAN-VERCEL.md`, penyimpanan `SPREADSHEET_ID` di `setup.gs`, deteksi error respon HTML/URL `/dev`, serta tombol **Salin Link Setup HP** via `#hash` di `index.html`.
