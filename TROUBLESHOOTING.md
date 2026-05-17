# 🔧 Troubleshooting - Data Disappears Issue

## ❌ Masalah: Laporan Hilang Setelah Submit

**Gejala:**
- Input laporan di PC → Muncul sebentar → Hilang lagi
- Atau: Buat laporan di HP → Tidak muncul lagi setelah sync

---

## ✅ Penyebab & Solusi

### Penyebab #1: Server Tidak Berjalan
**Tanda:** 
- Sync dot menunjukkan "Offline"
- Data tidak bisa naik ke database

**Solusi:**
```bash
npm start
# atau
node server.js
```

Pastikan melihat:
```
✅ Server jalan di http://localhost:3000
✅ Database siap
```

---

### Penyebab #2: Logika Merge Salah (SUDAH DIPERBAIKI)

**Masalah lama:**
- Saat sync, data lokal yang sudah di-push ke server TIDAK dipertahankan
- Hanya data dari pendingReports + serverReports yang di-merge
- Laporan lokal yang belum confirmed server = hilang!

**Perbaikan yang diterapkan:**
```javascript
// SEBELUM (BUG):
const mergedReports = [...pendingReports, ...serverReports]

// SESUDAH (FIXED):
const mergedReports = [
    ...localNotOnServer,    // ← Tambahan: laporan lokal belum di-server
    ...pendingReports,      // Laporan yang push failed
    ...serverReports        // Data dari server
]
```

**Status:** ✅ SUDAH DIPERBAIKI di commit `c857bd9`

---

## 🧪 Cara Verify Semuanya Bekerja

### Test 1: Buka DevTools dan Monitor Logs

**Di Laptop (PC):**
1. Buka aplikasi: `http://localhost:3000`
2. Buka DevTools (F12)
3. Klik Console
4. Lakukan: Klik member → Input laporan → Klik Submit

**Harapan di console:**
```
🔄 Sync started...
✅ Server responsive
✅ Pending reports processed
✅ Team data pushed
✅ Data pulled from server: {teamsCount: 8, reportsCount: ...}
📌 Local report not on server yet: 1715XXX... (task: ...)
✅ Merged X reports (Y local, Z pending, A server)
📊 Final report count: ...
✅ Sync complete
```

Jika ada log: `⚠️ REPORT COUNT DECREASED` = ada data loss!

---

### Test 2: Multi-Device Sync

**Setup:**
- Terminal 1: `npm start` (Server running)
- Laptop Browser: `http://localhost:3000` (PC)
- HP Browser: `http://192.168.x.x:3000` (HP, same WiFi)

**Flow:**
1. Di HP: **Catat** berapa laporan yang ada (misal: 2 laporan)
2. Di PC: Submit laporan baru
3. Lihat toast: "🎉 Laporan tersimpan!" + "✅ Sinkronisasi ke server berhasil!"
4. Di HP: Tunggu max 30 detik
5. **SUKSES:** Laporan baru muncul di HP

---

### Test 3: Offline Input

**Setup:**
- HP: DevTools → Network → Offline

**Flow:**
1. Di HP: Input laporan → Submit
2. Lihat toast: "📱 Offline - akan sync saat online"
3. HP: DevTools → Network → Online (kembali)
4. Tunggu 30 detik atau refresh
5. **SUKSES:** Laporan muncul di PC juga

---

## 🐛 Debugging Tips

### Jika Data Masih Hilang

**Step 1: Cek Server Log**
```
Terminal di mana server berjalan harus menunjukkan:
✅ Requests masuk
✅ Database connected
```

**Step 2: Cek Database Langsung**
```bash
curl -s http://localhost:3000/api/sync | jq '.reports | length'
```

Jika berkurang = ada bug di server

**Step 3: Cek Browser Console**
```
F12 → Console → Cari log "⚠️ REPORT COUNT DECREASED"
```

Jika ada = merge logic error

---

## 📊 Expected Console Output Pattern

Saat submit laporan online:
```
🎉 Laporan tersimpan!  ← Lokal dulu
✅ Sinkronisasi ke server berhasil!  ← Push succeed

Kemudian setelah 30 detik (periodic sync):
🔄 Sync started...
✅ Server responsive
✅ Data pulled from server: {teamsCount: 8, reportsCount: 3}
📌 Local report not on server yet: 1715XXX...  ← Laporan Anda!
✅ Merged 3 reports (1 local, 0 pending, 2 server)
📊 Final report count: 3  ← Harus 3, bukan kurang!
```

---

## ✅ Verify Fix Working

Jalankan test:
```bash
# Terminal baru
cd /workspaces/Hrga

# Buat 3 test reports
for i in 1 2 3; do
  curl -X POST http://localhost:3000/api/reports \
    -H "Content-Type: application/json" \
    -d "{
      \"id\": $((1700000000000 + i)),
      \"member_index\": $((i-1)),
      \"task\": \"Test $i\",
      \"location\": \"Loc $i\",
      \"status\": \"Selesai\",
      \"image\": null,
      \"date\": \"2026-05-17T12:00:00.000Z\"
    }"
done

# Check countnya
curl -s http://localhost:3000/api/sync | jq '.reports | length'
# Harus: 3
```

---

## 🎯 Kesimpulan

| Aspek | Status | Notes |
|-------|--------|-------|
| Server Push | ✅ | API bekerja sempurna |
| Database | ✅ | PostgreSQL OK |
| Merge Logic | ✅ | **SUDAH DIPERBAIKI** |
| Local Preservation | ✅ | Laporan lokal tidak hilang lagi |
| Sync Flow | ✅ | Every 30 seconds |

**Jika masih ada issue:**
1. Cek server running (`npm start`)
2. Cek browser console untuk error
3. Buka issue di GitHub dengan screenshot dari console.log
