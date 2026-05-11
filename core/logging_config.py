"""
Logging Configuration - Nextflow Pro
Setup logging terpusat: File (Audit) + Console (Debug).
"""
import logging
import logging.handlers
import sys
import os
from pathlib import Path
from datetime import datetime

def setup_logging(app_name="NextFlowPro", debug=False):
    """Konfigurasi logging global."""
    log_level = logging.DEBUG if debug else logging.INFO
    
    # Path Log: %APPDATA%/NextFlowPro/logs
    if sys.platform == 'win32':
        log_dir = Path(os.getenv('APPDATA')) / app_name / 'logs'
    else:
        log_dir = Path.home() / f'.{app_name.lower()}' / 'logs'
        
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / f"{datetime.now().strftime('%Y-%m-%d')}.log"

    # Format
    fmt = logging.Formatter(
        '%(asctime)s [%(levelname)s] %(name)s.%(funcName)s: %(message)s',
        datefmt='%H:%M:%S'
    )

    # Root Logger
    root = logging.getLogger()
    root.setLevel(log_level)
    root.handlers.clear()

    # 1. Console Handler
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(fmt)
    root.addHandler(ch)

    # 2. File Handler (Rotating: Max 5MB, Keep 5 files)
    fh = logging.handlers.RotatingFileHandler(
        log_file, maxBytes=5*1024*1024, backupCount=5, encoding='utf-8'
    )
    fh.setFormatter(fmt)
    root.addHandler(fh)

    logging.info("="*50)
    logging.info(f"Logging Initialized (Level: {logging.getLevelName(log_level)})")
    logging.info(f"Log File: {log_file}")
    logging.info("="*50)
    
    return root
