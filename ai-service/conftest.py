import sys
from pathlib import Path

# Ensure ai-service root is in sys.path regardless of where pytest is invoked
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
