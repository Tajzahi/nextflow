"""
Supabase RPC Client — AutoEntry Pro
Arsitektur Server-Authoritative dengan 3-Layer Device ID Caching.
"""
import subprocess
import platform
import uuid
import logging
from pathlib import Path
from typing import Optional, Dict, Any, TYPE_CHECKING

if TYPE_CHECKING:
    from core.database_manager import DatabaseManager

from supabase import create_client, Client

logger = logging.getLogger(__name__)


class SupabaseRPC:
    """
    Client untuk memanggil RPC Supabase.
    Mendukung 3-layer caching untuk Device ID:
    1. Memory (self._device_id)
    2. Database (SQLite via db_mgr)
    3. Fresh generation (subprocess)
    """

    def __init__(self, url: str, key: str, db_mgr: Optional['DatabaseManager'] = None):
        """
        Args:
            url: Supabase project URL
            key: Supabase anon key
            db_mgr: Instance DatabaseManager untuk caching persistensi
        """
        self.client: Client = create_client(url, key)
        self.db_mgr = db_mgr
        self._device_id: Optional[str] = None
        
        logger.info("SupabaseRPC: Initialized with 3-layer caching support")

    # ------------------------------------------------------------------
    # DEVICE ID LOGIC (3-LAYER)
    # ------------------------------------------------------------------
    def get_device_id(self) -> str:
        """
        Dapatkan hardware ID unik laptop.
        """
        # LAYER 1: Memory cache
        if self._device_id:
            return self._device_id

        # LAYER 2: Database cache
        if self.db_mgr:
            cached = self.db_mgr.ambil_device_id()
            if cached:
                self._device_id = cached
                logger.debug("Device ID loaded from database cache")
                return self._device_id

        # LAYER 3: Fresh generation
        logger.info("Generating fresh device ID...")
        device_id = self._generate_hardware_id()
        
        # Simpan ke cache
        self._device_id = device_id
        if self.db_mgr and "FALLBACK" not in device_id:
            self.db_mgr.simpan_device_id(device_id)
            
        return device_id

    def _generate_hardware_id(self) -> str:
        """Generate hardware ID via subprocess."""
        try:
            system = platform.system()

            if system == "Windows":
                output = subprocess.check_output(
                    "wmic csproduct get uuid",
                    shell=True,
                    stderr=subprocess.DEVNULL,
                    timeout=5,
                ).decode('utf-8', errors='ignore').strip()
                lines = [line.strip() for line in output.split("\n") if line.strip()]
                if len(lines) >= 2 and lines[1] != "UUID":
                    return f"WIN-{lines[1]}"

            elif system == "Darwin":  # macOS
                output = subprocess.check_output(
                    ["system_profiler", "SPHardwareDataType"],
                    stderr=subprocess.DEVNULL,
                    timeout=5,
                ).decode('utf-8', errors='ignore')
                for line in output.split("\n"):
                    if "Serial Number" in line:
                        serial = line.split(":")[-1].strip()
                        if serial:
                            return f"MAC-{serial}"

            elif system == "Linux":
                try:
                    m_id = Path("/etc/machine-id").read_text().strip()
                    return f"LINUX-{m_id}"
                except Exception as e:
                    logger.debug(f"Gagal baca machine-id: {e}")
                    pass

        except Exception as e:
            logger.warning(f"Gagal generate hardware ID via subprocess: {e}")

        # FALLBACK: MAC address
        try:
            mac = ":".join(
                ["{:02x}".format((uuid.getnode() >> i) & 0xFF) for i in range(0, 48, 8)][::-1]
            )
            return f"FALLBACK-MAC-{mac}"
        except Exception as e:
            logger.debug(f"Gagal ambil MAC, fallback ke UUID: {e}")
            return f"FALLBACK-RAND-{uuid.uuid4()}"

    # ------------------------------------------------------------------
    # RPC METHODS
    # ------------------------------------------------------------------
    def activate_license(self, token: str, device_id: Optional[str] = None) -> Dict[str, Any]:
        if device_id is None:
            device_id = self.get_device_id()
        token = token.strip().upper()
        try:
            response = self.client.rpc("activate_license", {"p_token": token, "p_device_id": device_id}).execute()
            return response.data
        except Exception as e:
            logger.error(f"RPC activate_license error: {e}")
            return {"success": False, "code": "NETWORK_ERROR", "message": f"Gagal terhubung ke server: {e}", "hard_lock": False}

    def check_user_status(self, token: str, device_id: Optional[str] = None) -> Dict[str, Any]:
        if device_id is None:
            device_id = self.get_device_id()
        
        token = token.strip()
            
        try:
            response = self.client.rpc("check_user_status", {"p_token": token, "p_device_id": device_id}).execute()
            return response.data
        except Exception as e:
            logger.error(f"RPC check_user_status error: {e}")
            return {"success": False, "code": "NETWORK_ERROR", "message": f"Gagal terhubung ke server: {e}", "hard_lock": False}

    def increment_usage(self, token: str, device_id: Optional[str] = None, increment_val: int = 1) -> Dict[str, Any]:
        if device_id is None:
            device_id = self.get_device_id()
        if increment_val <= 0:
            return {"success": False, "code": "INVALID_INCREMENT", "message": "Nilai increment harus > 0", "hard_lock": False}
        
        token = token.strip()
            
        try:
            # Hapus timeout=15 karena versi library user tidak mendukungnya
            response = self.client.rpc("increment_usage", {"p_token": token, "p_device_id": device_id, "p_increment_val": increment_val}).execute()
            return response.data
        except Exception as e:
            logger.error(f"RPC increment_usage error: {e}")
            return {"success": False, "code": "NETWORK_ERROR", "message": f"Gagal mengirim data ke server: {e}", "hard_lock": False}
