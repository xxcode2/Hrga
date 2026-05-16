# Hrga - Team Work Dashboard

Dashboard manajemen laporan kerja tim dengan sinkronisasi database real-time.

## ✨ Fitur

- 📋 **Input Laporan Kerja**: Catat aktivitas harian tim dengan detail lengkap
- 👥 **Manajemen Tim**: Kelola anggota tim dengan mudah
- 📊 **Dashboard Statistik**: Lihat ringkasan laporan dan anggota aktif
- 📅 **Filter Tanggal**: Lihat laporan berdasarkan rentang tanggal yang dipilih
- 📸 **Upload Bukti Foto**: Sertakan bukti kerja dalam bentuk foto
- 📥 **Export Excel**: Download laporan dalam format Excel
- 🔄 **Sinkronisasi Database**: Otomatis sinkronisasi data antar perangkat
- 🌐 **Akses Offline**: Data tetap tersimpan lokal saat offline
- 📱 **Responsive Design**: Bekerja sempurna di PC, tablet, dan HP

## 🔧 Perbaikan Terbaru (Update Lengkap)

### ✅ Issue #1: Tiga Tanggal di Laporan
**Masalah**: Laporan menampilkan 3 pemilih tanggal, membingungkan pengguna.
**Solusi**: 
- Menghapus tombol "Kemarin/Besok" dan date picker individual
- Menyisakan hanya filter rentang tanggal "Dari - Sampai" yang bersih
- Laporan sekarang menampilkan semua data dalam rentang tanggal yang dipilih

### ✅ Issue #2: Fitur Upload Foto Profil di Pengaturan
**Masalah**: Ada fitur upload foto yang tidak diinginkan di profil pengaturan.
**Solusi**:
- Menghapus input file untuk upload foto profil
- Menghapus fungsi `previewSetupPhoto()` 
- Pengaturan sekarang hanya menampilkan nama dan jabatan anggota tim

### ✅ Issue #3: Data Tidak Sinkron PC ↔ HP (SOLUSI UTAMA)
**Masalah**: Menggunakan localStorage (lokal browser) - data PC tidak muncul di HP
**Solusi Komprehensif**:

#### Backend Database
- ✅ Server Node.js dengan Express API
- ✅ PostgreSQL (Neon) untuk penyimpanan data terpusat
- ✅ Database schema untuk teams dan reports
- ✅ API endpoints untuk sync data real-time

#### Fitur Sinkronisasi
1. **Auto-Sync on Start**: Saat aplikasi dibuka, otomatis pull data dari server
2. **Periodic Sync**: Setiap 30 detik, data disinkronisasi dengan server
3. **Network Detection**: 
   - 🟢 Online → Sinkronisasi real-time
   - 🔴 Offline → Data tersimpan lokal, akan sync saat online
4. **Push on Action**: Setiap kali ada perubahan (laporan baru, edit settings), langsung di-push ke server

## 📋 Database Schema

### Teams Table
```sql
id INTEGER PRIMARY KEY
member_index INTEGER UNIQUE -- Index anggota (0-7)
name VARCHAR(255) -- Nama anggota
role VARCHAR(255) -- Jabatan
image TEXT -- Foto profil (base64)
created_at TIMESTAMP
updated_at TIMESTAMP
```

### Reports Table
```sql
id BIGINT PRIMARY KEY -- Timestamp saat dibuat
member_index INTEGER -- FK ke teams
task TEXT -- Pekerjaan
location VARCHAR(255) -- Lokasi pengerjaan
status VARCHAR(50) -- Dalam Proses/Selesai/Menunggu
notes TEXT -- Catatan tambahan
image TEXT -- Foto bukti (base64)
created_at TIMESTAMP
```

## 🚀 Instalasi & Setup

### 1. Install Dependencies
```bash
cd /workspaces/Hrga
npm install
```

### 2. Konfigurasi Database
Database sudah terconfigurasi di `.env` dengan Neon PostgreSQL. Verifikasi:
```bash
cat .env | grep DATABASE_URL
```

### 3. Jalankan Server
```bash
npm start
```

Server akan berjalan di `http://localhost:3000`

## 📡 API Endpoints

### Teams
- `GET /api/teams` - Dapatkan semua anggota tim
- `POST /api/teams` - Simpan/update anggota tim

### Reports
- `GET /api/reports?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` - Dapatkan laporan
- `POST /api/reports` - Buat laporan baru
- `DELETE /api/reports/:id` - Hapus laporan

### Sync
- `GET /api/sync` - Dapatkan semua data untuk full sync
- `POST /api/sync` - Push bulk data ke server

### Health Check
- `GET /api/health` - Cek status server

## 🔄 Cara Kerja Sinkronisasi

### Saat Aplikasi Dimulai
```
1. Frontend load data dari localStorage
2. Cek koneksi internet
3. Jika online:
   - Push data lokal ke server
   - Pull data terbaru dari server
   - Update localStorage
4. Jika offline:
   - Gunakan data lokal saja
   - Queue perubahan untuk sync nanti
```

### Saat Ada Perubahan (Input Laporan, Edit Settings)
```
1. Simpan ke localStorage (instant, offline-safe)
2. Jika online:
   - POST data ke API secara async
   - Show success notification
3. Jika offline:
   - Data tetap tersimpan lokal
   - Akan sync saat online
```

### Periodic Sync (Setiap 30 Detik)
```
1. Cek apakah online
2. Jika ada perubahan lokal yang belum di-sync:
   - Push ke server
3. Pull data terbaru dari server
4. Update UI jika ada perubahan dari device lain
```

## 📱 Penggunaan Antar Perangkat

### PC & HP Tetap Sinkron
1. Buka dashboard di PC: `http://localhost:3000` (atau domain produksi)
2. Buka dashboard di HP (harus terhubung ke jaringan yang sama atau domain online)
3. Input laporan di PC → Muncul otomatis di HP dalam 30 detik
4. Edit settings di HP → Muncul otomatis di PC

### Cara Kerja Detail
- **Data Terpusat**: Semua data disimpan di PostgreSQL server
- **Sinkronisasi Real-time**: Setiap device memiliki copy lokal yang di-sync regular
- **Offline Support**: Jika HP/PC offline, tetap bisa input data
- **Conflict Resolution**: Last-write-wins (data terbaru yang disimpan)

## 🛠️ Struktur File

```
/workspaces/Hrga/
├── index.html           # Frontend (dashboard)
├── server.js            # Backend Express server
├── db.js                # Database connection & schema
├── package.json         # Dependencies
├── .env                 # Database credentials (Neon)
└── README.md            # Dokumentasi
```

## 🔒 Keamanan

- ✅ SSL/TLS untuk koneksi database
- ✅ CORS enabled untuk akses lintas domain
- ✅ Data validation di backend
- ✅ Base64 encoding untuk foto (embedded)

## 📊 Monitoring & Debugging

### Check Status Server
```bash
curl http://localhost:3000/api/health
```

### Check Teams di Database
```bash
curl http://localhost:3000/api/teams | jq
```

### Check Reports
```bash
curl "http://localhost:3000/api/reports?startDate=2024-01-01&endDate=2024-12-31" | jq
```

### View Server Logs
Server logs akan tampil di terminal tempat npm start dijalankan.

## 🚀 Deployment ke Produksi

1. Deploy backend ke Vercel, Render, Railway, atau hosting lain
2. Update `API_BASE_URL` di frontend dengan URL produksi
3. Database Neon sudah cloud-ready, tidak perlu konfigurasi tambahan

## ✅ Checklist Perbaikan

- [x] Hapus 3 pemilih tanggal, pakai 1 rentang "Dari-Sampai"
- [x] Hapus fitur upload foto profil
- [x] Buat backend API dengan Express
- [x] Setup PostgreSQL schema (teams & reports)
- [x] Implementasi sinkronisasi otomatis
- [x] Network detection (online/offline)
- [x] Periodic sync (30 detik)
- [x] Push on action (laporan & settings)
- [x] Offline support dengan localStorage
- [x] Update frontend untuk consume API

## 📞 Support

Jika ada masalah:
1. Check console browser (F12 → Console)
2. Check server logs di terminal
3. Verify database connection: `curl http://localhost:3000/api/health`
4. Verify database di Neon console

---

**Versi**: 2.0.0 (dengan Database Sync)
**Terakhir Update**: 16 May 2026
**Status**: ✅ Production Ready

