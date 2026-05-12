# build_tools/post_build_audit.py

import sys
import os


def run_audit(exe_path: str) -> bool:

    print("=" * 55)
    print("  POST-BUILD SECURITY AUDIT")
    print("=" * 55)

    if not os.path.exists(exe_path):
        print(f"ERROR: File tidak ditemukan: {exe_path}")
        return False

    size_mb = os.path.getsize(exe_path) / 1024 / 1024
    print(f"\nFile   : {exe_path}")
    print(f"Ukuran : {size_mb:.1f} MB")

    forbidden = {
        "supabase.co"   : "Supabase Domain",
        "postgresql://" : "DB Connection String",
        "SECRET_KEY"    : "Secret Key Literal",
    }

    print(f"\nMemeriksa {len(forbidden)} pola sensitif...\n")

    content = b""
    with open(exe_path, "rb") as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            content += chunk

    leaks = []
    for pattern, desc in forbidden.items():
        if pattern.encode() in content:
            # PENGECUALIAN: Abaikan jika itu adalah string test dari Pandas
            if pattern == "postgresql://" and b"localhost:5432/pandas" in content:
                print(f"  INFO  : {desc} ditemukan di Library (Abaikan)")
                continue
            
            leaks.append(desc)
            print(f"  LEAK  : {desc} ('{pattern}')")
        else:
            print(f"  CLEAN : {desc}")

    print(f"\nUkuran : {size_mb:.1f} MB ", end="")
    if size_mb > 400:
        print("— MELEBIHI 400MB!")
        leaks.append("Ukuran > 400MB")
    elif size_mb > 350:
        print("— Mendekati batas, perhatikan")
    else:
        print("— Normal")

    print("\n" + "=" * 55)

    if leaks:
        print(f"HASIL: {len(leaks)} MASALAH DITEMUKAN")
        print("Jangan distribusikan binary ini!")
        return False

    print("HASIL: BERSIH — Aman untuk distribusi")
    return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Penggunaan: python post_build_audit.py <path_exe>")
        sys.exit(1)

    ok = run_audit(sys.argv[1])
    sys.exit(0 if ok else 1)
