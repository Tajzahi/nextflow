# core/config_loader.py
# Membaca secrets terenkripsi dari secrets.enc
# yang dihasilkan oleh build_tools/encrypt_env.py

from cryptography.fernet import Fernet
import os
import sys

# ============================================
# GANTI NILAI INI SETELAH MENJALANKAN:
# python build_tools/encrypt_env.py
# ============================================
_BUILD_KEY = b"Xw01UkFTMaLJh0yIYrTXTIa-TI4oUqwCBz9P4mU-LfQ="

_secrets_cache: dict = {}


def _get_base_path() -> str:
    """
    Mendapatkan base path yang benar untuk
    development maupun binary Nuitka.
    """
    try:
        current_file = os.path.abspath(__file__)
        # core/config_loader.py → naik satu level = root
        return os.path.dirname(os.path.dirname(current_file))
    except Exception:
        return os.getcwd()


def load_secrets() -> dict:
    """
    Mendekripsi secrets.enc dan mengembalikan dict.
    Menggunakan cache agar dekripsi hanya terjadi sekali.
    """
    global _secrets_cache

    if _secrets_cache:
        return _secrets_cache

    if _BUILD_KEY == b"PASTE_KEY_DISINI":
        raise RuntimeError(
            "BUILD KEY BELUM DISET!\n"
            "Jalankan: python build_tools/encrypt_env.py\n"
            "Lalu update _BUILD_KEY di core/config_loader.py"
        )

    base_path   = _get_base_path()
    secrets_path = os.path.join(base_path, "core", "secrets.enc")

    if not os.path.exists(secrets_path):
        raise FileNotFoundError(
            f"secrets.enc tidak ditemukan di: {secrets_path}\n"
            "Jalankan: python build_tools/encrypt_env.py"
        )

    try:
        with open(secrets_path, "rb") as f:
            encrypted_data = f.read()

        fernet    = Fernet(_BUILD_KEY)
        decrypted = fernet.decrypt(encrypted_data).decode("utf-8")

        secrets = {}
        for line in decrypted.strip().split("\n"):
            line = line.strip()
            if line and "=" in line:
                key, _, value = line.partition("=")
                secrets[key.strip()] = value.strip()

        _secrets_cache = secrets
        return secrets

    except Exception as e:
        raise RuntimeError(f"Gagal mendekripsi secrets: {e}")


def get_secret(key: str, default: str = None) -> str:
    """
    Mengambil satu nilai secret.
    
    Penggunaan:
        from core.config_loader import get_secret
        url = get_secret("SUPABASE_URL")
    """
    secrets = load_secrets()
    value   = secrets.get(key, default)

    if value is None:
        raise KeyError(
            f"Secret '{key}' tidak ditemukan di secrets.enc.\n"
            "Periksa file .env Anda."
        )

    return value
