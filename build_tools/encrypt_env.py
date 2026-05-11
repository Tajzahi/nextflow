# build_tools/encrypt_env.py
# Jalankan SEKALI sebelum setiap build
# Output: core/secrets.enc + build_tools/build.key

from cryptography.fernet import Fernet
import os
import sys


def main():

    # Pastikan dijalankan dari root project
    if not os.path.exists("main.py"):
        print("ERROR: Jalankan dari root folder project!")
        print("Contoh: python build_tools/encrypt_env.py")
        sys.exit(1)

    if not os.path.exists(".env"):
        print("ERROR: File .env tidak ditemukan!")
        sys.exit(1)

    print("=" * 55)
    print("  NEXTFLOW PRO — ENV ENCRYPTION TOOL")
    print("=" * 55)

    # Generate key baru setiap kali dijalankan
    key    = Fernet.generate_key()
    fernet = Fernet(key)

    # Baca .env — skip komentar dan baris kosong
    env_lines = []
    with open(".env", "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                env_lines.append(line)

    if not env_lines:
        print("ERROR: .env kosong atau hanya berisi komentar!")
        sys.exit(1)

    print(f"\n[OK] Membaca {len(env_lines)} variabel dari .env:")
    for line in env_lines:
        key_name = line.split("=")[0].strip()
        print(f"       -> {key_name}")

    # Enkripsi
    env_string     = "\n".join(env_lines)
    encrypted_data = fernet.encrypt(env_string.encode("utf-8"))

    # Simpan secrets.enc ke folder core/
    os.makedirs("core", exist_ok=True)
    secrets_path = os.path.join("core", "secrets.enc")
    with open(secrets_path, "wb") as f:
        f.write(encrypted_data)
    print(f"\n[OK] core/secrets.enc berhasil dibuat")

    # Simpan build.key ke build_tools/ (backup key)
    os.makedirs("build_tools", exist_ok=True)
    key_path = os.path.join("build_tools", "build.key")
    with open(key_path, "wb") as f:
        f.write(key)
    print(f"[OK] build_tools/build.key berhasil dibuat")

    # Tampilkan instruksi langkah berikutnya
    print("\n" + "=" * 55)
    print("  SALIN KEY BERIKUT KE core/config_loader.py")
    print("  pada variabel _BUILD_KEY:")
    print("=" * 55)
    print(f"\n  _BUILD_KEY = {key}\n")
    print("=" * 55)
    print("  PERINGATAN KEAMANAN:")
    print("  [!] Jangan commit build.key ke Git")
    print("  [!] Jangan commit .env ke Git")
    print("  [!] Jangan share key ini via chat/email")
    print("=" * 55)


if __name__ == "__main__":
    main()
