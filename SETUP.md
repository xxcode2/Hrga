# 🚀 Setup Guide - Team Dashboard dengan Database Sync

## 📋 Ringkasan Perbaikan

Anda mengatakan ada 3 masalah:

1. **❌ 3 tanggal di laporan** → ✅ **DIPERBAIKI**: Sekarang hanya ada 2 date picker (Dari - Sampai)
2. **❌ Fitur upload foto di profil** → ✅ **DIPERBAIKI**: Fitur dihapus dari settings
3. **❌ Data tidak sinkron PC ↔ HP** → ✅ **DIPERBAIKI SEPENUHNYA**: 
   - Backend API dibuat ✅
   - Database PostgreSQL terhubung ✅
   - Auto-sync implemented ✅
   - Offline support ✅

---

## 🎯 Hasil Akhir

Setelah perbaikan ini, Anda akan mendapatkan:

### Aplikasi
- ✅ Dashboard yang lebih bersih (hanya 2 date pickers)
- ✅ Settings tanpa upload foto
- ✅ UI lebih simple dan user-friendly

### Database Sync
- ✅ Data PC muncul otomatis di HP (max 30 detik)
- ✅ Data HP muncul otomatis di PC (max 30 detik)
- ✅ Offline support - tetap bisa input data saat offline
- ✅ Sinkronisasi otomatis saat online kembali

### Backend Infrastructure
- ✅ Server Express.js running
- ✅ PostgreSQL (Neon) terhubung
- ✅ REST API ready
- ✅ Database schema sudah initialized

---

## 🔧 Instalasi & Testing

### Step 1: Verifikasi Instalasi

```bash
cd /workspaces/Hrga

# Cek npm packages sudah terinstall
ls node_modules | head -10

# Cek file-file penting ada
ls -la | grep -E "server|db|package|index"
```

### Step 2: Jalankan Server

```bash
# Terminal baru di VS Code
npm start
```

**Output yang diharapkan:**
```
🚀 Server running on http://localhost:3000
📊 Dashboard: http://localhost:3000
📡 API: http://localhost:3000/api

✅ Database initialization complete!
```

### Step 3: Buka Dashboard

```bash
# Di browser
http://localhost:3000
```

### Step 4: Test Sinkronisasi di Localhost

**PC #1 (Terminal 1) - Server running**
```bash
npm start
```

**PC #2 atau Tab Browser (Terminal 2) - Simulasi HP**
```bash
# Buka di browser lain / HP di jaringan yang sama
http://<IP-PC-1>:3000
# atau untuk localhost
http://localhost:3000
```

---

## 🧪 Testing Scenarios

### Test 1: Input Laporan di PC, Cek di HP

1. Buka dashboard di PC: `http://localhost:3000`
2. Buka dashboard di HP (atau tab browser): `http://localhost:3000`
3. **Di PC**: 
   - Klik anggota tim
   - Isi form laporan
   - Klik "Kirim Laporan"
   - Lihat notifikasi: "🎉 Laporan berhasil dikirim!"
4. **Di HP**: 
   - Tunggu max 30 detik
   - Lihat laporan baru muncul
   - ✅ **SUKSES**: Data ter-sync!

### Test 2: Edit Settings di HP, Cek di PC

1. **Di HP/Tab 2**:
   - Klik tombol ⚙️ (Settings)
   - Ubah nama anggota, misal "Ahmad Fauzi" → "Ahmad Fauzi Updated"
   - Klik "Simpan"
   - Lihat: "✅ Pengaturan berhasil disimpan!"

2. **Di PC/Tab 1**:
   - Scroll ke anggota tim
   - Lihat nama berubah menjadi "Ahmad Fauzi Updated"
   - ✅ **SUKSES**: Settings ter-sync!

### Test 3: Offline Support

1. **Di HP/Browser Dev Tools**:
   - Buka DevTools (F12)
   - Go to Network tab
   - Check "Offline" checkbox
   - Close DevTools

2. **Input Laporan Offline**:
   - Klik anggota tim
   - Isi form laporan
   - Klik "Kirim Laporan"
   - Lihat: "🎉 Laporan berhasil dikirim!" (data disimpan lokal)
   - Status: 🔴 "Offline - data disimpan lokal"

3. **Go Back Online**:
   - DevTools → Uncheck "Offline"
   - Tunggu notifikasi: "🟢 Terhubung ke server!"
   - Check Tab 1 (PC) → Laporan offline muncul!
   - ✅ **SUKSES**: Offline + Sync bekerja!

### Test 4: Lihat Data Sync di API

```bash
# Terminal 3 - Check teams
curl http://localhost:3000/api/teams | jq

# Output akan menampilkan semua anggota tim dari database
[
  {
    "id": 1,
    "member_index": 0,
    "name": "Ahmad Fauzi",
    "role": "Teknisi AC",
    ...
  },
  ...
]

# Check reports
curl "http://localhost:3000/api/reports?startDate=2024-05-16&endDate=2024-05-16" | jq

# Output akan menampilkan semua laporan dari database
[
  {
    "id": 1715848123456,
    "member_index": 0,
    "task": "Benerin AC lantai 2",
    "location": "Gedung A",
    "status": "Selesai",
    ...
  }
]
```

---

## 📊 Fitur Baru yang Bekerja

### ✅ 1. Sinkronisasi Otomatis
- Frontend otomatis sync setiap 30 detik
- Status koneksi ditampilkan dengan emoji:
  - 🟢 "Terhubung ke server" = Online & syncing
  - 🔴 "Offline - data disimpan lokal" = Offline mode

### ✅ 2. Date Filter (Perbaikan)
Sekarang hanya ada 2 pemilih tanggal dalam satu row:
```
[Dari: 2024-05-16] [Sampai: 2024-05-16]
```
Laporan menampilkan semua data dalam rentang tersebut.

### ✅ 3. Settings Bersih
Pengaturan anggota tim hanya tampil:
```
Anggota 1
[Input: Nama]
[Input: Jabatan]
```
Tanpa fitur upload foto.

### ✅ 4. Database Terpusat
Semua data disimpan di PostgreSQL Neon:
- Teams data
- Reports data
- Timestamp akurat

---

## 🌐 Deploy ke Produksi

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Vercel akan generate URL, misal:
```
https://hrga-team-dashboard.vercel.app
```

Update di frontend:
```javascript
const API_BASE_URL = 'https://hrga-team-dashboard.vercel.app/api'
```

### Option 2: Render.com

1. Push code ke GitHub
2. Connect repo ke Render
3. Set environment variables (copy dari .env)
4. Deploy

### Option 3: Railway.app

1. Link GitHub repo
2. Railway auto-detect Node.js
3. Set DATABASE_URL
4. Deploy

---

## 🔍 Monitoring & Debugging

### Cek Server Status
```bash
curl http://localhost:3000/api/health
```

Output: `{"status":"ok","message":"Server is running"}`

### Cek Browser Console
```
F12 → Console tab
```

Lihat logs:
- ✅ "Sync completed" = Berhasil sync
- ⚠️ "Offline - will retry" = Offline, akan retry
- ❌ Errors = Ada masalah koneksi

### Cek Database di Neon

1. Login ke https://console.neon.tech
2. Select database: `neondb`
3. Query teams:
```sql
SELECT * FROM teams;
```

4. Query reports:
```sql
SELECT * FROM reports ORDER BY created_at DESC LIMIT 10;
```

---

## ❓ Troubleshooting

### Problem: Server tidak bisa connect ke database

**Error**: `Error: connect ECONNREFUSED`

**Solusi**:
1. Cek .env file ada DATABASE_URL
2. Cek internet terhubung
3. Cek Neon database masih aktif (login ke console.neon.tech)
4. Restart server: `npm start`

### Problem: Data tidak ter-sync ke HP

**Debug**:
1. Buka Chrome DevTools di HP (F12)
2. Go to Network tab
3. Buat laporan baru
4. Lihat request ke `/api/reports`
5. Response harus `200 OK`

Jika error:
- Check server masih running
- Check HP bisa akses `http://<PC-IP>:3000`
- Check firewall allow port 3000

### Problem: Foto di laporan tidak muncul

**Noted**: Saat ini foto sudah dihapus dari fitur (tidak ada upload foto lagi).
Tapi laporan masih punya field `image` di database untuk future use.

---

## 📈 Next Steps

Setelah testing semuanya berhasil:

1. **Deploy ke Production**
   - Pilih salah satu platform (Vercel/Render/Railway)
   - Set domain
   - Share link ke team

2. **Training Tim**
   - Bagikan link dashboard
   - Jelaskan cara input laporan
   - Demo sinkronisasi

3. **Maintenance**
   - Monitor database
   - Backup data regular
   - Update npm packages

---

## 📞 Quick Reference

| Perintah | Fungsi |
|----------|--------|
| `npm start` | Jalankan server |
| `npm install` | Install dependencies |
| `curl http://localhost:3000/api/health` | Cek server |
| `curl http://localhost:3000/api/teams` | Lihat teams |
| `curl http://localhost:3000/api/reports` | Lihat reports |

---

## ✅ Verifikasi Semua Berjalan

- [ ] `npm start` → Server running tanpa error
- [ ] `curl /api/health` → Return `ok`
- [ ] Buka http://localhost:3000 → Dashboard loaded
- [ ] Input laporan di tab 1
- [ ] Laporan muncul di tab 2 dalam 30 detik
- [ ] Edit settings → Perubahan ter-sync
- [ ] Test offline → Data tetap tersimpan
- [ ] Go online → Data ter-sync otomatis

**Jika semua checklis ✅ → SETUP BERHASIL!** 🎉

---

Sekarang Anda memiliki sistem dashboard dengan database sync yang production-ready! 🚀

Pertanyaan? Lihat README.md untuk dokumentasi lengkap.
