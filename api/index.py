import sys
import os

# Add backend directory to sys.path
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BACKEND = os.path.join(ROOT, "backend")

if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)

from main import app
