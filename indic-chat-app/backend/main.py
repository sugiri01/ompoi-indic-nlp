

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import io
import os
import whisper
from gtts import gTTS
import io
import os
import whisper
from gtts import gTTS
import tempfile
import imageio_ffmpeg
import shutil

# Setup ffmpeg for Whisper
# Whisper expects 'ffmpeg' command, but imageio-ffmpeg has a versioned name.
# We'll copy it to 'ffmpeg.exe' in the current directory and add it to PATH.
ffmpeg_exe_path = imageio_ffmpeg.get_ffmpeg_exe()
current_dir = os.path.dirname(os.path.abspath(__file__))
target_ffmpeg_path = os.path.join(current_dir, "ffmpeg.exe")

if not os.path.exists(target_ffmpeg_path):
    print(f"Copying ffmpeg from {ffmpeg_exe_path} to {target_ffmpeg_path}...")
    try:
        shutil.copy(ffmpeg_exe_path, target_ffmpeg_path)
    except Exception as e:
        print(f"Failed to copy ffmpeg: {e}")

# Add current directory to PATH so Whisper checks here for ffmpeg.exe
os.environ["PATH"] += os.pathsep + current_dir


app = FastAPI(title="OMPOI Indic API", description="Backend for OMPOI Indic Chatbot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    source_lang: str
    target_lang: str

class ChatResponse(BaseModel):
    original: str
    translated: str
    response: str # For now, maybe just an echo or simple logic

@app.get("/")
def read_root():
    return {"message": "OMPOI Indic Backend is running"}


from model_utils import perform_translation


from groq import Groq

# ... (Previous Imports) ...

import os
api_key = os.getenv("GROQ_API_KEY")

# Initialize Groq client
groq_client = Groq(api_key=GROQ_API_KEY)

# Initialize Whisper model (loads on first use)
print("Loading Whisper model (base)...")
whisper_model = whisper.load_model("base")  # Options: tiny, base, small, medium, large
print("Whisper model loaded successfully!")

def query_llm(prompt: str) -> str:
    """
    Query Groq API using official SDK (Llama 3.1 8B Instant)
    """
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.1-8b-instant",
            temperature=0.7,
            max_tokens=1024,
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        print(f"LLM Error: {e}")
        import traceback
        traceback.print_exc()
        return f"I apologize, but I encountered an error connecting to the AI: {str(e)}"

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    # Flow:
    # 1. User Message (in Source Lang) -> Translate to English
    # 2. English Message -> LLM (Claude 3.5 Sonnet) -> English Response
    # 3. English Response -> Translate to Target Lang
    
    print(f"Received: {request.message} ({request.source_lang} -> {request.target_lang})")
    
    # Step 1: Translate to English (if not already)
    user_message_en = request.message
    if request.source_lang != "eng_Latn":
        user_message_en = perform_translation(request.message, request.source_lang, "eng_Latn")
    
    print(f"In English: {user_message_en}")
    
    # Step 2: Generate Response (Real AI)
    print("Querying Claude 3.5 Sonnet...")
    ai_response_en = query_llm(user_message_en)
    print(f"AI Response: {ai_response_en[:100]}...")
    
    # Step 3: Translate Response to User's Target Language
    final_response = ai_response_en
    if request.target_lang != "eng_Latn":
        final_response = perform_translation(ai_response_en, "eng_Latn", request.target_lang)
        
    return {
        "original": request.message,
        "translated": final_response, # The message the user sees
        "response": final_response
    }


@app.get("/languages")
def get_supported_languages():
    return {
        "languages": [
            {"code": "hin_Deva", "name": "Hindi"},
            {"code": "eng_Latn", "name": "English"},
            {"code": "tam_Taml", "name": "Tamil"},
            # Add more IndicTrans2 codes here
        ]
    }


@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Transcribe audio using local Whisper model (FREE!)
    Accepts audio files in various formats (webm, mp3, wav, m4a, etc.)
    Returns transcribed text
    """
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
            audio_bytes = await file.read()
            temp_audio.write(audio_bytes)
            temp_audio_path = temp_audio.name
        
        # Transcribe using local Whisper model
        result = whisper_model.transcribe(temp_audio_path)
        
        # Clean up temp file
        os.unlink(temp_audio_path)
        
        return {"text": result["text"]}
        
    except Exception as e:
        print(f"Transcription Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


class TTSRequest(BaseModel):
    text: str
    language: str  # Language code like 'eng_Latn', 'hin_Deva', etc.


@app.post("/text-to-speech")
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech using gTTS (FREE!)
    Returns audio file as streaming response
    """
    try:
        # Map language codes to gTTS language codes
        lang_map = {
            "eng_Latn": "en",
            "hin_Deva": "hi",
            "tam_Taml": "ta",
            "tel_Telu": "te",
            "mal_Mlym": "ml",
            "kan_Knda": "kn",
            "ben_Beng": "bn",
            "guj_Gujr": "gu",
        }
        
        tts_lang = lang_map.get(request.language, "en")
        
        # Generate speech using gTTS
        tts = gTTS(text=request.text, lang=tts_lang, slow=False)
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_audio:
            tts.save(temp_audio.name)
            temp_audio_path = temp_audio.name
        
        # Read the audio file
        with open(temp_audio_path, "rb") as audio_file:
            audio_bytes = io.BytesIO(audio_file.read())
        
        # Clean up temp file
        os.unlink(temp_audio_path)
        
        return StreamingResponse(
            audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "attachment; filename=speech.mp3"
            }
        )
        
    except Exception as e:
        print(f"TTS Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")
