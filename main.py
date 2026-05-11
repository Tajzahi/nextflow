# main.py — Entry point Nextflow Pro
# Kompatibel dengan Nuitka Standalone Build

import sys
import os


# ============================================
# BAGIAN 1: DETEKSI BASE DIRECTORY
# Nuitka: __file__ menunjuk ke lokasi .exe
# Dev   : __file__ menunjuk ke main.py
# ============================================

def get_base_dir() -> str:
    try:
        current = os.path.abspath(__file__)
        base    = os.path.dirname(current)

        # Verifikasi dengan cek dist/index.html
        if os.path.exists(os.path.join(base, "dist", "index.html")):
            return base

        # Fallback: satu level ke atas
        parent = os.path.dirname(base)
        if os.path.exists(os.path.join(parent, "dist", "index.html")):
            return parent

        # Fallback: CWD
        cwd = os.getcwd()
        if os.path.exists(os.path.join(cwd, "dist", "index.html")):
            return cwd

        return base

    except Exception:
        return os.getcwd()


BASE_DIR = get_base_dir()
UI_PATH  = os.path.join(BASE_DIR, "dist", "index.html")

# Tambahkan BASE_DIR ke sys.path untuk import module internal
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)


# ============================================
# BAGIAN 2: IMPORT (setelah sys.path diset)
# ============================================

import webview
from core.constants        import APP_NAME_DISPLAY
from core.webview2_checker import check_and_handle_webview2
from bridge                import create_bridge


# ============================================
# BAGIAN 3: VALIDASI STARTUP
# ============================================

def validate_startup() -> bool:
    """
    Memastikan semua file kritis tersedia.
    Mencegah blank screen atau crash diam-diam.
    """
    import ctypes

    critical = {
        "UI (index.html)" : UI_PATH,
        "Secrets"         : os.path.join(
                                BASE_DIR, "core", "secrets.enc"
                            ),
    }

    missing = [
        f"  - {name}: {path}"
        for name, path in critical.items()
        if not os.path.exists(path)
    ]

    if missing:
        ctypes.windll.user32.MessageBoxW(
            0,
            "File kritis tidak ditemukan:\n"
            + "\n".join(missing)
            + f"\n\nBase Dir: {BASE_DIR}",
            "Nextflow Pro — Error",
            0x10
        )
        return False

    return True


# ============================================
# BAGIAN 4: BRIDGE & MAIN
# ============================================

def start_bridge(window):
    bridge = create_bridge(window, BASE_DIR)
    # KEMBALIKAN KE CARA LAMA: Ekspos seluruh fungsi bridge agar UI normal kembali
    window.expose(bridge) 


def main():

    # Cek 1: WebView2 tersedia?
    if not check_and_handle_webview2():
        sys.exit(0)

    # Cek 2: File kritis ada?
    if not validate_startup():
        sys.exit(1)

    # --- [LOGIKA AUTO-CENTER DIPERBAIKI] ---
    app_width  = 1100
    app_height = 600
    
    try:
        screens = webview.screens
        if screens:
            screen  = screens[0]
            start_x = (screen.width - app_width) // 2
            start_y = (screen.height - app_height) // 2
        else:
            start_x, start_y = 100, 100
    except Exception:
        start_x, start_y = 100, 100

    # 4. Inisialisasi Bridge (Logic Layer)
    from bridge import create_bridge
    bridge = create_bridge(None, BASE_DIR) 

    # 5. Create Window
    window = webview.create_window(
        title            = APP_NAME_DISPLAY,
        url              = UI_PATH,
        width            = app_width,
        height           = app_height,
        x                = start_x,
        y                = start_y,
        min_size         = (1024, 600),
        background_color = '#0f172a',
        resizable        = True,
        js_api           = bridge  # SELURUH FUNGSI BRIDGE TERSEDIA DI UI
    )

    # Hubungkan balik window ke bridge untuk callback
    bridge._window = window

    webview.start(
        debug = False,
        gui   = "edgechromium",
    )


if __name__ == "__main__":
    main()