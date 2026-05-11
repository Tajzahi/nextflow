"""
Single Instance Lock - Nextflow Pro
Mencegah aplikasi dijalankan lebih dari satu kali menggunakan Windows Mutex.
"""
import sys
import logging

logger = logging.getLogger(__name__)

class InstanceLock:
    def __init__(self, app_name="NextFlowPro"):
        self.app_name = app_name
        self.lock_acquired = False
        self.mutex = None

    def acquire(self) -> bool:
        """Mencoba mendapatkan lock. Return True jika berhasil (instance pertama)."""
        if sys.platform != 'win32':
            # Sederhana untuk non-windows (file lock bisa ditambahkan jika perlu)
            return True

        try:
            import win32event
            import win32api
            import winerror
            
            # Buat named mutex yang unik di level OS
            self.mutex = win32event.CreateMutex(None, False, f"Global\\{self.app_name}_SingleInstance")
            last_error = win32api.GetLastError()
            
            if last_error == winerror.ERROR_ALREADY_EXISTS:
                logger.warning("Instance lain sudah berjalan (Mutex detected).")
                return False
            
            self.lock_acquired = True
            logger.info("Instance lock acquired.")
            return True
        except ImportError:
            logger.warning("pywin32 tidak terinstal. Single instance check dilewati.")
            return True
        except Exception as e:
            logger.error(f"Gagal inisialisasi InstanceLock: {e}")
            return True

    def release(self):
        """Melepaskan lock saat aplikasi ditutup."""
        if self.mutex and self.lock_acquired:
            try:
                import win32api
                win32api.CloseHandle(self.mutex)
                logger.info("Instance lock released.")
            except Exception as e:
                logger.debug(f"Gagal menutup handle mutex: {e}")
                pass
