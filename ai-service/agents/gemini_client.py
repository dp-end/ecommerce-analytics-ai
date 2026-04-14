"""
Merkezi Gemini istemcisi — uygulama başladığında bir kez yapılandırılır.

Tüm agent dosyaları bu modülden `model` import eder;
her dosyada ayrı ayrı `genai.configure()` çağrısı yapılmaz.
"""

import os

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

_api_key = os.getenv("GEMINI_API_KEY", "")
if not _api_key:
    import warnings
    warnings.warn(
        "GEMINI_API_KEY ayarlanmamış. "
        "ai-service/.env dosyasına GEMINI_API_KEY=... satırını ekle.",
        stacklevel=2,
    )

genai.configure(api_key=_api_key)

# Tüm agent'ların kullandığı varsayılan model
DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-lite")


def get_model(model_name: str = DEFAULT_MODEL) -> genai.GenerativeModel:
    """Yeni bir GenerativeModel örneği döndürür."""
    return genai.GenerativeModel(model_name)
