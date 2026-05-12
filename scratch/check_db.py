import sqlite3
import os

db_path = os.path.join(os.getenv('APPDATA'), 'NextFlowPro', 'laporan.db')

if not os.path.exists(db_path):
    print(f"Database tidak ditemukan di {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Ambil daftar tabel
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    print("--- DETAIL LOG TANGGAL 12 MEI 2026 ---")
    try:
        cursor.execute("""
            SELECT id, baris, status, is_synced, waktu_eksekusi 
            FROM log_laporan 
            WHERE tanggal = '12 Mei 2026' 
            ORDER BY baris ASC
        """)
        rows = cursor.fetchall()
        for r in rows:
            print(f"ID: {r[0]} | Baris: {r[1]} | Status: {r[2]} | Synced: {r[3]} | Waktu: {r[4]}")
    except Exception as e:
        print(f"Error: {e}")
            
    print("\n--- RINGKASAN HARIAN ---")
    try:
        cursor.execute("SELECT tanggal, status, COUNT(*) FROM log_laporan GROUP BY tanggal, status ORDER BY tanggal DESC")
        summary = cursor.fetchall()
        for s in summary:
            print(s)
    except Exception as e:
        print(f"Gagal rekap: {e}")
        
    conn.close()
