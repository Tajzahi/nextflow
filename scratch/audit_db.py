import sqlite3
import os
from pathlib import Path

def audit_db():
    db_path = os.path.join(os.getenv('APPDATA'), 'NextFlowPro', 'laporan.db')
    if not os.path.exists(db_path):
        print(f"File database tidak ditemukan di: {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("\n" + "="*50)
    print("      AUDIT BRANKAS LOKAL NEXTFLOW PRO")
    print("="*50)
    
    # List tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [t[0] for t in cursor.fetchall()]
    
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"\n[TABEL: {table.upper()}] - {count} Baris")
        
        # Show contents based on table
        if table == 'pengaturan':
            cursor.execute("SELECT kunci, nilai FROM pengaturan")
            for row in cursor.fetchall():
                # Mask sensitive looking values if needed, but here we show all
                print(f"  > {row[0]}: {row[1]}")
        
        elif table == 'log_laporan':
            if count > 0:
                cursor.execute("SELECT tanggal, baris, status, keterangan FROM log_laporan ORDER BY id DESC LIMIT 5")
                for row in cursor.fetchall():
                    print(f"  > [{row[0]}] Baris {row[1]}: {row[2]} ({row[3]})")
            else:
                print("  (Belum ada riwayat pengerjaan)")
                
    print("\n" + "="*50)
    conn.close()

if __name__ == "__main__":
    audit_db()
