@echo off
setlocal enabledelayedexpansion
title Nextflow Pro — Build Pipeline

echo.
echo ==============================================
echo   NEXTFLOW PRO — BUILD PIPELINE
echo ==============================================
echo.

REM ── Konfigurasi ──────────────────────────────
set APP_NAME=NextflowPro
set VENV=.venv
set OUT_DIR=build

REM ── Step 1: Validasi environment ─────────────
echo [1/6] Validasi environment...

call %VENV%\Scripts\activate.bat
if errorlevel 1 (
    echo ERROR: Virtual environment tidak ditemukan!
    pause & exit /b 1
)

if not exist "dist\index.html" (
    echo ERROR: dist\index.html tidak ditemukan!
    echo Jalankan: npm run build
    pause & exit /b 1
)

if not exist "core\secrets.enc" (
    echo ERROR: core\secrets.enc tidak ditemukan!
    echo Jalankan: python build_tools\encrypt_env.py
    pause & exit /b 1
)

if not exist "assets\icon.ico" (
    echo PERINGATAN: assets\icon.ico tidak ditemukan.
    set HAS_ICON=0
) else (
    set HAS_ICON=1
)

echo [OK] Environment valid.

REM ── Step 2: Deteksi Selenium Manager ─────────
echo.
echo [2/6] Deteksi Selenium Manager...

for /f "delims=" %%P in (
    '.venv\Scripts\python.exe -c "import selenium,os; print(os.path.join(os.path.dirname(selenium.__file__),'webdriver','common','windows','selenium-manager.exe'))"'
) do set SM_PATH=%%P

if not exist "!SM_PATH!" (
    echo ERROR: selenium-manager.exe tidak ditemukan!
    echo Path: !SM_PATH!
    pause & exit /b 1
)
echo [OK] !SM_PATH!

REM ── Step 3: Bersihkan build lama ─────────────
echo.
echo [3/6] Membersihkan build sebelumnya...

REM if exist "%OUT_DIR%" rmdir /s /q "%OUT_DIR%"
REM mkdir "%OUT_DIR%"
echo [OK] Menggunakan cache build sebelumnya (Resume).

REM ── Step 4: Kompilasi Nuitka ──────────────────
echo.
echo [4/6] Memulai kompilasi Nuitka...
echo       Estimasi waktu: 15-30 menit.
echo       Jangan tutup window ini.
echo.

if "%HAS_ICON%"=="1" (
    set ICON_FLAG=--windows-icon-from-ico=assets\icon.ico
) else (
    set ICON_FLAG=
)

.venv\Scripts\python.exe -m nuitka ^
    --standalone ^
    --windows-console-mode=force ^
    --show-progress ^
    %ICON_FLAG% ^
    --output-filename=%APP_NAME% ^
    --output-dir=%OUT_DIR% ^
    --company-name="Antigravity" ^
    --product-name="Nextflow Pro" ^
    --file-version=2.0.0 ^
    --product-version=2.0.0 ^
    --include-data-dir=dist=dist ^
    --include-data-dir=core=core ^
    --include-data-dir=config=config ^
    --disable-plugin=pywebview ^
    --include-package=webview ^
    --include-package=webview.platforms.win32 ^
    --include-package=webview.platforms.edgechromium ^
    --include-package=selenium ^
    --include-package=pandas ^
    --include-package=openpyxl ^
    --include-package=cryptography ^
    --noinclude-pytest-mode=nofollow ^
    --noinclude-setuptools-mode=nofollow ^
    --nofollow-import-to=pandas.tests ^
    --nofollow-import-to=unittest ^
    --include-package=keyring ^
    --include-package=supabase ^
    --include-package=sqlite3 ^
    --nofollow-import-to=tkinter ^
    --nofollow-import-to=unittest ^
    --nofollow-import-to=test ^
    --nofollow-import-to=pydoc ^
    --nofollow-import-to=doctest ^
    --enable-plugin=anti-bloat ^
    --assume-yes-for-downloads ^
    main.py

REM ── Step 5: Verifikasi output ─────────────────
echo.
echo [5/6] Verifikasi hasil build...

set EXE=%OUT_DIR%\main.dist\%APP_NAME%.exe

if not exist "!EXE!" (
    echo ERROR: File .exe tidak terbentuk!
    pause & exit /b 1
)

echo [OK] Binary: !EXE!

REM ── Step 6: Security audit ────────────────────
echo.
echo [6/6] Security audit...

.venv\Scripts\python.exe build_tools\post_build_audit.py "!EXE!"

if errorlevel 1 (
    echo.
    echo ==============================================
    echo   BUILD GAGAL - SECURITY AUDIT FAILED
    echo ==============================================
    pause & exit /b 1
)

echo.
echo ==============================================
echo   BUILD BERHASIL
echo   Output : build\NextflowPro.dist\
echo   Lanjut : Jalankan Inno Setup
echo ==============================================
echo.
pause
