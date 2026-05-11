@echo off
title Nextflow Pro — Developer Setup
echo ==============================================
echo   NEXTFLOW PRO ΓÇö DEVELOPER SETUP
echo ==============================================
echo.

echo [1/3] Membuat Virtual Environment Python...
python -m venv .venv
if %errorlevel% neq 0 (
    echo [ERROR] Gagal membuat venv. Pastikan Python terinstal.
    pause & exit /b 1
)

echo [2/3] Menginstal Library Python...
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Gagal menginstal requirements.txt.
    pause & exit /b 1
)

echo [3/3] Menginstal Library Frontend (NPM)...
call npm install
if %errorlevel% neq 0 (
    echo [WARNING] NPM install gagal atau npm tidak ditemukan.
    echo Pastikan Node.js terinstal untuk menjalankan frontend.
)

echo.
echo ==============================================
echo   SETUP SELESAI! 
echo   Silakan ikuti panduan di README.md 
echo   untuk konfigurasi Secrets.
echo ==============================================
pause
