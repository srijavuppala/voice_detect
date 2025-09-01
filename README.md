# Smart Home Voice Control Dashboard

A modern, responsive voice-controlled smart home interface built with HTML, CSS, and JavaScript. Features dual speech recognition backends (Web Speech API and OpenAI Whisper) with real-time device control and visual feedback.

## 🌟 Features

### Core Functionality
- **Voice Control**: Natural language commands for all smart home devices
- **Dual Backend Support**: Web Speech API (browser-based) + OpenAI Whisper (offline)
- **Real-time UI Updates**: Instant visual feedback for device state changes
- **Quick Commands Panel**: Click-to-execute buttons for all major commands
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

### Device Support
- **Lights**: On/Off, dimming controls for all rooms
- **Thermostat**: Temperature control with voice commands
- **Music**: Play/Stop/Pause controls per room
- **Security**: Arm/disarm security system
- **Scenes**: Movie mode, goodnight, wake up, party mode
- **Timers**: Set delayed actions ("turn off lights in 10 minutes")

### Smart Features
- **Natural Language Processing**: Understands varied speech patterns
- **Room Recognition**: Handles truncated/partial room names
- **Command History**: Track and debug voice commands
- **Persistent State**: Device states saved in localStorage
- **Error Handling**: Comprehensive error detection and reporting

## 🚀 Quick Start

### Option 1: Browser-Only (Web Speech API)
```bash
# Clone the repository
git clone https://github.com/yourusername/smart-home-voice-control.git
cd smart-home-voice-control

# Open in browser
open frontend/index.html
# or
python3 -m http.server 8000
# Then visit http://localhost:8000/frontend
```

### Option 2: With Whisper Backend (Offline Recognition)
```bash
# Install Python dependencies
cd backend
pip install -r requirements.txt

# Start the Whisper server
python whisper_server.py

# In another terminal, serve the frontend
cd ../frontend
python3 -m http.server 8000
```

## 📁 Project Structure

```
smart-home-voice-control/
├── frontend/                 # Web interface
│   ├── index.html           # Main dashboard
│   ├── styles.css           # Styling and responsive design
│   └── script.js            # Main application logic
├── backend/                 # Whisper server (optional)
│   ├── whisper_server.py    # Flask server for Whisper API
│   ├── requirements.txt     # Python dependencies
│   └── setup.py            # Installation script
├── tests/                   # Testing utilities
│   ├── diagnostic.js        # Voice command debugging
│   ├── command_test.js      # Command testing script
│   └── quick_test.html      # Interactive test interface
├── docs/                    # Documentation
│   └── WHISPER_SETUP.md     # Whisper installation guide
├── scripts/                 # Utility scripts
└── README.md               # This file
```

## 🎯 Voice Commands

### Device Control
```
"Turn on living room lights"
"Turn off bedroom lights"
"Dim kitchen lights to 50 percent"
"Set temperature to 72 degrees"
"Play music in bedroom"
"Stop music"
"Arm security"
"Disarm security"
```

### Scenes
```
"Movie mode"        # Dims lights, starts music
"Goodnight"         # Turns off lights, arms security
"Wake up"           # Morning lighting
"Party mode"        # Full lighting, music
```

### Timers
```
"Turn off bedroom lights in 10 minutes"
"Stop music in living room in 1 hour"
```

### Settings
```
"Turn off voice responses"
"Use Whisper backend"
"Help" or "What can you do"
```

## 🖱️ Quick Commands Panel

The interface includes a clickable quick commands panel with organized categories:

- **Lights**: On/Off controls for all rooms
- **Music**: Play/Stop controls for all rooms  
- **Temperature**: Quick temperature presets (68°F, 72°F, 75°F)
- **Security & Scenes**: System controls and preset scenes

## 🔧 Configuration

### Device Setup
Edit the `defaultStates` object in `frontend/script.js` to match your smart home setup:

```javascript
const defaultStates = {
    'living-room': {
        lights: 0,
        thermostat: 72,
        music: 'stopped'
    },
    'bedroom': {
        lights: 0,
        thermostat: 70,
        music: 'stopped'
    },
    // Add more rooms...
};
```

### Backend Configuration
For Whisper backend, modify `backend/whisper_server.py`:

```python
# Model options: tiny, base, small, medium, large
WHISPER_MODEL = 'base'
SERVER_PORT = 5000
```

## 🧪 Testing & Debugging

### Browser Console Testing
```javascript
// Test individual commands
smartHomeApp.testCommand("turn on bedroom lights");

// Test all commands
smartHomeApp.testAllCommands();

// Check device-UI mapping
smartHomeApp.checkDeviceUIMapping();
```

### Debug Panel
- Real-time speech recognition output
- Command parsing results
- Error messages and timestamps
- Command execution history

## 📱 Responsive Design

- **Desktop**: Full feature set with 2-column layout
- **Tablet**: Optimized grid layouts and touch-friendly buttons
- **Mobile**: Single-column layout, larger touch targets

## 🔒 Browser Compatibility

- **Chrome**: Full support (Web Speech API + Whisper)
- **Firefox**: Whisper backend only
- **Safari**: Web Speech API support
- **Edge**: Full support
- **Mobile browsers**: Varies by platform

## 🛠️ Development

### Adding New Devices
1. Update `defaultStates` in `script.js`
2. Add device card to `index.html`
3. Update command patterns in `parseCommand()`
4. Add to quick commands panel

### Adding New Commands
1. Add pattern to `patterns` array in `parseCommand()`
2. Implement action handler
3. Add to help system
4. Test with debugging tools

## 📋 Requirements

### Frontend Only
- Modern web browser with JavaScript enabled
- Microphone access permission
- HTTPS connection (required for Web Speech API)

### With Whisper Backend
- Python 3.8+
- 4GB+ RAM recommended
- Microphone access
- Network connection for initial model download

## 🚀 Deployment

### GitHub Pages
```bash
# Build and deploy to GitHub Pages
git checkout -b gh-pages
git add frontend/*
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages
```

### Local Server
```bash
# Simple HTTP server
python3 -m http.server 8000
# or
npx serve frontend
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI Whisper for speech recognition
- Web Speech API for browser-based recognition
- Modern CSS features for responsive design

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/smart-home-voice-control/issues)
- **Documentation**: See `/docs` folder
- **Testing**: Use built-in debugging tools

---

Built with ❤️ for the smart home community