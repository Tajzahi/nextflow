import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Global state yang ringan
bot_instance = None
is_busy = False # Lock untuk mencegah dobel eksekusi

def get_bot():
    """Lazy initialization untuk BotKemenkes agar startup UI instan"""
    global bot_instance
    if bot_instance is None:
        from core.bot_kemenkes import BotKemenkes
        bot_instance = BotKemenkes()
    return bot_instance

def buka_browser_saja(ui_app=None):
    """Buka browser tanpa eksekusi otomatis."""
    global is_busy
    if is_busy:
        logger.warning("Sistem sedang sibuk, abaikan request buka browser.")
        return

    try:
        is_busy = True
        bot = get_bot()
        bot.is_stopped = False
        logger.info("Membuka browser untuk navigasi manual...")
        
        if ui_app and hasattr(ui_app, "notif_manager"):
            ui_app.notif_manager.show("Membuka browser... Silakan login manual.", "info")
        
        bot.setup_browser()
        bot.login_fase(ui_app) 
        logger.info("Browser berhasil dibuka dan diarahkan ke halaman login.")
    except Exception as e:
        logger.error(f"Gagal membuka browser: {e}", exc_info=True)
        is_busy = False # Reset jika gagal buka

def mulai_eksekusi_excel(jalur_file: str, ui_app, tanggal_target: str, token: Optional[str] = None):
    """Eksekusi bot dengan progress tracking dan cloud sync."""
    global is_busy
    
    # IZINKAN eksekusi jika bot_instance sudah ada (artinya ini transisi dari login manual)
    # BLOKIR jika bot_instance sedang dalam loop eksekusi (is_busy = True tanpa bot_instance?)
    # Sebenarnya is_busy harus True selama proses. Kita hanya perlu memastikan tidak ada 2 loop eksekusi.
    
    bot = get_bot()

    # Blokir HANYA jika bot benar-benar sedang dalam loop eksekusi
    if is_busy and getattr(bot, "is_running", False):
        logger.warning("Bot sedang melakukan loop eksekusi! Mengabaikan perintah ganda.")
        return
        
    is_busy = True
    bot.is_running = True # Tandai mulai loop
    
    from core.excel_manager import ExcelManager
    from core.database_manager import DatabaseManager
    
    bot.is_stopped = False
    excel_mgr = None

    try:
        # ✅ FIX: Gunakan cloud_mgr dari ui_app (Dependency Injection)
        if not hasattr(ui_app, 'cloud_mgr') or ui_app.cloud_mgr is None:
            logger.error("ui_app.cloud_mgr tidak tersedia!")
            return
        
        cloud_mgr = ui_app.cloud_mgr
        db_mgr = DatabaseManager()
        excel_mgr = ExcelManager(jalur_file)
        
        # Format tanggal target untuk DB
        try:
            if str(tanggal_target).isdigit():
                now = datetime.now()
                bulan_ind = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
                tanggal_db = f"{tanggal_target} {bulan_ind[now.month]} {now.year}"
            else:
                tanggal_db = str(tanggal_target)
        except Exception as e:
            logger.error(f"Gagal memformat tanggal target: {e}")
            tanggal_db = str(tanggal_target)

        df = excel_mgr.baca_data()
        total_data = len(df)
        logger.info(f"Memulai eksekusi {total_data} data dari {jalur_file}")

        excel_mgr.buka_koneksi()
        
        BATCH_SIZE = 5
        batch_counter = 0
        sukses_count = 0
        batch_ids = []

        for index, row in df.iterrows():
            # --- POIN 1: REM OTOMATIS (Cek Kuota Setiap Baris) ---
            main_app = ui_app
            remaining = main_app.user_data.get("remaining", 0)
            if remaining <= 0:
                logger.warning("Kuota habis di tengah jalan! Menghentikan bot otomatis.")
                break

            if bot.is_stopped:
                logger.info("Eksekusi dihentikan oleh pengguna.")
                break

            if excel_mgr.cek_apakah_dilewati(index):
                continue

            # Update UI progress
            if hasattr(ui_app, "view_eksekusi"):
                progress = (index / total_data) * 100
                ui_app.view_eksekusi.update_progress(progress, f"Baris {index+2}/{total_data+1}")

            # Eksekusi baris
            status = bot.eksekusi_satu_pasien(row, tanggal_target, index)
            baris_asli_excel = index + 2

            # Logging & DB Status (Fokus: Simpan lokal dulu dengan is_synced=0)
            log_id = 0
            if status == "SUKSES":
                excel_mgr.tandai_sukses(index)
                log_id = db_mgr.tambah_log(tanggal_db, baris_asli_excel, "SUKSES", "Pasien berhasil diinput.", is_synced=0)
                sukses_count += 1
            elif status == "KUNING":
                excel_mgr.tandai_kuning(index)
                log_id = db_mgr.tambah_log(tanggal_db, baris_asli_excel, "KUNING", "Pasien sudah terdaftar.", is_synced=0)
                sukses_count += 1
            elif status == "MERAH":
                excel_mgr.tandai_error(index)
                log_id = db_mgr.tambah_log(tanggal_db, baris_asli_excel, "MERAH", "Gagal: Data Salah.", is_synced=0)
            elif status == "ERROR":
                excel_mgr.tandai_sistem_error(index)
                log_id = db_mgr.tambah_log(tanggal_db, baris_asli_excel, "ERROR", "Kegagalan Sistem/Timeout.", is_synced=0)

            if log_id:
                batch_ids.append(log_id)

            # Batching Cloud Update
            if status in ["SUKSES", "KUNING", "MERAH", "ERROR"]:
                batch_counter += 1
                if batch_counter >= BATCH_SIZE:
                    if token:
                        try:
                            # Gunakan len(batch_ids) agar jumlah yang dikirim akurat 
                            # meskipun ada kegagalan sinkronisasi sebelumnya.
                            res = cloud_mgr.increment_usage(token, increment_val=len(batch_ids))
                            if res.get("success"):
                                ui_app.after(0, ui_app.update_quota_display, res)
                                db_mgr.tandai_log_tersinkron(batch_ids)
                                batch_ids = [] # Kosongkan antrean
                                batch_counter = 0 # Reset counter sukses
                            else:
                                logger.warning(f"Batch sync gagal: {res.get('message')}")
                        except Exception as e:
                            logger.error(f"Koneksi Cloud gagal: {e}")
                    
                    excel_mgr.simpan_perubahan()

        # Final Batch Sync
        if batch_ids and token:
            try:
                res = cloud_mgr.increment_usage(token, increment_val=len(batch_ids))
                if res.get("success"):
                    ui_app.after(0, ui_app.update_quota_display, res)
                    db_mgr.tandai_log_tersinkron(batch_ids)
                    batch_ids = [] # Kosongkan sisa
                excel_mgr.simpan_perubahan()
            except Exception as e:
                logger.warning(f"Final sync gagal: {e}. Data tersimpan di lokal (Pending Sync).")

    except Exception as e:
        logger.error(f"Error fatal eksekusi: {e}", exc_info=True)
    finally:
        is_busy = False
        bot = get_bot()
        bot.is_running = False
        
        if excel_mgr:
            # SINKRONISASI AKHIR: Pastikan semua warna di memori tertulis ke file
            # sebelum koneksi ditutup.
            try:
                excel_mgr.simpan_perubahan()
            except Exception as e:
                logger.error(f"Gagal simpan perubahan terakhir: {e}")
                
            excel_mgr.tutup_koneksi()
        
        if hasattr(ui_app, "view_eksekusi"):
            ui_app.after(0, ui_app.view_eksekusi.reset_after_execution)
        
        logger.info("Sesi eksekusi berakhir.")

def hentikan_bot():
    bot = get_bot()
    bot.is_stopped = True
    logger.info("Sinyal berhenti dikirim ke bot.")

def sinkronisasi_latar_belakang(ui_app, token: str):
    """Mencoba mengirim log yang tertunda ke cloud (Background Sync)."""
    global is_busy
    if not token:
        return
    
    from core.database_manager import DatabaseManager
    db_mgr = DatabaseManager()
    pending_ids = db_mgr.ambil_log_pending_sync()
    
    if not pending_ids:
        return
        
    total_pending = len(pending_ids)
    logger.info(f"Mencoba sinkronisasi {total_pending} data tertunda...")
    
    if not hasattr(ui_app, 'cloud_mgr') or ui_app.cloud_mgr is None:
        return

    try:
        # Kirim borongan ke cloud
        res = ui_app.cloud_mgr.increment_usage(token, increment_val=total_pending)
        if res.get("success"):
            db_mgr.tandai_log_tersinkron(pending_ids)
            ui_app.after(0, ui_app.update_quota_display, res)
            logger.info(f"Sinkronisasi susulan berhasil: {total_pending} data.")
        else:
            logger.warning(f"Sinkronisasi susulan tertunda: {res.get('message')}")
    except Exception as e:
        logger.debug(f"Background sync masih offline: {e}")

