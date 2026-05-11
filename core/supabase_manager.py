"""
SupabaseManager — Thin Adapter (backward-compatible wrapper)

Kelas ini sekarang mendelegasikan semua operasi ke SupabaseRPC.
Tidak ada lagi akses tabel langsung (.table(...).select/update).
Semua validasi & business logic berjalan di server via RPC.
"""
import logging
from core.config import SupabaseConfig
from core.supabase_rpc import SupabaseRPC

logger = logging.getLogger(__name__)


class SupabaseManager:
    """
    Adapter layer di atas SupabaseRPC.
    Menjaga kompatibilitas dengan kode lama yang mengimpor SupabaseManager.
    """

    def __init__(self, db_mgr=None):
        self.rpc = SupabaseRPC(SupabaseConfig.URL, SupabaseConfig.KEY, db_mgr=db_mgr)

    # ------------------------------------------------------------------
    # Akses device_id via RPC (cached)
    # ------------------------------------------------------------------
    def get_device_id(self) -> str:
        return self.rpc.get_device_id()

    # ------------------------------------------------------------------
    # activate_license → RPC Call (Unified for V2)
    # ------------------------------------------------------------------
    def activate_license(self, token: str) -> dict:
        """
        Panggil RPC activate_license secara langsung.
        Digunakan oleh bridge.py (sync_data, pre_check).
        """
        try:
            return self.rpc.activate_license(token=token)
        except Exception as e:
            logger.error(f"SupabaseManager.activate_license Error: {e}")
            return {"success": False, "message": str(e)}

    # ------------------------------------------------------------------
    # validate_and_activate_token → Wrapper untuk Login
    # ------------------------------------------------------------------
    def validate_and_activate_token(self, license_key: str):
        """
        Wrapper untuk auth_login di bridge.py.
        Returns: (success_bool, result_dict)
        """
        result = self.activate_license(license_key)
        return result.get("success", False), result

    # ------------------------------------------------------------------
    # check_user_status → check_user_status RPC
    # ------------------------------------------------------------------
    def check_user_status(self, token: str) -> dict:
        """Wrapper langsung ke check_user_status RPC."""
        return self.rpc.check_user_status(token=token)

    # ------------------------------------------------------------------
    # increment_usage → RPC Call (Unified for V2)
    # ------------------------------------------------------------------
    def increment_usage(self, token: str, increment_val: int) -> dict:
        """
        Panggil RPC increment_usage secara langsung.
        Digunakan oleh bridge.py untuk memotong kuota.
        """
        try:
            return self.rpc.increment_usage(token=token, increment_val=increment_val)
        except Exception as e:
            logger.error(f"SupabaseManager.increment_usage Error: {e}")
            return {"success": False, "message": str(e)}

    # ------------------------------------------------------------------
    # increment_usage_batch → Legacy Wrapper
    # ------------------------------------------------------------------
    def increment_usage_batch(self, token: str, count: int) -> dict:
        """Wrapper lama untuk kompatibilitas."""
        return self.increment_usage(token=token, increment_val=count)
