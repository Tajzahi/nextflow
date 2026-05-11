import logging
from core.config_loader import get_secret

class WebConfig:
    URL_LOGIN = "https://sehatindonesiaku.kemkes.go.id/ckg-pendaftaran-individu"
    USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    XPATH_MENU_PKG = "//button[.//img[contains(@src, 'menu-pkg.svg')]]"


class ExcelColor:
    HIJAU = "00FF00"
    MERAH = "FF0000"
    KUNING = "FFFF00"
    BIRU = "3484F0"


class SupabaseConfig:
    """
    Konfigurasi Supabase. 
    Sekarang dimuat dari secrets.enc via config_loader.
    """
    URL: str = get_secret("SUPABASE_URL")
    KEY: str = get_secret("SUPABASE_PUBLISHABLE_KEY")

    @classmethod
    def validate(cls) -> None:
        """Validasi bahwa credentials sudah di-set."""
        if not cls.URL or not cls.KEY:
            raise EnvironmentError("Supabase credentials tidak valid atau belum didekripsi.")
        logging.info("SupabaseConfig: Credentials berhasil dimuat via config_loader")