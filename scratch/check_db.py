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
    print(f"Tabel ditemukan: {tables}")
    
    if ('log_laporan',) in tables:
        print("\n--- 5 LOG TERAKHIR (log_laporan) ---")
        try:
            # Cek kolom is_synced ada atau tidak
            cursor.execute("PRAGMA table_info(log_laporan)")
            columns = [c[1] for c in cursor.fetchall()]
            print(f"Kolom: {columns}")
            
            select_cols = "id, tanggal, baris, status, keterangan"
            if 'is_synced' in columns:
                select_cols += ", is_synced"
            
            cursor.execute(f"SELECT {select_cols} FROM log_laporan ORDER BY id DESC LIMIT 5")
            rows = cursor.fetchall()
            for r in rows:
                print(r)
        except Exception as e:
            print(f"Gagal baca log_laporan: {e}")
            
    print("\n--- RINGKASAN HARIAN ---")
    try:
        cursor.execute("SELECT tanggal, status, COUNT(*) FROM log_laporan GROUP BY tanggal, status ORDER BY tanggal DESC")
        summary = cursor.fetchall()
        for s in summary:
            print(s)
    except Exception as e:
        print(f"Gagal rekap: {e}")
        
    conn.close()
