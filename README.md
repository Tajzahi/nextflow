# Nextflow Pro — Developer Guide

Selamat datang di repository Nextflow Pro. Aplikasi ini adalah bot automasi data entry berbasis Python & React (Hybrid Architecture).

## 🚀 Persiapan Awal (Setup)

Pastikan Anda sudah menginstal **Python 3.12+** dan **Node.js**.

1. **Clone Repository:**
   ```bash
   git clone https://github.com/Tajzahi/nextflow
   cd nextflow
   ```

2. **Setup Environment:**
   Jalankan script otomatisasi untuk menginstal semua dependensi Python dan Frontend:
   ```bash
   .\setup_dev.bat
   ```

## 🔐 Keamanan & Secrets (PENTING)

Aplikasi ini menggunakan sistem **Enkripsi Secrets**. Karena file `.env` dan `secrets.enc` tidak disertakan di GitHub demi keamanan, Anda harus:

1. Buat file `.env` di root folder (Minta isinya kepada pemilik project).
2. Jalankan perintah enkripsi:
   ```bash
   .venv\Scripts\python.exe build_tools/encrypt_env.py
   ```
3. Copy **Build Key** yang muncul di terminal.
4. Buka `core/config_loader.py` dan paste key tersebut di variabel `_BUILD_KEY`.

## 🛠️ Menjalankan Aplikasi (Mode Dev)

1. **Terminal 1 (Frontend):**
   ```bash
   npm run dev
   ```
2. **Terminal 2 (Backend):**
   ```bash
   .venv\Scripts\python.exe main.py
   ```

## 🏗️ Cara Membuat Build (.exe)

Cukup jalankan script build otomatis:
```bash
.\build.bat
```
Hasil build akan berada di folder `build/main.dist/`.

---
*Dibuat dengan ❤️ oleh Nextflow Pro Team.*