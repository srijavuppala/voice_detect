#!/usr/bin/env python3
"""
Smart Home Whisper Backend Server
Provides offline speech recognition using OpenAI's Whisper model
"""

import os
import io
import json
import time
import logging
from datetime import datetime
import tempfile
import threading
from typing import Dict, Any, Optional

import whisper
import numpy as np
import soundfile as sf
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import webrtcvad

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/whisper_server.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class WhisperSpeechRecognizer:
    """Whisper-based speech recognition with optimizations"""
    
    def __init__(self, model_name: str = "base"):
        self.model_name = model_name
        self.model = None
        self.vad = webrtcvad.Vad(2)  # Moderate aggressiveness
        self.load_model()
        
    def load_model(self):
        """Load Whisper model with error handling"""
        try:
            logger.info(f"Loading Whisper model: {self.model_name}")
            self.model = whisper.load_model(self.model_name)
            logger.info(f"✅ Whisper model '{self.model_name}' loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to load Whisper model: {e}")
            raise
    
    def preprocess_audio(self, audio_data: bytes, sample_rate: int = 16000) -> np.ndarray:
        """Preprocess audio data for Whisper"""
        try:
            # Convert bytes to numpy array
            audio_np = np.frombuffer(audio_data, dtype=np.int16)
            
            # Convert to float32 and normalize
            audio_float = audio_np.astype(np.float32) / 32768.0
            
            # Resample if necessary (Whisper expects 16kHz)
            if sample_rate != 16000:
                import librosa
                audio_float = librosa.resample(audio_float, orig_sr=sample_rate, target_sr=16000)
            
            return audio_float
            
        except Exception as e:
            logger.error(f"Audio preprocessing error: {e}")
            raise
    
    def detect_speech(self, audio_data: bytes, sample_rate: int = 16000) -> bool:
        """Detect if audio contains speech using VAD"""
        try:
            # Convert to required format for VAD (16-bit PCM, 16kHz)
            if sample_rate == 16000:
                # Split audio into 30ms frames (480 samples at 16kHz)
                frame_duration = 0.03  # 30ms
                frame_size = int(sample_rate * frame_duration)
                
                frames = []
                for i in range(0, len(audio_data) - frame_size, frame_size * 2):  # *2 for 16-bit
                    frame = audio_data[i:i + frame_size * 2]
                    if len(frame) == frame_size * 2:
                        frames.append(frame)
                
                # Check if any frame contains speech
                speech_frames = 0
                for frame in frames:
                    if self.vad.is_speech(frame, sample_rate):
                        speech_frames += 1
                
                # Consider it speech if >30% of frames contain speech
                return speech_frames > len(frames) * 0.3
            
            return True  # Default to True if can't do VAD
            
        except Exception as e:
            logger.warning(f"VAD error (defaulting to True): {e}")
            return True
    
    def transcribe(self, audio_data: bytes, sample_rate: int = 16000) -> Dict[str, Any]:
        """Transcribe audio using Whisper"""
        start_time = time.time()
        
        try:
            # Check for speech activity
            has_speech = self.detect_speech(audio_data, sample_rate)
            if not has_speech:
                return {
                    "text": "",
                    "confidence": 0.0,
                    "processing_time": time.time() - start_time,
                    "status": "no_speech_detected"
                }
            
            # Preprocess audio
            audio_np = self.preprocess_audio(audio_data, sample_rate)
            
            # Transcribe with Whisper
            result = self.model.transcribe(
                audio_np,
                language="en",
                task="transcribe",
                fp16=False,  # Use fp32 for better compatibility
                verbose=False
            )
            
            # Extract results
            text = result.get("text", "").strip()
            
            # Calculate confidence (approximate from segments)
            segments = result.get("segments", [])
            if segments:
                confidences = []
                for segment in segments:
                    # Whisper doesn't provide direct confidence, use probability as proxy
                    avg_logprob = segment.get("avg_logprob", -1.0)
                    # Convert log probability to confidence score (0-1)
                    confidence = min(1.0, max(0.0, np.exp(avg_logprob)))
                    confidences.append(confidence)
                avg_confidence = np.mean(confidences)
            else:
                # Fallback confidence based on text length and quality
                avg_confidence = min(0.95, max(0.1, len(text.split()) / 10))
            
            processing_time = time.time() - start_time
            
            logger.info(f"Transcription: '{text}' (confidence: {avg_confidence:.2f}, time: {processing_time:.2f}s)")
            
            return {
                "text": text,
                "confidence": float(avg_confidence),
                "processing_time": processing_time,
                "status": "success",
                "segments": segments
            }
            
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return {
                "text": "",
                "confidence": 0.0,
                "processing_time": time.time() - start_time,
                "status": "error",
                "error": str(e)
            }

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend access

# Initialize Whisper recognizer
recognizer = None

def init_recognizer():
    """Initialize Whisper recognizer in background thread"""
    global recognizer
    try:
        recognizer = WhisperSpeechRecognizer("base")
        logger.info("🎤 Whisper backend ready!")
    except Exception as e:
        logger.error(f"Failed to initialize recognizer: {e}")

# Initialize recognizer in background
thread = threading.Thread(target=init_recognizer)
thread.daemon = True
thread.start()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy" if recognizer else "initializing",
        "model": recognizer.model_name if recognizer else None,
        "timestamp": datetime.now().isoformat()
    })

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    """Transcribe audio using Whisper"""
    if not recognizer:
        return jsonify({
            "error": "Whisper model not loaded yet",
            "status": "initializing"
        }), 503
    
    try:
        # Check if audio file is provided
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({"error": "Empty audio file"}), 400
        
        # Read audio data
        audio_data = audio_file.read()
        
        # Get sample rate from form data (default 16000)
        sample_rate = int(request.form.get('sample_rate', 16000))
        
        # Transcribe audio
        result = recognizer.transcribe(audio_data, sample_rate)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Transcription endpoint error: {e}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@app.route('/models', methods=['GET'])
def get_available_models():
    """Get list of available Whisper models"""
    models = {
        "tiny": {"size": "39 MB", "speed": "~32x realtime", "accuracy": "Good"},
        "base": {"size": "74 MB", "speed": "~16x realtime", "accuracy": "Better"}, 
        "small": {"size": "244 MB", "speed": "~6x realtime", "accuracy": "Very Good"},
        "medium": {"size": "769 MB", "speed": "~2x realtime", "accuracy": "Excellent"},
        "large": {"size": "1550 MB", "speed": "~1x realtime", "accuracy": "Best"}
    }
    
    return jsonify({
        "current_model": recognizer.model_name if recognizer else None,
        "available_models": models
    })

@app.route('/switch_model', methods=['POST'])
def switch_model():
    """Switch to a different Whisper model"""
    global recognizer
    
    data = request.get_json()
    new_model = data.get('model', 'base')
    
    if new_model not in ['tiny', 'base', 'small', 'medium', 'large']:
        return jsonify({"error": "Invalid model name"}), 400
    
    try:
        logger.info(f"Switching to model: {new_model}")
        recognizer = WhisperSpeechRecognizer(new_model)
        return jsonify({
            "status": "success",
            "message": f"Switched to {new_model} model",
            "model": new_model
        })
    except Exception as e:
        return jsonify({
            "error": f"Failed to switch model: {str(e)}",
            "status": "error"
        }), 500

@app.route('/')
def serve_frontend():
    """Serve the main frontend file"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    return send_from_directory('.', filename)

def main():
    """Main server function"""
    # Ensure directories exist
    os.makedirs('logs', exist_ok=True)
    os.makedirs('uploads', exist_ok=True)
    
    print("🏠 Smart Home Whisper Backend Server")
    print("=" * 40)
    print(f"🎤 Initializing Whisper model...")
    print(f"🌐 Server will start on http://localhost:5000")
    print(f"📱 Frontend accessible at http://localhost:5000")
    print(f"🔧 API endpoints:")
    print(f"   - POST /transcribe - Transcribe audio")
    print(f"   - GET /health - Health check")
    print(f"   - GET /models - Available models")
    print(f"   - POST /switch_model - Switch model")
    print("=" * 40)
    
    # Run Flask app
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False,  # Set to False for production
        threaded=True
    )

if __name__ == '__main__':
    main()