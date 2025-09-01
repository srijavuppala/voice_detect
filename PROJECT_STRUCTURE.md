# Project Structure

```
smart-home-voice-control/
├── 📁 frontend/                    # Main web interface
│   ├── 🌐 index.html              # Dashboard with voice controls
│   ├── 🎨 styles.css              # Responsive styling
│   └── ⚡ script.js               # Main application logic
├── 📁 backend/                     # Whisper server (optional)
│   ├── 🐍 whisper_server.py       # Flask API server
│   ├── 📋 requirements.txt        # Python dependencies
│   └── 🔧 setup.py               # Backend installation
├── 📁 tests/                      # Testing utilities (ignored in git)
│   ├── 🧪 diagnostic.js          # Command debugging tools
│   ├── 🎯 command_test.js        # Command testing script
│   ├── 📄 quick_test.html        # Interactive test interface
│   └── 📝 test_commands.js       # Test command definitions
├── 📁 docs/                       # Documentation
│   └── 📚 WHISPER_SETUP.md       # Whisper setup guide
├── 📁 scripts/                    # Utility scripts
│   └── 🚀 setup.sh               # Automated setup script
├── 📄 README.md                   # Main documentation
├── 🤝 CONTRIBUTING.md             # Contribution guidelines
├── 📜 LICENSE                     # MIT license
├── 📦 package.json               # Project metadata & scripts
└── 🚫 .gitignore                 # Git exclusion rules


## File Descriptions

### Core Application
- **`frontend/index.html`** - Main dashboard interface with device controls and quick commands
- **`frontend/styles.css`** - Modern dark theme with responsive design
- **`frontend/script.js`** - Voice recognition, command parsing, and UI management

### Backend (Optional)
- **`backend/whisper_server.py`** - OpenAI Whisper server for offline speech recognition
- **`backend/requirements.txt`** - Python dependencies (Flask, Whisper, etc.)

### Development & Testing
- **`tests/`** - Debugging and testing utilities (not included in production)
- **`scripts/setup.sh`** - Automated environment setup

### Documentation
- **`README.md`** - Complete project documentation with examples
- **`CONTRIBUTING.md`** - Guidelines for contributors
- **`docs/WHISPER_SETUP.md`** - Detailed Whisper installation guide

### Configuration
- **`package.json`** - NPM scripts and project metadata
- **`.gitignore`** - Excludes development files, tests, and environment-specific scripts
- **`LICENSE`** - MIT license for open source distribution

## Git Strategy

The project is organized for easy GitHub deployment:

1. **Production files** are in the main branch
2. **Development/test files** are excluded from git
3. **Environment-specific scripts** are gitignored
4. **Clean structure** ready for GitHub Pages deployment

## Quick Start Commands

```bash
# Setup everything
./scripts/setup.sh

# Start frontend only
npm start

# Start with Whisper backend
npm run start-whisper  # Terminal 1
npm start              # Terminal 2
```