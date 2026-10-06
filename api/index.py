import sys
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# Add root and backend paths to sys.path
candidates = [
    os.path.join(ROOT, "backend"),
    os.path.join(HERE, "backend"),
    os.path.join(HERE, "..", "backend"),
    ROOT,
    HERE
]

for p in candidates:
    abs_p = os.path.abspath(p)
    if abs_p not in sys.path:
        sys.path.insert(0, abs_p)

from main import app

