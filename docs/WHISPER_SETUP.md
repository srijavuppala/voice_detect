# 🎤 Whisper Backend Setup Guide

This guide will help you set up OpenAI's Whisper for offline, high-accuracy speech recognition in your Smart Home Voice Control system.

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

**macOS/Linux:**
```bash
./start_whisper.sh
```

**Windows:**
```cmd
start_whisper.bat
```

### Option 2: Manual Setup

1. **Install Python 3.8+**
   ```bash
   # Check Python version
   python3 --version
   ```

2. **Create Virtual Environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # Linux/Mac
   # or
   venv\Scripts\activate     # Windows
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Download Whisper Model**
   ```bash
   python -c "import whisper; whisper.load_model('base')"
   ```

5. **Start Server**
   ```bash
   python whisper_server.py
   ```

## 🎯 Features

### 🔧 **Backend Capabilities**
- **Offline Processing**: No internet required after setup
- **High Accuracy**: Superior to browser speech recognition
- **Voice Activity Detection**: Filters out background noise
- **Multiple Model Sizes**: From tiny (39MB) to large (1.5GB)
- **Confidence Scoring**: Quality assessment for each transcription

### 🌐 **API Endpoints**
- `POST /transcribe` - Transcribe audio files
- `GET /health` - Server health check
- `GET /models` - Available model information
- `POST /switch_model` - Change Whisper model

## 🎛️ Usage

### 1. **Start the Backend**
```bash
./start_whisper.sh
```

### 2. **Switch to Whisper in Frontend**
- Say: **"Use Whisper backend"**
- Or manually set in browser console: `localStorage.setItem('useWhisperBackend', 'true')`

### 3. **Test Voice Commands**
- "Turn on living room lights"
- "Set temperature to 72 degrees"
- "Movie mode"

### 4. **Switch Back to Browser**
- Say: **"Use Web Speech"**

## ⚙️ Configuration

### Model Selection

| Model | Size | Speed | Accuracy | Use Case |
|-------|------|-------|----------|----------|
| tiny  | 39MB | ~32x realtime | Good | Testing |
| **base** | **74MB** | **~16x realtime** | **Better** | **Recommended** |
| small | 244MB | ~6x realtime | Very Good | High accuracy |
| medium | 769MB | ~2x realtime | Excellent | Professional |
| large | 1550MB | ~1x realtime | Best | Maximum accuracy |

### Switch Models via API
```bash
curl -X POST http://localhost:5000/switch_model \
     -H "Content-Type: application/json" \
     -d '{"model": "small"}'
```

### Environment Variables
```bash
export WHISPER_MODEL=base          # Default model
export WHISPER_DEVICE=cpu          # cpu or cuda
export WHISPER_PORT=5000           # Server port
```

## 🔍 Troubleshooting

### Common Issues

**1. "Module not found" errors**
```bash
# Ensure virtual environment is activated
source venv/bin/activate
pip install -r requirements.txt
```

**2. "CUDA out of memory" (GPU users)**
```bash
# Switch to CPU processing
export WHISPER_DEVICE=cpu
```

**3. "Permission denied" on startup script**
```bash
chmod +x start_whisper.sh
```

**4. Port already in use**
```bash
# Kill existing process
lsof -ti:5000 | xargs kill -9
```

**5. Frontend can't connect to backend**
- Ensure server is running on `http://localhost:5000`
- Check firewall settings
- Try refreshing the webpage

### Performance Optimization

**For Real-time Performance:**
- Use `tiny` or `base` model
- Ensure sufficient RAM (>4GB recommended)
- Close unnecessary applications

**For Maximum Accuracy:**
- Use `large` model
- Enable GPU acceleration (if available)
- Use quiet environment for recording

## 📊 Comparison: Whisper vs Web Speech API

| Feature | Whisper | Web Speech API |
|---------|---------|----------------|
| **Accuracy** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Offline** | ✅ | ❌ |
| **Privacy** | ✅ (Local) | ❌ (Cloud) |
| **Latency** | Medium | Low |
| **Setup** | Complex | Simple |
| **Languages** | 99+ | Limited |
| **Noise Handling** | Excellent | Good |

## 🛡️ Privacy & Security

### Data Processing
- **100% Local**: All audio processed on your device
- **No Internet**: Works completely offline after setup
- **No Logging**: Audio not stored after processing
- **Open Source**: Full code transparency

### Security Features
- CORS enabled for local frontend access only
- No persistent audio storage
- Automatic cleanup of temporary files
- VAD (Voice Activity Detection) prevents silent recordings

## 🚀 Advanced Usage

### Custom Model Training
```python
# Load custom fine-tuned model
import whisper
model = whisper.load_model("path/to/custom/model")
```

### Batch Processing
```bash
# Process multiple audio files
curl -X POST http://localhost:5000/transcribe \
     -F "audio=@recording1.wav" \
     -F "audio=@recording2.wav"
```

### Integration with Other Apps
```javascript
// Use from any web application
const formData = new FormData();
formData.append('audio', audioBlob);

const response = await fetch('http://localhost:5000/transcribe', {
    method: 'POST',
    body: formData
});

const result = await response.json();
console.log(result.text);
```

## 📈 Performance Monitoring

### Server Logs
```bash
tail -f logs/whisper_server.log
```

### Health Check
```bash
curl http://localhost:5000/health
```

### Model Performance
- Processing time logged for each transcription
- Confidence scores provided for quality assessment
- Memory usage monitoring

## 🎓 For Developers

### API Response Format
```json
{
    "text": "turn on living room lights",
    "confidence": 0.95,
    "processing_time": 0.85,
    "status": "success",
    "segments": [...]
}
```

### Error Handling
```json
{
    "error": "No speech detected",
    "status": "no_speech_detected",
    "processing_time": 0.12
}
```

### WebSocket Support (Future)
Real-time streaming transcription for continuous voice control.

## 🎉 Success!

Once setup is complete, you'll have:
- ✅ Offline speech recognition
- ✅ Higher accuracy than browser APIs  
- ✅ Complete privacy (local processing)
- ✅ Professional-grade voice control
- ✅ Seamless integration with existing UI

**Your Smart Home now has state-of-the-art speech recognition! 🏠🎤**