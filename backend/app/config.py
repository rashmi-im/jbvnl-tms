import os

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.environ.get("TMS_DB", os.path.join(HERE, "tms.db"))
UPLOADS_DIR = os.path.join(HERE, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
SEED_PASSWORD = os.environ.get("TMS_SEED_PASSWORD", "ChangeMe@123")
SESSION_EXPIRE_HOURS = 12
