import os
from pathlib import Path

try:
    import keyring
    KEYRING_AVAILABLE = True
except ImportError:
    KEYRING_AVAILABLE = False

SERVICE_NAME = "NextFlowPro"
TOKEN_KEY = "license_token"

def reset_all():
    print("=== NEXTFLOW PRO V2: RESET BRANKAS ===")
    
    appdata_path = os.getenv('APPDATA')
    app_dir = Path(appdata_path) / "NextFlowPro"
    db_path = app_dir / "laporan.db"
    key_file = app_dir / ".fernet_key"
    log_dir = app_dir / "logs"

    # 1. Reset SQLite
    if db_path.exists():
        try:
            db_path.unlink()
            print(f"[OK] Database {db_path.name} berhasil dihapus.")
        except Exception as e:
            print(f"[ERROR] Gagal menghapus database: {e}")
    else:
        print("[INFO] Database tidak ditemukan.")

    # 2. Reset Fernet Key
    if key_file.exists():
        try:
            key_file.unlink()
            print("[OK] File kunci enkripsi (.fernet_key) dihapus.")
        except Exception as e:
            print(f"[ERROR] Gagal menghapus kunci: {e}")

    # 3. Clear Keyring
    if KEYRING_AVAILABLE:
        try:
            keyring.delete_password(SERVICE_NAME, TOKEN_KEY)
            print("[OK] Token di Windows Credential Manager dihapus.")
        except Exception:
            print("[INFO] Token tidak ditemukan di Windows Credential Manager.")

    # 4. Clear Logs
    if log_dir.exists():
        try:
            import shutil
            shutil.rmtree(log_dir)
            print("[OK] Folder log dibersihkan.")
        except Exception as e:
            print(f"[ERROR] Gagal membersihkan log: {e}")

    print("\n[SELESAI] Seluruh brankas lokal telah dibersihkan.")

if __name__ == "__main__":
    reset_all()
