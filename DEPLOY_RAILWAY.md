# Panduan Deploy ke Railway

## Persyaratan
- Akun [Railway](https://railway.app) (gratis tersedia)
- Akun [GitHub](https://github.com) untuk menyimpan kode
- Git terinstall di komputer

---

## Langkah 1: Push Kode ke GitHub

### 1a. Buat repository di GitHub
1. Buka https://github.com/new
2. Isi nama repository (misal: `cleaner-phone`)
3. Pilih **Private** (disarankan karena ini aplikasi corporate)
4. Klik **Create repository**

### 1b. Download kode dari Replit
1. Di Replit, klik menu **⋮** (tiga titik) di pojok kanan atas
2. Pilih **Download as zip**
3. Ekstrak zip di komputer Anda

### 1c. Push ke GitHub
Buka terminal di folder yang sudah diekstrak:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA_REPO.git
git push -u origin main
```
> Ganti `USERNAME` dan `NAMA_REPO` dengan milik Anda.

---

## Langkah 2: Buat Project di Railway

1. Buka https://railway.app dan login
2. Klik **New Project**
3. Pilih **Deploy from GitHub repo**
4. Hubungkan akun GitHub jika diminta, lalu pilih repository `cleaner-phone`
5. Railway akan otomatis mendeteksi konfigurasi dari `railway.toml`

---

## Langkah 3: Tambah Database PostgreSQL

1. Di dashboard project Railway, klik **+ New**
2. Pilih **Database** → **Add PostgreSQL**
3. Setelah database dibuat, klik service PostgreSQL
4. Buka tab **Variables**
5. Salin nilai `DATABASE_URL`

Railway akan otomatis menambahkan `DATABASE_URL` ke environment variables server Anda.

---

## Langkah 4: Set Environment Variables

Di Railway, klik service aplikasi Anda → tab **Variables**, tambahkan:

| Variable | Nilai | Keterangan |
|---|---|---|
| `SESSION_SECRET` | string acak panjang | Gunakan: `openssl rand -hex 32` |
| `SUPER_ADMIN_PASSWORD` | password pilihan Anda | Password login akun admin |
| `NODE_ENV` | `production` | Sudah di-set otomatis |

**Untuk fitur upload gambar (opsional):**
| Variable | Nilai |
|---|---|
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Isi file JSON service account GCS |
| `PUBLIC_OBJECT_SEARCH_PATHS` | Path bucket GCS publik |
| `PRIVATE_OBJECT_DIR` | Path bucket GCS privat |

> Jika tidak set GCS credentials, fitur upload gambar tidak akan bekerja, tapi fitur chat teks tetap berfungsi normal.

---

## Langkah 5: Deploy

1. Setelah semua variable di-set, Railway akan otomatis deploy ulang
2. Tunggu proses build selesai (~3-5 menit)
3. Klik **Settings** → salin **Public Domain** Anda (contoh: `cleaner-phone.up.railway.app`)

---

## Langkah 6: Build APK yang Mengarah ke Railway

Di file `eas.json` atau saat build, set environment variable:
```
EXPO_PUBLIC_API_URL=https://cleaner-phone.up.railway.app
```

Atau tambahkan ke `.env` sebelum build EAS:
```
EXPO_PUBLIC_API_URL=https://cleaner-phone.up.railway.app
```

Lalu build APK:
```bash
eas build --platform android --profile preview
```

---

## Verifikasi

Setelah deploy, cek endpoint health check:
```
https://YOUR-APP.up.railway.app/api/health
```
Harus mengembalikan: `{"status":"ok","timestamp":"..."}`

---

## Akun Default

Setelah pertama kali deploy, akun admin dibuat otomatis:
- **Username**: `admin`  
- **Password**: nilai `SUPER_ADMIN_PASSWORD` yang Anda set

---

## Troubleshooting

**Error "DATABASE_URL must be set"**
→ Pastikan PostgreSQL sudah ditambahkan di Railway dan `DATABASE_URL` ada di Variables.

**Error saat login (401)**
→ Pastikan `SESSION_SECRET` sudah di-set di Variables.

**Aplikasi tidak bisa connect ke server**
→ Pastikan `EXPO_PUBLIC_API_URL` sudah di-set ke URL Railway saat build APK.
