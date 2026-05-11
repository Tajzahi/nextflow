from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import StaleElementReferenceException
import time
import logging
from core.config import WebConfig

logger = logging.getLogger(__name__)


class BotKemenkes:
    def __init__(self):
        self.driver = None
        self.is_stopped = False
        self.is_running = False
        self.callback = None # Untuk kirim status ke React

    def set_callback(self, cb_func):
        """cb_func(type, value, message)"""
        self.callback = cb_func

    def _notify(self, n_type, value, msg=""):
        if self.callback:
            self.callback(n_type, value, msg)

    def setup_browser(self):
        # --- POIN 2: CEK & TUTUP BROWSER LAMA (Cegah Orphan) ---
        if self.driver:
            try:
                logger.info("Menutup browser lama sebelum membuka yang baru...")
                self.driver.quit()
            except Exception as e:
                logger.debug(f"Gagal menutup browser lama (mungkin sudah tertutup): {e}")
                pass
            finally:
                self.driver = None

        options = webdriver.ChromeOptions()
        options.add_argument(f"user-agent={WebConfig.USER_AGENT}")
        # options.add_argument("--headless=new") # Sembunyikan untuk audit
        self.driver = webdriver.Chrome(options=options)
        self.driver.maximize_window()

    def login_fase(self, ui_app, username="", pw=""):
        self.driver.get(WebConfig.URL_LOGIN)
        wait = WebDriverWait(self.driver, 30)

        try:
            wait.until(EC.presence_of_element_located((By.ID, "email"))).send_keys(
                username
            )
            self.driver.find_element(By.ID, "password").send_keys(pw)
        except Exception:
            pass

        logger.info("Menunggu user login, mengisi CAPTCHA, dan klik Setuju S&K...")
        self._notify("status", 15, "Silakan login di browser Chrome...")
        try:
            wait_lama = WebDriverWait(self.driver, 300)
            menu_element = wait_lama.until(
                EC.presence_of_element_located((By.XPATH, WebConfig.XPATH_MENU_PKG))
            )

            while True:
                if self.is_stopped:
                    break
                terhalang = self.driver.execute_script(
                    """
                    var elem = arguments[0]; var rect = elem.getBoundingClientRect();
                    var topElement = document.elementFromPoint(rect.left + (rect.width/2), rect.top + (rect.height/2));
                    return topElement !== null && !elem.contains(topElement);
                """,
                    menu_element,
                )

                if not terhalang:
                    break
                time.sleep(1)

            if not self.is_stopped:
                time.sleep(1)
                logger.info("Login & S&K terdeteksi! Bot lanjut otomatis...")
                self._notify("phase", 1, "Login Berhasil! Memulai eksekusi otomatis...")
        except Exception as e:
            if self.is_stopped:
                logger.info("Proses login dibatalkan oleh pengguna.")
            else:
                # Cek apakah ini karena browser ditutup manual
                try:
                    _ = self.driver.window_handles
                    logger.error(f"Gagal mendeteksi login (Waktu habis): {e}")
                except Exception:
                    logger.info("Proses login terhenti: Browser Chrome ditutup.")
            
            self._notify("error", 0, "Gagal mendeteksi login.")

    def eksekusi_satu_pasien(self, row, tanggal_target, index):
        # --- POIN 4: CEK APAKAH BROWSER MASIH HIDUP ---
        if self.is_stopped:
            return "STOPPED"
            
        if self.driver is None:
            return "ERROR"

        try:
            # Pengecekan aktif untuk mendeteksi jendela ditutup manual
            _ = self.driver.window_handles
        except Exception:
            print(">>> Deteksi: Jendela Browser ditutup oleh user!")
            self.is_stopped = True
            return "ERROR"
            
        wait = WebDriverWait(self.driver, 10)

        try:
            # --- LOGIKA LOGIN & POP-UP (SESUAI controller.PY) ---
            try:
                login_btn = WebDriverWait(self.driver, 5).until(
                    EC.element_to_be_clickable((By.XPATH, "//button[@type='submit']"))
                )
                login_btn.click()
                time.sleep(3)
            except Exception:
                pass

            # MASALAH 1: Pop-up setelah login yang hilang
            try:
                Enter_pop_up = WebDriverWait(self.driver, 15).until(
                    EC.element_to_be_clickable(
                        (
                            By.XPATH,
                            "/html/body/div[1]/div[2]/div/div/div/div[2]/div[86]/div/button",
                        )
                    )
                )
                Enter_pop_up.click()
            except Exception:
                pass

            # --- NAVIGASI MENU ---
            menu_cari_list = self.driver.find_elements(
                By.ID, "menu_cari/daftarkan_individu"
            )
            if not menu_cari_list or not menu_cari_list[0].is_displayed():
                print(">>> Menu Cari tidak terlihat, klik Menu PKG (SVG) dulu...")
                try:
                    btn_pkg = wait.until(
                        EC.element_to_be_clickable((By.XPATH, WebConfig.XPATH_MENU_PKG))
                    )
                    self.driver.execute_script("arguments[0].click();", btn_pkg)
                    time.sleep(2)
                except Exception:
                    pass

            wait.until(
                EC.element_to_be_clickable((By.ID, "menu_cari/daftarkan_individu"))
            ).click()
            time.sleep(2)

            # Klik tombol Tambah (+)
            WebDriverWait(self.driver, 60).until(
                EC.element_to_be_clickable(
                    (
                        By.XPATH,
                        "//button[.//img[contains(@src,'/images/icons/icon-plus-white.svg')]]",
                    )
                )
            ).click()

            # Isi Data Dasar
            WebDriverWait(self.driver, 20).until(
                EC.presence_of_element_located((By.NAME, "NIK"))
            ).send_keys(str(row["NIK"]))
            WebDriverWait(self.driver, 20).until(
                EC.presence_of_element_located((By.NAME, "Nama"))
            ).send_keys(str(row["Nama"]))

            # --- LOGIKA TANGGAL LAHIR ---
            date_input = self.driver.find_element(By.ID, "Tanggal Lahir")
            self.driver.execute_script(
                "arguments[0].scrollIntoView({block:'center'});", date_input
            )
            time.sleep(3)
            date_input.click()
            time.sleep(1)

            tgl = row["Tanggal_Lahir"]
            _, bulan, tahun = tgl.day, tgl.month - 1, int(tgl.year)

            WebDriverWait(self.driver, 20).until(
                EC.element_to_be_clickable((By.CLASS_NAME, "mx-btn-current-year"))
            ).click()
            time.sleep(1)

            while True:
                if self.is_stopped:
                    return "STOPPED"
                try:
                    years = self.driver.find_elements(By.XPATH, "//td[@data-year]")
                    found = False
                    for y in years:
                        if int(y.get_attribute("data-year")) == tahun:
                            y.click()
                            found = True
                            break
                    if found:
                        break
                    else:
                        self.driver.find_element(
                            By.CLASS_NAME, "mx-icon-double-left"
                        ).click()
                        time.sleep(1)
                except StaleElementReferenceException:
                    time.sleep(0.5)
                    continue

            self.driver.find_element(By.XPATH, f"//td[@data-month='{bulan}']").click()
            time.sleep(1)
            self.driver.find_element(
                By.XPATH, f"//td[@class='cell' and @title='{tgl.strftime('%Y-%m-%d')}']"
            ).click()
            self.driver.find_element(By.TAG_NAME, "body").click()
            time.sleep(1)

            # --- JENIS KELAMIN ---
            trigger_jk = self.driver.find_element(
                By.XPATH,
                '//*[@id="__nuxt"]/main/div/div[1]/section[2]/div/div/div/div[2]/div/div[3]/div[5]/div[2]/div/div/div[6]/div/form/div[1]/div[1]/div[5]/div/div[2]/div[1]',
            )
            self.driver.execute_script(
                "arguments[0].scrollIntoView({block:'center'}); arguments[0].click();",
                trigger_jk,
            )
            time.sleep(1)
            option_jk = self.driver.find_element(
                By.XPATH, f"//div[contains(text(), '{str(row['JK']).strip()}')]"
            )
            self.driver.execute_script("arguments[0].click();", option_jk)
            self.driver.find_element(By.TAG_NAME, "body").click()

            self.driver.find_element(By.ID, "No Whatsapp").send_keys(str(row["No. WA"]))

            # --- TANGGAL DINAMIS DARI UI ---
            xpath_kalender = '//*[@id="__nuxt"]/main/div/div[1]/section[2]/div/div/div/div[2]/div/div[3]/div[5]/div[2]/div/div/div[6]/div/form/div[1]/div[2]'
            xpath_tombol_tanggal = f"{xpath_kalender}//button[normalize-space()='{tanggal_target}' or .//span[text()='{tanggal_target}']]"
            
            tombol_tgl = WebDriverWait(self.driver, 20).until(
                EC.element_to_be_clickable((By.XPATH, xpath_tombol_tanggal))
            )
            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", tombol_tgl)
            time.sleep(1)
            try:
                tombol_tgl.click()
            except Exception:
                self.driver.execute_script("arguments[0].click();", tombol_tgl)

            # Data Wali
            if len(self.driver.find_elements(By.XPATH, "//input[@id='noWali']")) > 0:
                cb = self.driver.find_element(By.XPATH, "//input[@id='noWali']")
                self.driver.execute_script(
                    "arguments[0].scrollIntoView({block: 'center'});", cb
                )
                time.sleep(1)
                ActionChains(self.driver).move_to_element(cb).click().perform()
                time.sleep(2)

            if (
                len(
                    self.driver.find_elements(
                        By.XPATH, "//button[normalize-space()='Ok ']"
                    )
                )
                > 0
            ):
                self.driver.find_element(
                    By.XPATH, "//button[normalize-space()='Ok ']"
                ).click()

            # Tombol Selanjutnya
            tombol = WebDriverWait(self.driver, 20).until(
                EC.presence_of_element_located(
                    (By.XPATH, "//div[contains(text(),'Selanjutnya')]")
                )
            )
            self.driver.execute_script(
                "arguments[0].scrollIntoView({block:'center'});", tombol
            )
            tombol.click()
            time.sleep(5)

            # Pop-up Kuota
            if (
                len(
                    self.driver.find_elements(
                        By.XPATH, "//*[contains(text(),'Kuota Pemeriksaan Habis')]"
                    )
                )
                > 0
            ):
                self.driver.find_element(
                    By.XPATH, "//*[contains(text(),'Lanjut ')]"
                ).click()
                time.sleep(2)

            # Cek Sudah Terdaftar (Kuning)
            sudah_terdaftar = self.driver.find_elements(
                By.XPATH, "//button[.//div[normalize-space()='Kembali']]"
            )
            if len(sudah_terdaftar) > 0:
                self.driver.execute_script("arguments[0].click();", sudah_terdaftar[0])
                time.sleep(2)
                modal = self.driver.find_element(
                    By.XPATH,
                    "//div[contains(@class, 'overflow-auto') and .//div[contains(text(), 'Formulir Pendaftaran')]]",
                )
                self.driver.execute_script("arguments[0].scrollTop = 0;", modal)
                time.sleep(2)
                self.driver.execute_script(
                    "arguments[0].click();",
                    modal.find_element(By.CLASS_NAME, "btn-transparent"),
                )
                return "KUNING"

            # Cek Salah Dukcapil (Merah)
            salah_dukcapil = self.driver.find_elements(
                By.XPATH, "//*[contains(text(),'Periksa Kembali ')]"
            )
            if len(salah_dukcapil) > 0:
                try:
                    self.driver.execute_script(
                        "arguments[0].click();", salah_dukcapil[0]
                    )
                    modal = self.driver.find_element(
                        By.XPATH,
                        "//div[contains(@class, 'overflow-auto') and .//div[contains(text(), 'Formulir Pendaftaran')]]",
                    )
                    self.driver.execute_script("arguments[0].scrollTop = 0;", modal)
                    time.sleep(2)
                    self.driver.execute_script(
                        "arguments[0].click();",
                        modal.find_element(By.CLASS_NAME, "btn-transparent"),
                    )
                    return "MERAH"

                except Exception as b:
                    print(f"Error occurred while handling salah_dukcapil: {b}")
                    ActionChains(self.driver).move_to_element(
                        salah_dukcapil[0]
                    ).click().perform()
                    time.sleep(2)
                    modal = self.driver.find_element(
                        By.XPATH,
                        "//div[contains(@class, 'overflow-auto') and .//div[contains(text(), 'Formulir Pendaftaran')]]",
                    )
                    self.driver.execute_script("arguments[0].scrollTop = 0;", modal)
                    time.sleep(2)
                    self.driver.execute_script(
                        "arguments[0].click();",
                        modal.find_element(By.CLASS_NAME, "btn-transparent"),
                    )
                return "MERAH"

            # Tombol Lanjutkan
            try:
                # Ambil elemennya, kalau dalam 20 detik nggak ada dia bakal loncat ke 'except'
                btn = WebDriverWait(self.driver, 20).until(
                    EC.element_to_be_clickable(
                        (
                            By.XPATH,
                            "//button[contains(@class, 'btn-fill-primary')]//div[contains(text(), 'Lanjutkan')]",
                        )
                    )
                )

                # Tambahkan IF untuk memastikan elemen beneran ada dan terlihat di layar
                if btn.is_displayed():
                    ActionChains(self.driver).move_to_element(btn).click(btn).perform()
                    print(">>> Berhasil klik Lanjutkan (Kondisi Terpenuhi)")
                else:
                    print(">>> Tombol ada tapi tersembunyi, coba klik paksa...")
                    self.driver.execute_script("arguments[0].click();", btn)

            except Exception as h:
                # Ini dijalankan kalau tombol beneran nggak muncul sama sekali
                print(f">>> coba lagi : {h}")

            time.sleep(2)

            if self.is_stopped:
                return "STOPPED"

            pernikahan = WebDriverWait(self.driver, 20).until(
                EC.element_to_be_clickable(
                    (By.XPATH, "//div[span[contains(., 'Pilih status pernikahan')]]")
                )
            )
            pernikahan.click()
            time.sleep(1)
            ele_pnkh = wait.until(
                EC.element_to_be_clickable(
                    (
                        By.XPATH,
                        f"//div[contains(text(),'{row['Status Pernikahan']}')]",
                    )
                )
            )
            ActionChains(self.driver).move_to_element(ele_pnkh).click(ele_pnkh).perform()
            time.sleep(1)

            # --- DOMISILI & PEKERJAAN ---
            pkr_btn = WebDriverWait(self.driver, 20).until(
                EC.element_to_be_clickable(
                    (By.XPATH, "//div[contains(text(),'Pilih pekerjaan')]")
                )
            )
            pkr_btn.click()
            time.sleep(1)
            ele_pkr = wait.until(
                EC.element_to_be_clickable(
                    (
                        By.XPATH,
                        f"//button[.//div[contains(text(),'{row['Pekerjaan']}')]]",
                    )
                )
            )
            self.driver.execute_script("arguments[0].scrollIntoView();", ele_pkr)
            ele_pkr.click()
            time.sleep(1)

            self.driver.find_element(
                By.XPATH, "//div[normalize-space()='Pilih alamat domisili']"
            ).click()
            time.sleep(2)
            try:
                # Urutan Lokasi (Tetap menggunakan time.sleep manual agar aman seperti controller.py)
                for target_lokasi in [
                    str(row["Provinsi"]),
                    str(row["Kota"]),
                    str(row["Kecamatan"]),
                    str(row["Kelurahan"]),
                ]:
                    pilihan = wait.until(
                        EC.presence_of_element_located(
                            (By.XPATH, f"//*[normalize-space()='{target_lokasi}']")
                        )
                    )
                    self.driver.execute_script(
                        "arguments[0].scrollIntoView({block: 'center'});", pilihan
                    )
                    ActionChains(self.driver).move_to_element(pilihan).click().perform()
                    time.sleep(4)

            except Exception as alamat_err:
                print(f"!!! Gagal isi alamat: {alamat_err}")
                return "ERROR"

            alamat_element = wait.until(
                EC.presence_of_element_located((By.ID, "detail-domisili"))
            )
            self.driver.execute_script(
                """
                arguments[0].scrollIntoView(true);
                arguments[0].value = arguments[1];
                arguments[0].dispatchEvent(new Event('input', {bubbles:true}));
                arguments[0].dispatchEvent(new Event('change', {bubbles:true}));
            """,
                alamat_element,
                str(row["Alamat"]),
            )
            time.sleep(1)

            # Selanjutnya & Finalisasi Pendaftaran
            tombol = WebDriverWait(self.driver, 60).until(
                EC.presence_of_element_located(
                    (By.XPATH, "//div[contains(text(),'Selanjutnya')]")
                )
            )
            self.driver.execute_script(
                "arguments[0].scrollIntoView({block:'center'});", tombol
            )
            tombol.click()

            WebDriverWait(self.driver, 30).until(
                EC.element_to_be_clickable(
                    (By.XPATH, "//div[contains(text(),'Pilih')]")
                )
            ).click()
            time.sleep(1)
            WebDriverWait(self.driver, 60).until(
                EC.element_to_be_clickable(
                    (By.XPATH, "//div[contains(text(),'Daftarkan dengan NIK')]")
                )
            ).click()
            if (
                len(
                    self.driver.find_elements(
                        By.XPATH, "//button[normalize-space()='ok']"
                    )
                )
                > 0
            ):
                self.driver.find_element(
                    By.XPATH, "//button[normalize-space()='ok']"
                ).click()
            WebDriverWait(self.driver, 60).until(
                EC.element_to_be_clickable(
                    (By.XPATH, "//div[@class='tracking-wide' and contains(., 'Tutup')]")
                )
            ).click()
            time.sleep(1)

            # --- JURUS KONFIRMASI HADIR (SEARCHING PAGE) ---
            while True:
                try:
                    konfirmasi = WebDriverWait(self.driver, 10).until(
                        EC.presence_of_element_located(
                            (By.XPATH, "//*[normalize-space()='Konfirmasi Hadir']")
                        )
                    )
                    self.driver.execute_script(
                        "arguments[0].scrollIntoView({block: 'center'});", konfirmasi
                    )
                    ActionChains(self.driver).move_to_element(
                        konfirmasi
                    ).click().perform()
                    time.sleep(1)
                    break
                except Exception:
                    try:
                        tombol_next = self.driver.find_element(
                            By.XPATH, "//a[contains(text(), '>')]"
                        )
                        self.driver.execute_script(
                            "arguments[0].scrollIntoView({block: 'center'}); arguments[0].click();",
                            tombol_next,
                        )
                        time.sleep(1)
                    except Exception:
                        break

            # Modal Tandai Hadir
            # 1. TUNGGU MODAL & GUNAKAN LOGIKA CENTANG ASLI ANDA
            modal_body = WebDriverWait(self.driver, 60).until(
                EC.visibility_of_element_located(
                    (
                        By.XPATH,
                        "//div[contains(@class, 'overflow-auto') and .//div[contains(text(), 'Tandai Hadir')]]",
                    )
                )
            )

            # Ini adalah kode asli Anda yang sukses memunculkan tombol
            centang_hadir = modal_body.find_element(By.XPATH, "//div[@id='verify']")
            self.driver.execute_script(
                "arguments[0].scrollIntoView({block: 'center'}); arguments[0].click(); arguments[0].dispatchEvent(new Event('change', { bubbles: true }));",
                centang_hadir,
            )
            print(">>> Centang berhasil dieksekusi.")

            # Beri jeda sebentar agar animasi Nuxt.js memunculkan tombol Hadir
            time.sleep(2)

            # 2. EKSEKUSI TOMBOL HADIR (Bypass Kalender, Tanpa TAB)
            try:
                print(">>> Mencari tombol Hadir...")
                # Mencari tombol yang baru saja muncul di dalam modal
                tombol_hadir = modal_body.find_element(
                    By.XPATH, ".//button[contains(., 'Hadir') or contains(., 'Simpan')]"
                )

                # Klik langsung tombolnya (aman dari halangan kalender)
                self.driver.execute_script(
                    "arguments[0].scrollIntoView({block: 'center'}); arguments[0].click();",
                    tombol_hadir,
                )
                print(">>> [SUKSES] Tombol Hadir berhasil diklik!")
                time.sleep(5)

            except Exception as e:
                print(f"!!! Gagal mengeklik tombol Hadir: {e}")

            # Skrining Mandiri
            WebDriverWait(self.driver, 60).until(
                EC.element_to_be_clickable(
                    (
                        By.XPATH,
                        "//div[@class='tracking-wide' and contains(., 'Bantu Isi Skrining Mandiri')]",
                    )
                )
            ).click()
            time.sleep(2)

            verifikasi_list = self.driver.find_elements(
                By.XPATH, "//div[@id='sameLocation']"
            )

            if verifikasi_list:
                try:
                    # Gunakan WebDriverWait singkat saja untuk memastikan benar-benar siap
                    verifikasi = WebDriverWait(self.driver, 20).until(
                        EC.element_to_be_clickable(
                            (By.XPATH, "//div[@id='sameLocation']")
                        )
                    )
                    self.driver.execute_script("arguments[0].click();", verifikasi)
                    print("Log: Verifikasi diklik.")
                    time.sleep(3)

                    # 2. Cek tombol Simpan setelah Verifikasi berhasil
                    tmbl_simpan_list = self.driver.find_elements(
                        By.XPATH, "//*[contains(text(),'Simpan ')]"
                    )

                    if tmbl_simpan_list:
                        tmbl_simpan = WebDriverWait(self.driver, 30).until(
                            EC.element_to_be_clickable(
                                (By.XPATH, "//*[contains(text(),'Simpan ')]")
                            )
                        )
                        self.driver.execute_script("arguments[0].click();", tmbl_simpan)
                        print("Log: Data Berhasil Disimpan.")
                        time.sleep(6)
                    else:
                        print("Log: Tombol Simpan tidak muncul/tidak ditemukan.")

                except Exception as e:
                    print(f"Log: Terjadi kendala saat eksekusi tombol: {e}")
                    # Di sini kamu bisa tambahkan self.driver.refresh() jika ingin mencoba ulang
            else:
                print("Log: Tombol Verifikasi tidak ditemukan, melewati proses simpan.")
                # --- JURUS TEMBUS ISTRUSTED (BYPASS) ---

            try:
                # 1. Klik tombol Mulai Pemeriksaan
                btn_mulai = self.driver.find_element(
                    By.XPATH, "//button[contains(., 'Mulai Pemeriksaan')]"
                )
                self.driver.execute_script("arguments[0].click();", btn_mulai)
                print(">>> Tombol Mulai Pemeriksaan diklik.")

                # --- TAMBAHAN BARU: Eksekusi Pop-up Konfirmasi Tanggal ---
                try:
                    print(">>> Menunggu Pop-up Konfirmasi Tanggal Pemeriksaan...")
                    # Tunggu hingga judul pop-up tersebut muncul dan terlihat di layar
                    WebDriverWait(self.driver, 30).until(
                        EC.visibility_of_element_located(
                            (
                                By.XPATH,
                                "//*[contains(text(), 'Konfirmasi Tanggal Pemeriksaan')]",
                            )
                        )
                    )

                    # Cari tombol Simpan (Sama persis logikanya dengan tombol Hadir)
                    tombol_simpan_tgl = self.driver.find_element(
                        By.XPATH, "//button[contains(., 'Simpan')]"
                    )

                    # Eksekusi JS Click untuk membypass kalender dan langsung menyimpan
                    self.driver.execute_script(
                        "arguments[0].scrollIntoView({block: 'center'}); arguments[0].click();",
                        tombol_simpan_tgl,
                    )
                    print(
                        ">>> [SUKSES] Tombol Simpan pada pop-up tanggal berhasil diklik!"
                    )

                    # Beri jeda agar Nuxt.js merender halaman form (Gizi, Tensi, dll)
                    time.sleep(3)

                except Exception:
                    print(
                        ">>> Pop-up Konfirmasi Tanggal tidak muncul (mungkin sudah terlewati), lanjut eksekusi."
                    )
                    # ---------------------------------------------------------

            except Exception:
                print("!!! Gagal klik Mulai Pemeriksaan, mencoba Refresh...")
                self.driver.refresh()
                time.sleep(3)
                try:
                    btn_mulai_baru = self.driver.find_element(
                        By.XPATH, "//button[contains(., 'Mulai Pemeriksaan')]"
                    )
                    self.driver.execute_script("arguments[0].click();", btn_mulai_baru)
                    print(">>> Berhasil klik Mulai Pemeriksaan setelah Refresh.")
                except Exception as e_refresh:
                    print(f"!!! Tetap gagal klik Mulai Pemeriksaan setelah refresh: {e_refresh}")
                time.sleep(5)

            # --- INPUT DATA GIZI & TENSI ---
            for nama_form in ["Gizi", "Tekanan Darah"]:
                xpath_tombol = f"//div[contains(text(), '{nama_form}')]/ancestor::div[contains(@class, 'grid') or contains(@class, 'flex')]//button[contains(., 'Input Data')]"
                btn = WebDriverWait(self.driver, 10).until(
                    EC.element_to_be_clickable((By.XPATH, xpath_tombol))
                )
                self.driver.execute_script(
                    "arguments[0].scrollIntoView({block: 'center'}); arguments[0].click();",
                    btn,
                )
                time.sleep(3)

                if "Gizi" in nama_form:
                    f_bb = WebDriverWait(self.driver, 30).until(
                        EC.presence_of_element_located((By.ID, "sq_100i"))
                    )
                    self.driver.execute_script("arguments[0].click();", f_bb)
                    f_bb.send_keys(str(row["BB"]))
                    self.driver.find_element(By.ID, "sq_101i").send_keys(str(row["TB"]))
                    time.sleep(3)
                    self.driver.find_element(By.ID, "sq_102i").send_keys(
                        str(row["Lingkar Perut"])
                    )
                    ActionChains(self.driver).send_keys(Keys.ENTER).perform()
                elif "Tekanan Darah" in nama_form:
                    id_radio = (
                        "sq_100i_0"
                        if str(row["Riwayat Darah Tinggi"]).strip().lower() == "ya"
                        else "sq_100i_1"
                    )
                    rb = self.driver.find_element(By.ID, id_radio)
                    self.driver.execute_script("arguments[0].click();", rb)
                    self.driver.find_element(By.ID, "sq_102i").send_keys(
                        str(row["TD Sistolik"])
                    )
                    self.driver.find_element(By.ID, "sq_103i").send_keys(
                        str(row["TD Diastolik"])
                    )
                    ActionChains(self.driver).send_keys(Keys.ENTER).perform()

                btn_kirim = WebDriverWait(self.driver, 60).until(
                    EC.element_to_be_clickable((By.XPATH, "//input[@title='Kirim']"))
                )
                self.driver.execute_script(
                    "arguments[0].scrollIntoView({block: 'center'}); arguments[0].click();",
                    btn_kirim,
                )
                time.sleep(4)

            self.driver.refresh()

            return "SUKSES"

        except Exception as e:
            # Jika bot dihentikan atau browser sudah mati, jangan coba-coba melakukan recovery
            if self.is_stopped:
                return "STOPPED"
                
            # Cek apakah browser masih hidup sebelum mencoba menutup pop-up
            try:
                _ = self.driver.window_handles
            except Exception:
                logger.info(f"Eksekusi terhenti: Browser tertutup (Baris {index + 1})")
                self.is_stopped = True
                return "ERROR"

            print(f"Error di Baris {index + 1}: {e}")

            try:
                # Hanya coba klik OK jika browser masih hidup
                pilihan_ok = WebDriverWait(self.driver, 5).until(
                    EC.element_to_be_clickable(
                        (By.XPATH, "//*[contains(text(),'Ok ')]")
                    )
                )
                pilihan_ok.click()
                
                tombol_silang = self.driver.find_elements(
                    By.CLASS_NAME, "btn-transparent"
                )
                if tombol_silang:
                    tombol_silang[0].click()
                print("Log: Pop-up error ditutup (Klik OK).")

            except Exception:
                # Jika masih gagal, coba klik area luar hanya jika browser masih hidup
                try:
                    ActionChains(self.driver).move_by_offset(10, 10).click().perform()
                    ActionChains(self.driver).move_by_offset(-10, -10).perform()
                    
                    tombol_silang = self.driver.find_elements(
                        By.CLASS_NAME, "btn-transparent"
                    )
                    if tombol_silang:
                        tombol_silang[0].click()
                except Exception:
                    pass

            return "ERROR"

    def sembunyikan_browser(self):
        """
        Fungsi dummy (kosong) agar UI tidak crash.
        Browser sengaja tidak disembunyikan agar proses bot terlihat (Debugging).
        """
        print(
            ">>> [DEBUG MODE] Perintah sembunyikan browser diabaikan. Browser tetap tampil."
        )
        pass  # Kata 'pass' berarti lewati tanpa melakukan apa-apa

    def tampilkan_browser(self):
        """
        Mencegah error jika UI memanggil fungsi ini di akhir eksekusi.
        """
        if self.driver:
            print(">>> [DEBUG MODE] Memastikan browser tetap di depan.")
            # Opsional: Memaksa jendela ke depan jika sempat tertutup jendela lain
            self.driver.maximize_window()
        pass

    def tutup_browser(self):
        if self.driver:
            try:
                self.driver.quit()
            except Exception:
                pass
            finally:
                self.driver = None
