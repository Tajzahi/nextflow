import logging
import os
import json
import threading
import time
from datetime import datetime, timedelta
from core.bot_kemenkes import BotKemenkes
from core.excel_manager import ExcelManager
import controller  # V1 controller — eksekusi bot yang sudah teruji

logger = logging.getLogger(__name__)

# =========================================================================
# COMPATIBILITY PROXIES (Agar Bridge bisa menyamar jadi UI App V1)
# =========================================================================

class NotifProxy:
    def __init__(self, bridge):
        self.bridge = bridge
    def show(self, msg, n_type="info"):
        self.bridge._bot_callback("notif", n_type, msg)

class ViewEksekusiProxy:
    def __init__(self, bridge):
        self.bridge = bridge
    def update_progress(self, percentage, status_text=""):
        self.bridge._bot_callback("status", percentage, status_text)
    def reset_after_execution(self):
        self.bridge._bot_callback("phase", 3, "Selesai")

class Bridge:
    def __init__(self, cloud_mgr, db_mgr, main_window=None):
        self.cloud_mgr = cloud_mgr
        self.db_mgr = db_mgr
        self._window   = main_window 
        self.user_data = {}
        self.bot = BotKemenkes()
        self.bot.set_callback(self._bot_callback)
        self.excel_mgr = None
        self.current_file = None
        self.current_date = None
        
        # --- COMPATIBILITY LAYER FOR V1 CONTROLLER ---
        self.notif_manager = NotifProxy(self)
        self.view_eksekusi = ViewEksekusiProxy(self)
        
        logger.info("Bridge: Initialized with Bot Engine & Compatibility Layer")

    def _bot_callback(self, n_type, value, msg):
        """Kirim update dari Bot/Bridge ke React via JS"""
        if self._window:
            # Normalisasi payload
            payload = {
                "type": n_type,
                "value": value,
                "msg": msg
            }
            script = f"if(window.onBotUpdate) window.onBotUpdate({json.dumps(n_type)}, {json.dumps(value)}, {json.dumps(msg)});"
            self._window.evaluate_js(script)

    def after(self, ms, func, *args):
        """Mock Tkinter.after for controller.py compatibility"""
        if ms == 0:
            func(*args)
        else:
            threading.Timer(ms/1000, func, args=args).start()

    def update_quota_display(self, user_data):
        """SOURCE: main_window.py → update_quota_display. Update UI status secara real-time."""
        self.user_data.update(user_data)
        self._bot_callback("refresh-stats", user_data, "Update Kuota")

    # =========================================================================
    # HEALTH CHECK
    # =========================================================================

    def ping(self):
        """Health check — App.tsx menggunakan ini untuk verifikasi API siap"""
        return "pong"

    # =========================================================================
    # AUTHENTICATION
    # =========================================================================

    def auth_login(self, token):
        """Called from LoginView.tsx"""
        logger.info(f"Bridge: Attempting login with token {token[:5]}...")
        try:
            # FIX: Nama method yang benar adalah validate_and_activate_token
            success, result = self.cloud_mgr.validate_and_activate_token(token)
            
            if success:
                if self.db_mgr:
                    self.db_mgr.simpan_token(token)
                
                user_data = self._build_user_data(token, result)
                self.user_data = user_data
                return {"success": True, "user_data": user_data}
            else:
                return {"success": False, "message": result.get("message", "Token tidak valid")}
        except Exception as e:
            logger.error(f"Bridge Login Error: {e}")
            return {"success": False, "message": f"Koneksi Gagal: {str(e)}"}

    def sync_data(self):
        """Syncs data on App load / refresh — mirrors V1 check_user_status pattern"""
        logger.info("Bridge: sync_data called...")
        try:
            token = self.db_mgr.ambil_token() if self.db_mgr else None
            if not token:
                return None

            result = self.cloud_mgr.activate_license(token)
            if result.get("success"):
                user_data = self._build_user_data(token, result)
                self.user_data = user_data
                
                # Sembelit Fix: Cek apakah ada data yang belum terlaporkan ke Cloud
                try:
                    self.background_sync()
                except:
                    pass

                return user_data
            else:
                logger.warning(f"sync_data: token invalid — {result.get('code', 'ERR')}")
                return None
        except Exception as e:
            logger.error(f"Bridge sync_data Error: {e}")
            return None

    def background_sync(self):
        """
        Sembelit Fix: Melaporkan data yang tertunda (is_synced=0) ke Cloud.
        Dipanggil saat startup setelah sukses sync_data.
        """
        logger.info("Bridge: Menjalankan background_sync (Sembelit Fix)...")
        try:
            token = self.db_mgr.ambil_token()
            if not token: return {"success": False, "message": "No token"}

            # 1. Ambil data mentah yang belum sinkron
            conn = self.db_mgr._get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT id, status FROM log_laporan WHERE is_synced = 0")
            pending_rows = cursor.fetchall()
            conn.close()

            if not pending_rows:
                logger.info("Bridge: Tidak ada data sembelit. Brankas bersih.")
                return {"success": True, "message": "No pending data"}

            # 2. Pisahkan mana yang potong kuota (HIJAU/KUNING/MERAH) vs GRATIS (BIRU)
            ids_to_sync_local = [r[0] for r in pending_rows]
            ids_for_quota = [r[0] for r in pending_rows if r[1] in ["SUKSES", "KUNING", "MERAH"]]
            total_increment = len(ids_for_quota)

            logger.info(f"Bridge: Ditemukan {len(pending_rows)} data nyangkut. {total_increment} memotong kuota.")

            # 3. Lapor ke Cloud jika ada yang potong kuota
            if total_increment > 0:
                res = self.cloud_mgr.increment_usage(token, increment_val=total_increment)
                if not res.get("success"):
                    logger.warning(f"Bridge: Gagal lapor sembelit ke cloud: {res.get('message')}")
                    return {"success": False, "message": res.get("message")}
                
                # Update user_data internal agar UI sinkron
                if self.user_data:
                    self.user_data["remaining"] = res.get("remaining", self.user_data.get("remaining", 0))
                    self.user_data["daily_count"] = res.get("daily_count", self.user_data.get("daily_count", 0))

            # 4. Tandai semua (termasuk yang BIRU) sebagai sudah tersinkron di lokal
            self.db_mgr.tandai_log_tersinkron(ids_to_sync_local)
            logger.info(f"Bridge: {len(pending_rows)} data sembelit berhasil 'dibuang' (disinkronkan).")
            return {"success": True, "count": len(pending_rows)}

        except Exception as e:
            logger.error(f"Bridge background_sync error: {e}")
            return {"success": False, "message": str(e)}

    def logout(self):
        """
        Hapus token dari lokal DB — SOURCE: main_window.py → _handle_logout → db_mgr.hapus_token()
        V2 sebelumnya tidak memanggil ini, menyebabkan auto-login tetap berjalan setelah logout.
        """
        try:
            if self.db_mgr:
                self.db_mgr.hapus_token()
            self.user_data = {}
            logger.info("Bridge: Token deleted, user logged out")
            return {"success": True}
        except Exception as e:
            logger.error(f"Bridge logout error: {e}")
            return {"success": False, "message": str(e)}

    def _build_user_data(self, token, result):
        """Helper: build user_data dict dari RPC result — dipakai auth_login & sync_data"""
        return {
            "token": token,
            "user_id": result.get("user_id"),
            "email": result.get("email", ""),
            "full_name": result.get("full_name", "User"),
            "avatar_url": result.get("avatar_url"),
            "subscription_tier": result.get("subscription_tier", "Free"),
            "subscription_start_date": result.get("subscription_start_date"),
            "subscription_end_date": result.get("subscription_end_date"),
            "daily_limit": result.get("daily_limit", 0),
            "daily_count": result.get("daily_count", 0),
            "weekly_success_count": result.get("weekly_success_count", 0),
            "monthly_success_count": result.get("monthly_success_count", 0),
            "remaining": result.get("remaining", 0),
            "can_execute": result.get("can_execute", True),
            "soft_lock": result.get("soft_lock", False),
            "hard_lock": result.get("hard_lock", False),
        }

    # =========================================================================
    # PRE-CHECK — SOURCE: main_window.py → _pre_check_and_execute
    # =========================================================================

    def pre_check(self):
        """
        Validasi status user sebelum mulai eksekusi.
        Mirrors V1 main_window.py._pre_check_and_execute() via check_user_status.
        Returns dict: {success, remaining, soft_lock, hard_lock, message}
        """
        try:
            token = self.user_data.get("token") or (self.db_mgr.ambil_token() if self.db_mgr else None)
            if not token:
                return {"success": False, "message": "Token tidak ditemukan. Silakan login ulang."}

            result = self.cloud_mgr.activate_license(token)
            if result.get("success"):
                # Update user_data internal
                self.user_data.update({
                    "daily_limit":  result.get("daily_limit", 0),
                    "daily_count":  result.get("daily_count", 0),
                    "remaining":    result.get("remaining", 0),
                    "can_execute":  result.get("can_execute", True),
                    "soft_lock":    result.get("soft_lock", False),
                    "hard_lock":    result.get("hard_lock", False),
                })
                return {
                    "success":    True,
                    "remaining":  result.get("remaining", 0),
                    "soft_lock":  result.get("soft_lock", False),
                    "hard_lock":  result.get("hard_lock", False),
                    "can_execute": result.get("can_execute", True),
                    "user_data":  self._build_user_data(token, result),
                    "message":    f"OK. Sisa kuota: {result.get('remaining', 0)}"
                }
            else:
                return {
                    "success": False,
                    "message": result.get("message", "Validasi gagal"),
                    "hard_lock": result.get("hard_lock", False),
                }
        except Exception as e:
            logger.error(f"Bridge pre_check error: {e}")
            return {"success": False, "message": f"Koneksi gagal: {str(e)}"}

    # =========================================================================
    # DATA FETCHING
    # =========================================================================

    def get_dashboard_stats(self):
        """Fetches real stats from SQLite for cards and charts"""
        try:
            rekap_df = self.db_mgr.ambil_rekap_semua_tanggal(limit=30)
            
            chart_data = []
            for _, row in rekap_df.iterrows():
                tanggal_str = str(row['tanggal'])
                # Format "11 Mei 2026" -> Ambil "11 Mei" (2 kata pertama)
                label_parts = tanggal_str.split(" ")
                label = " ".join(label_parts[:2]) if len(label_parts) >= 2 else tanggal_str
                
                chart_data.append({
                    "day": label,
                    "berhasil": int(row['sukses']),
                    "inkomplet": int(row['inkomplet']),
                    "error_data": int(row['gagal_data']),
                    "error_sistem": int(row['gagal_sistem'])
                })
            
            chart_data.reverse()  # Recharts butuh urutan lama→baru

            return {
                "success": True,
                "chart_data": chart_data,
                "total_berhasil": int(rekap_df['sukses'].sum()) if not rekap_df.empty else 0
            }
        except Exception as e:
            logger.error(f"Error fetching dashboard stats: {e}")
            return {"success": False, "message": str(e), "chart_data": [], "total_berhasil": 0}

    def get_reports(self, limit=50):
        """
        Fetches per-tanggal summary for LaporanView from local SQLite.
        SOURCE: view_laporan.py → muat_data_asli → db_mgr.ambil_rekap_semua_tanggal
        """
        try:
            if not self.db_mgr:
                return []
            df = self.db_mgr.ambil_rekap_semua_tanggal(limit=limit)
            if df is None or df.empty:
                return []
            result = []
            for _, row in df.iterrows():
                berhasil     = int(row.get('sukses', 0))
                inkomplet    = int(row.get('inkomplet', 0))
                gagal_data   = int(row.get('gagal_data', 0))
                gagal_sistem = int(row.get('gagal_sistem', 0))
                total        = int(row.get('total', berhasil + inkomplet + gagal_data + gagal_sistem))
                result.append({
                    'tanggal':      str(row.get('tanggal', '—')),
                    'berhasil':     berhasil,
                    'inkomplet':    inkomplet,
                    'gagal_data':   gagal_data,
                    'gagal_sistem': gagal_sistem,
                    'total':        total,
                })
            return result
        except Exception as e:
            logger.error(f"Bridge.get_reports error: {e}", exc_info=True)
            return []

    # =========================================================================
    # BACKGROUND SYNC — SOURCE: main_window.py → _jalankan_background_sync
    #                            controller.py  → sinkronisasi_latar_belakang
    # =========================================================================

    def background_sync(self):
        """
        Kirim log pending (is_synced=0) ke cloud Supabase.
        Dipanggil dari App.tsx setiap 5 menit via setInterval.
        """
        def _sync():
            try:
                token = self.user_data.get("token") or (self.db_mgr.ambil_token() if self.db_mgr else None)
                if not token or not self.db_mgr:
                    return

                pending_ids = self.db_mgr.ambil_log_pending_sync()
                if not pending_ids:
                    logger.debug("background_sync: tidak ada data pending")
                    return

                total_pending = len(pending_ids)
                logger.info(f"background_sync: mencoba sync {total_pending} data tertunda...")

                res = self.cloud_mgr.increment_usage(token, increment_val=total_pending)
                if res.get("success"):
                    self.db_mgr.tandai_log_tersinkron(pending_ids)
                    # Update user_data di bridge
                    if res.get("remaining") is not None:
                        self.user_data["remaining"] = res["remaining"]
                        self.user_data["daily_count"] = res.get("daily_count", self.user_data.get("daily_count", 0))
                    logger.info(f"background_sync: berhasil sync {total_pending} data")
                    # Notify React untuk refresh stats
                    self._bot_callback("refresh-stats", None, "")
                else:
                    logger.warning(f"background_sync tertunda: {res.get('message')}")
            except Exception as e:
                logger.debug(f"background_sync offline: {e}")

        threading.Thread(target=_sync, daemon=True).start()
        return {"success": True, "message": "Background sync started"}

    # =========================================================================
    # BOT CONTROL — Refactored to match controller.py V1 logic
    # =========================================================================

    def bot_start(self, file_path, date):
        """
        Tahap 1: Buka Browser & Login Manual.
        SOURCE: controller.py → buka_browser_saja
        """
        logger.info(f"Bridge: Starting bot phase 1 with file {file_path}")
        
        self.current_file = file_path
        self.current_date = date
        self.bot.is_stopped = False
        
        def _bg_start():
            try:
                self.bot.setup_browser()
                self.bot.login_fase(None)
            except Exception as e:
                logger.error(f"Error starting bot: {e}")
                self._bot_callback("error", 0, str(e))

        threading.Thread(target=_bg_start, daemon=True).start()
        return {"success": True, "message": "Inisialisasi browser..."}

    def bot_execute(self):
        """
        Tahap 2: Jalankan Automasi Excel.
        REFACTORED: Mengikuti pola controller.py V1 dengan:
        - Rem Otomatis (cek remaining setiap baris)
        - Format tanggal DB yang benar (digit → "DD Bulan YYYY")
        - Batch sync ke cloud setiap BATCH_SIZE baris (hemat API call)
        - Log dengan is_synced=0 terlebih dahulu
        - Tandai ERROR (gagal sistem) selain SUKSES/KUNING/MERAH
        - update_quota_display via _bot_callback setelah batch sync
        """
        logger.info("Bridge: Starting bot phase 2 (Execution)")
        
        if not self.current_file:
            return {"success": False, "message": "File belum dipilih"}

        def _bg_run():
            excel_mgr = None
            try:
                # 1. Format tanggal untuk DB — SOURCE: controller.py L77-86
                tanggal_db = self._format_tanggal(self.current_date)

                excel_mgr = ExcelManager(self.current_file)
                self.excel_mgr = excel_mgr
                df = excel_mgr.baca_data()
                total = len(df)

                self._bot_callback("status", 5, f"File dimuat: {total} baris data...")

                excel_mgr.buka_koneksi()

                # Batch config — SOURCE: controller.py L94
                BATCH_SIZE = 5
                batch_counter = 0
                batch_ids = []
                usage_to_increment = 0
                token = self.user_data.get("token")

                for index, row in df.iterrows():
                    # --- REM OTOMATIS — SOURCE: controller.py L100-105 ---
                    remaining = self.user_data.get("remaining", 0)
                    if remaining <= 0:
                        logger.warning("Kuota habis! Menghentikan bot otomatis (Rem Otomatis).")
                        self._bot_callback("error", 0, "Kuota harian habis! Eksekusi dihentikan otomatis.")
                        break

                    if self.bot.is_stopped:
                        logger.info("Eksekusi dihentikan oleh pengguna.")
                        break

                    # Lewati baris yang sudah diproses
                    if excel_mgr.cek_apakah_dilewati(index):
                        continue

                    # Progress update
                    progress_pct = 5 + int((index / max(total, 1)) * 90)
                    self._bot_callback("status", progress_pct, f"Baris {index+2}/{total+1}...")

                    # Eksekusi baris
                    status = self.bot.eksekusi_satu_pasien(row, self.current_date, index)
                    baris_asli_excel = index + 2

                    # --- Log ke DB lokal dulu (is_synced=0) — SOURCE: controller.py L124-138 ---
                    log_id = 0
                    try:
                        if status == "SUKSES":
                            excel_mgr.tandai_sukses(index)
                            log_id = self.db_mgr.tambah_log(tanggal_db, baris_asli_excel, "SUKSES", "Pasien berhasil diinput.", is_synced=0)
                        elif status == "KUNING":
                            excel_mgr.tandai_kuning(index)
                            log_id = self.db_mgr.tambah_log(tanggal_db, baris_asli_excel, "KUNING", "Pasien sudah terdaftar.", is_synced=0)
                        elif status == "MERAH":
                            excel_mgr.tandai_error(index)
                            log_id = self.db_mgr.tambah_log(tanggal_db, baris_asli_excel, "MERAH", "Gagal: Data Salah.", is_synced=0)
                        elif status == "ERROR":
                            excel_mgr.tandai_sistem_error(index)
                            log_id = self.db_mgr.tambah_log(tanggal_db, baris_asli_excel, "ERROR", "Kegagalan Sistem/Timeout.", is_synced=0)
                    except Exception as e:
                        logger.error(f"Gagal catat log ke DB: {e}")

                    if log_id:
                        batch_ids.append(log_id)

                    # --- Batch Cloud Sync — SOURCE: controller.py L144-162 ---
                    if status in ["SUKSES", "KUNING", "MERAH", "ERROR"]:
                        batch_counter += 1
                        # Hanya HIJAU, KUNING, MERAH yang memotong kuota
                        if status in ["SUKSES", "KUNING", "MERAH"]:
                            usage_to_increment += 1
                            
                        if batch_counter >= BATCH_SIZE:
                            if token and batch_ids:
                                try:
                                    if usage_to_increment > 0:
                                        res = self.cloud_mgr.increment_usage(token, increment_val=usage_to_increment)
                                        if res.get("success"):
                                            self.user_data["remaining"] = res.get("remaining", max(0, self.user_data.get("remaining", 0) - usage_to_increment))
                                            self.user_data["daily_count"] = res.get("daily_count", self.user_data.get("daily_count", 0))
                                            self.db_mgr.tandai_log_tersinkron(batch_ids)
                                            self._bot_callback("refresh-stats", None, "")
                                        else:
                                            logger.warning(f"Batch sync gagal: {res.get('message')}")
                                    else:
                                        # Hanya status BIRU, tandai tersinkron lokal saja (Gratis)
                                        self.db_mgr.tandai_log_tersinkron(batch_ids)
                                    
                                    # Selalu reset counter setelah batch selesai diproses (sukses atau skip)
                                    batch_ids = []
                                    usage_to_increment = 0
                                    batch_counter = 0
                                except Exception as e:
                                    logger.error(f"Koneksi Cloud gagal pada batch: {e}")
                            excel_mgr.simpan_perubahan()

                # --- Final Batch Sync — SOURCE: controller.py L164-174 ---
                if batch_ids and token:
                    if usage_to_increment > 0:
                        try:
                            res = self.cloud_mgr.increment_usage(token, increment_val=usage_to_increment)
                            if res.get("success"):
                                self.user_data["remaining"] = res.get("remaining", max(0, self.user_data.get("remaining", 0) - usage_to_increment))
                                self.user_data["daily_count"] = res.get("daily_count", self.user_data.get("daily_count", 0))
                                self.db_mgr.tandai_log_tersinkron(batch_ids)
                        except Exception as e:
                            logger.warning(f"Final sync gagal. Data tersimpan lokal (Pending Sync): {e}")
                    else:
                        # Tetap tandai tersinkron di lokal meskipun gratis
                        self.db_mgr.tandai_log_tersinkron(batch_ids)

                # Simpan & tutup
                excel_mgr.simpan_perubahan()
                excel_mgr.tutup_koneksi()
                self.excel_mgr = None

                # Sinyal selesai ke React
                self._bot_callback("refresh-stats", None, "")
                self._bot_callback("phase", 3, "Eksekusi Selesai!")

            except Exception as e:
                logger.error(f"Error in automation loop: {e}", exc_info=True)
                self._bot_callback("error", 0, f"Error: {str(e)}")
            finally:
                if excel_mgr:
                    try:
                        excel_mgr.simpan_perubahan()
                    except Exception:
                        pass
                    try:
                        excel_mgr.tutup_koneksi()
                    except Exception:
                        pass
                self.excel_mgr = None

        threading.Thread(target=_bg_run, daemon=True).start()
        return {"success": True}

    def bot_stop(self):
        """Stops the automation engine — SOURCE: controller.py → hentikan_bot"""
        logger.info("Bridge: Stopping bot")
        self.bot.is_stopped = True
        controller.hentikan_bot()  # Pastikan instance di controller juga berhenti
        if self.excel_mgr:
            try:
                self.excel_mgr.simpan_perubahan()
                self.excel_mgr.tutup_koneksi()
            except Exception as e:
                logger.error(f"Error closing excel on stop: {e}")
            self.excel_mgr = None
        return {"success": True}

    # =========================================================================
    # EXPORT LAPORAN — SOURCE: view_laporan.py → saat_tabel_diklik → db.export_laporan_excel()
    # =========================================================================

    def export_laporan(self, tanggal: str):
        """
        Export laporan tanggal tertentu ke file Excel di folder Downloads user.
        SOURCE: view_laporan.py L228-258 → db.export_laporan_excel(tanggal, folder)
        Returns: {success, file_path, message}
        """
        try:
            if not self.db_mgr:
                return {"success": False, "message": "Database tidak tersedia"}

            # Folder default: Downloads user
            downloads = os.path.join(os.path.expanduser("~"), "Downloads")
            os.makedirs(downloads, exist_ok=True)

            sukses, hasil = self.db_mgr.export_laporan_excel(tanggal, downloads)
            if sukses:
                logger.info(f"Export berhasil: {hasil}")
                return {
                    "success": True,
                    "file_path": hasil,
                    "message": f"Laporan disimpan: {os.path.basename(hasil)}"
                }
            else:
                return {"success": False, "message": hasil}
        except Exception as e:
            logger.error(f"Bridge.export_laporan error: {e}", exc_info=True)
            return {"success": False, "message": str(e)}

    def _format_tanggal(self, tanggal_target):
        """
        Format tanggal dari digit ke 'DD Bulan YYYY'.
        SOURCE: controller.py L77-86
        """
        try:
            if str(tanggal_target).isdigit():
                now = datetime.now()
                bulan_ind = ["", "Januari", "Februari", "Maret", "April", "Mei",
                             "Juni", "Juli", "Agustus", "September", "Oktober",
                             "November", "Desember"]
                return f"{tanggal_target} {bulan_ind[now.month]} {now.year}"
            return str(tanggal_target)
        except Exception as e:
            logger.error(f"Gagal format tanggal: {e}")
            return str(tanggal_target)

    # =========================================================================
    # FILE OPERATIONS
    # =========================================================================

    def open_file_dialog(self):
        """Opens native Windows file dialog — SOURCE: view_eksekusi.py → logika_pilih_file"""
        import webview
        try:
            logger.info("Bridge: Opening file dialog...")
            active_window = webview.active_window()
            if not active_window:
                return None

            file_types = ('Excel Files (*.xlsx;*.xls)', 'All files (*.*)')
            result = active_window.create_file_dialog(
                webview.FileDialog.OPEN, 
                allow_multiple=False, 
                file_types=file_types
            )
            
            if result and len(result) > 0:
                file_path = result[0]
                logger.info(f"Bridge: File selected: {file_path}")
                return file_path
            return None
        except Exception as e:
            logger.error(f"Error opening file dialog: {e}")
            return None

    def get_excel_info(self, file_path):
        """Validates and returns info about the selected Excel file"""
        try:
            import pandas as pd
            if not os.path.exists(file_path):
                return {"success": False, "message": "File tidak ditemukan."}
                
            df = pd.read_excel(file_path)
            row_count = len(df)
            return {
                "success": True,
                "file_name": os.path.basename(file_path),
                "row_count": row_count,
                "message": f"Ditemukan {row_count} baris data."
            }
        except Exception as e:
            logger.error(f"Error reading excel: {e}")
            return {"success": False, "message": f"Gagal membaca file: {str(e)}"}

    # =========================================================================
    # HANDLE REQUEST — Single entry point dari React (pywebview API)
    # =========================================================================

    def handle_request(self, method: str, *args):
        """
        Single entry point untuk semua panggilan dari React ke Python.

        React memanggil via:
            window.pywebview.api.handle_request("auth_login", "TOKEN-123")
            window.pywebview.api.handle_request("sync_data")
            window.pywebview.api.handle_request("bot_start", "/path/file.xlsx", "15")

        Bridge meneruskan ke method yang sesuai berdasarkan whitelist.
        Return value selalu berupa JSON string agar aman dikonsumsi React.
        """

        ALLOWED_METHODS = {
            "ping",
            "auth_login",
            "sync_data",
            "logout",
            "pre_check",
            "get_dashboard_stats",
            "get_reports",
            "background_sync",
            "bot_start",
            "bot_execute",
            "bot_stop",
            "export_laporan",
            "open_file_dialog",
            "get_excel_info",
        }

        if method not in ALLOWED_METHODS:
            logger.warning(f"handle_request: method tidak diizinkan — '{method}'")
            return json.dumps({
                "success": False,
                "message": f"Method '{method}' tidak diizinkan."
            })

        try:
            handler = getattr(self, method)
            result  = handler(*args)
            return result

        except TypeError as e:
            logger.error(f"handle_request TypeError [{method}]: {e}")
            return json.dumps({
                "success": False,
                "message": f"Parameter tidak sesuai untuk '{method}': {str(e)}"
            })
        except Exception as e:
            logger.error(f"handle_request Error [{method}]: {e}", exc_info=True)
            return json.dumps({
                "success": False,
                "message": f"Server error pada '{method}': {str(e)}"
            })


# =============================================================================
# FACTORY FUNCTION — Dipanggil oleh main.py
# =============================================================================

def create_bridge(window, base_dir: str) -> Bridge:
    """
    Factory function yang digunakan oleh main.py untuk membuat
    instance Bridge beserta seluruh dependency-nya.

    Urutan inisialisasi:
        1. SupabaseManager  (koneksi cloud)
        2. DatabaseManager  (koneksi SQLite lokal)
        3. Bridge           (logic layer)

    Jika salah satu dependency gagal, aplikasi tetap berjalan
    dalam mode degraded (bukan crash total) dengan log error.

    Dipanggil di main.py:
        bridge = create_bridge(window, BASE_DIR)
        window.expose(bridge.handle_request)
    """

    _logger = logging.getLogger(__name__)
    _logger.info(f"create_bridge: base_dir = {base_dir}")

    # -- 1. Inisialisasi Cloud Manager ----------------------------------------
    cloud_mgr = None
    try:
        from core.supabase_manager import SupabaseManager
        cloud_mgr = SupabaseManager()
        _logger.info("create_bridge: SupabaseManager OK")
    except Exception as e:
        _logger.error(f"create_bridge: SupabaseManager GAGAL — {e}")

    # -- 2. Inisialisasi Database Manager -------------------------------------
    db_mgr = None
    try:
        from core.database_manager import DatabaseManager
        db_mgr = DatabaseManager()
        _logger.info("create_bridge: DatabaseManager OK")
    except Exception as e:
        _logger.error(f"create_bridge: DatabaseManager GAGAL — {e}")

    # -- 3. Buat Bridge -------------------------------------------------------
    bridge = Bridge(
        cloud_mgr   = cloud_mgr,
        db_mgr      = db_mgr,
        main_window = window,
    )

    _logger.info("create_bridge: Bridge instance siap digunakan.")
    return bridge
