# Panduan Deploy kASIR: Vercel + Google Sheets (Agar Printer Bluetooth Jalan)

Dengan cara ini:
- **Tampilan aplikasi (`index.html`)** berjalan di **Vercel** (HTTPS langsung, bebas blokir iframe Google) → **Printer Bluetooth aktif**.
- **Database** tetap gratis di **Google Sheets** Anda → **data lama aman dan bebas iuran bulanan**.

---

## Langkah 1: Siapkan Google Apps Script (Sekali Saja)
1. Buka Google Sheets **kasir** Anda → menu **Extensions → Apps Script**.
2. Buka berkas `setup.gs`, ganti isinya dengan kode terbaru dari [`setup.gs`](setup.gs), lalu klik ikon **Simpan (Ctrl+S)**.
3. Pilih fungsi `setupDatabase` di toolbar atas → klik **Run** *(aman, tidak menghapus data lama; langkah ini juga menyimpan ID Spreadsheet agar koneksi dari Vercel stabil)*.
4. Buka menu **kASIR → Tampilkan Kode Akses** di Google Sheets, catat **16 karakter Kode Akses** Anda.
5. Kembali ke tab **Apps Script**, klik **Deploy → Manage deployments** (atau **New deployment**):
   - Type: **Web app**
   - Execute as: **Me** (email Anda sendiri)
   - Who has access: **Anyone** *(Wajib! Supaya Vercel bisa mengirim data. Data tetap aman karena ditolak tanpa Kode Akses 16 karakter)*.
6. Klik **Deploy**, lalu **salin URL Web App** yang berakhiran **`/exec`**.

---

## Langkah 2: Upload Aplikasi ke Vercel (Gratis)
Pilih salah satu cara termudah berikut:

### Cara A — Lewat Terminal (Paling Cepat, 1 Menit)
Node.js sudah terpasang di laptop Anda.
1. Buka terminal di folder `c:\Users\HP\kASIR`.
2. Jalankan perintah:
   ```
   npx vercel --prod
   ```
3. Ikuti instruksi login Vercel di browser (bisa login pakai akun GitHub / Google / Email).
4. Saat ditanya pertanyaan setup proyek:
   - *Set up and deploy?* → **Y**
   - *Which scope?* → Enter
   - *Link to existing project?* → **N**
   - *Project name?* → ketik `kasir-toko` lalu Enter
   - *In which directory is your code located?* → `./` (Enter)
   - *Want to modify these settings?* → **N** (Enter)
5. Tunggu beberapa detik hingga muncul link produksi, misalnya: `https://kasir-toko.vercel.app`.
   *(Berkas `.vercelignore` otomatis mencegah `code.gs`, `setup.gs`, dan catatan `.md` ikut terunggah).*

### Cara B — Lewat GitHub + Website Vercel (Tanpa Terminal)
1. Buat repository baru di GitHub, lalu unggah `index.html` dan `.vercelignore` ke repository tersebut.
2. Buka [vercel.com](https://vercel.com), login, klik **Add New → Project**.
3. Pilih repository GitHub tadi → biarkan *Framework Preset: Other* → klik **Deploy**.

---

## Langkah 3: Hubungkan Aplikasi Vercel ke Google Sheets
1. Buka link Vercel Anda (misal `https://kasir-toko.vercel.app`) di browser **Chrome / Edge**.
2. Saat jendela **Koneksi & Kode Akses** muncul:
   - **Alamat Web App:** Tempel URL Apps Script yang berakhiran **`/exec`**.
   - **Kode Akses:** Tempel **16 karakter Kode Akses** dari Google Sheets.
3. Klik **Simpan & Uji Koneksi**. Produk & toko Anda langsung muncul.

---

## Langkah 4: Hubungkan HP Kasir dengan 1 Klik (Tanpa Ketik Ulang)
1. Di laptop (yang sudah terhubung), buka menu **Lainnya → Koneksi & Kode Akses**.
2. Klik tombol **Salin Link Setup HP**.
3. Kirim link tersebut ke WhatsApp pribadi Anda, lalu buka link-nya dari **Chrome di HP Android**.
4. HP Anda otomatis terhubung tanpa mengetik ulang URL panjang! *(Link otomatis dibersihkan dari address bar setelah tersimpan di HP).*

---

## Langkah 5: Tes Printer Bluetooth Thermal
1. Nyalakan printer thermal Bluetooth Anda (pastikan baterai cukup).
2. Di aplikasi kASIR (link Vercel, gunakan **Chrome / Edge**):
   - Klik tombol **Printer belum terhubung** di pojok kanan atas.
   - Pilih lebar kertas (**58 mm** atau **80 mm**).
   - Klik **Hubungkan**, pilih nama printer Anda dari daftar, lalu klik **Cetak Tes**.

> **Catatan Penting Perangkat:**
> - **iPhone / iPad (iOS):** Apple memblokir Web Bluetooth di semua browser iOS. Gunakan tombol **Cetak Browser** jika memakai iPhone/iPad.
> - **Printer Bluetooth Lama:** Web Bluetooth membutuhkan printer yang mendukung **BLE (Bluetooth Low Energy)**. Jika printer Anda memakai Bluetooth Classic lama dan tidak muncul di daftar scan, hubungkan printer via pengaturan Bluetooth Android/Windows lalu gunakan tombol **Cetak Browser** (atau aplikasi jembatan seperti RawBT di Android).
