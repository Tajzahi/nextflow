# core/webview2_checker.py
# Memeriksa ketersediaan WebView2 sebelum app dibuka

import winreg
import ctypes
import os
import subprocess

WEBVIEW2_DOWNLOAD_URL = (
    "https://developer.microsoft.com/en-us/"
    "microsoft-edge/webview2/#download-section"
)


def get_webview2_version():
    """
    Cek WebView2 via Windows Registry.
    Returns: (bool, str) → (is_installed, version)
    """
    registry_paths = [
        (
            winreg.HKEY_LOCAL_MACHINE,
            r"SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate"
            r"\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
        ),
        (
            winreg.HKEY_CURRENT_USER,
            r"SOFTWARE\Microsoft\EdgeUpdate\Clients"
            r"\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
        ),
        (
            winreg.HKEY_LOCAL_MACHINE,
            r"SOFTWARE\Microsoft\EdgeUpdate\Clients"
            r"\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
        ),
    ]

    for hive, path in registry_paths:
        try:
            key     = winreg.OpenKey(hive, path)
            version, _ = winreg.QueryValueEx(key, "pv")
            winreg.CloseKey(key)
            if version and version != "0.0.0.0":
                return True, version
        except (FileNotFoundError, OSError):
            continue

    return False, ""


def show_missing_dialog() -> bool:
    """
    Tampilkan dialog informatif jika WebView2 tidak ada.
    Returns True jika user mau download.
    """
    message = (
        "Nextflow Pro memerlukan komponen tambahan:\n"
        "Microsoft Edge WebView2 Runtime\n\n"
        "Komponen ini GRATIS dari Microsoft dan biasanya\n"
        "sudah ada di Windows 10/11 versi terbaru.\n\n"
        "Klik OK untuk membuka halaman download,\n"
        "lalu jalankan kembali Nextflow Pro.\n\n"
        "Klik Cancel untuk keluar."
    )
    result = ctypes.windll.user32.MessageBoxW(
        0,
        message,
        "Nextflow Pro — Komponen Diperlukan",
        0x00000001 | 0x00000040 | 0x00040000
    )
    return result == 1   # IDOK


def open_download_page():
    try:
        os.startfile(WEBVIEW2_DOWNLOAD_URL)
    except Exception:
        try:
            subprocess.Popen([
                "rundll32",
                "url.dll,FileProtocolHandler",
                WEBVIEW2_DOWNLOAD_URL
            ])
        except Exception:
            ctypes.windll.user32.MessageBoxW(
                0,
                f"Buka URL ini di browser:\n\n{WEBVIEW2_DOWNLOAD_URL}",
                "Download WebView2",
                0x00000040
            )


def check_and_handle_webview2() -> bool:
    """
    Fungsi utama yang dipanggil dari main.py.
    Returns True jika siap lanjut, False jika harus exit.
    """
    is_installed, _ = get_webview2_version()

    if is_installed:
        return True

    wants_download = show_missing_dialog()
    if wants_download:
        open_download_page()

    return False
