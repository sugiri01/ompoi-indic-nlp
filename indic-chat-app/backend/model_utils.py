
from deep_translator import GoogleTranslator

class ModelManager:
    _instance = None
    
    def __init__(self):
        # Using Google Translate API via deep-translator library
        # Lightweight, fast, and supports all major languages including Indic languages
        # No model downloads required and compatible with modern dependencies!
        
        print("Initializing Google Translate (deep-translator)...")
        print("Google Translate initialized successfully!")
        
        # Language code mapping (our format -> Google Translate format)
        self.lang_map = {
            "eng_Latn": "en",
            "hin_Deva": "hi",
            "tam_Taml": "ta",
            "tel_Telu": "te",
            "mal_Mlym": "ml",
            "kan_Knda": "kn",
            "ben_Beng": "bn",
            "guj_Gujr": "gu",
        }

    def translate(self, text: str, src_lang: str, tgt_lang: str):
        """
        Translate text from source language to target language using Google Translate
        """
        try:
            # Map to Google Translate codes
            src_code = self.lang_map.get(src_lang, "en")
            tgt_code = self.lang_map.get(tgt_lang, "hi")
            
            # Perform translation using deep-translator
            translator = GoogleTranslator(source=src_code, target=tgt_code)
            result = translator.translate(text)
            
            return result
            
        except Exception as e:
            print(f"Translation Error: {e}")
            import traceback
            traceback.print_exc()
            return f"[Translation Error: {str(e)}]"

# Global instance
manager = ModelManager()

def perform_translation(text: str, src: str, tgt: str) -> str:
    """
    Public API for translation
    """
    try:
        return manager.translate(text, src, tgt)
    except Exception as e:
        print(f"Translation Error: {e}")
        import traceback
        traceback.print_exc()
        return f"[Error: {str(e)}]"

