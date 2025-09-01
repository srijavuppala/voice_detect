class SmartHomeVoiceControl {
    constructor() {
        this.recognition = null;
        this.synthesis = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isListening = false;
        this.devices = this.loadDeviceStates();
        this.commandHistory = [];
        this.maxHistoryLength = 10;
        this.activeTimers = new Map();
        this.voiceResponseEnabled = true;
        this.confidenceThreshold = 0.7;
        this.demoMode = false;
        this.scenes = this.loadScenes();
        this.responseVariations = this.getResponseVariations();
        
        // Backend configuration
        this.useWhisperBackend = localStorage.getItem('useWhisperBackend') === 'true';
        this.whisperServerUrl = 'http://localhost:5000';
        this.whisperAvailable = false;
        
        // Performance monitoring
        this.performanceMetrics = {
            touchResponse: [],
            voiceRecognition: [],
            commandProcessing: [],
            uiUpdate: [],
            overall: []
        };
        this.maxMetricSamples = 10;
        
        this.init();
    }

    init() {
        this.checkWhisperAvailability();
        this.setupSpeechRecognition();
        this.setupSpeechSynthesis();
        this.setupEventListeners();
        this.updateUI();
        this.loadCommandHistory();
        this.showWelcomeMessage();
    }

    async checkWhisperAvailability() {
        try {
            const response = await fetch(`${this.whisperServerUrl}/health`);
            if (response.ok) {
                const data = await response.json();
                this.whisperAvailable = data.status === 'healthy';
                if (this.whisperAvailable) {
                    this.addToDebugPanel('Whisper backend available', 'success');
                }
            }
        } catch (error) {
            this.whisperAvailable = false;
            if (this.useWhisperBackend) {
                this.addToDebugPanel('Whisper backend unavailable, falling back to Web Speech API', 'error');
                this.useWhisperBackend = false;
            }
        }
    }

    setupSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showError('Speech recognition not supported in this browser');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateMicButton();
            this.updateVoiceStatus('Listening...');
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateMicButton();
            this.updateVoiceStatus('Click to start listening');
        };

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let confidence = 0;
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                    confidence = event.results[i][0].confidence || 1;
                }
            }

            if (finalTranscript.trim()) {
                this.processCommand(finalTranscript.trim(), confidence);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.showError(`Speech recognition error: ${event.error}`);
            this.isListening = false;
            this.updateMicButton();
            this.updateVoiceStatus('Click to start listening');
        };
    }

    setupSpeechSynthesis() {
        if ('speechSynthesis' in window) {
            this.synthesis = window.speechSynthesis;
        } else {
            console.warn('Speech synthesis not supported');
        }
    }
    
    speak(text, options = {}) {
        if (!this.synthesis || !this.voiceResponseEnabled || !text) return;
        
        // Cancel any ongoing speech
        this.synthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options.rate || 0.9;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 0.8;
        
        // Try to use a pleasant voice
        const voices = this.synthesis.getVoices();
        const preferredVoice = voices.find(voice => 
            voice.name.includes('Samantha') || 
            voice.name.includes('Karen') || 
            voice.name.includes('Female') ||
            voice.lang.startsWith('en')
        );
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        
        this.synthesis.speak(utterance);
    }

    setupEventListeners() {
        const micButton = document.getElementById('mic-btn');
        const clearDebugButton = document.getElementById('clear-debug');

        micButton.addEventListener('click', () => {
            if (this.isListening) {
                this.stopListening();
            } else {
                this.startListening();
            }
        });

        clearDebugButton.addEventListener('click', () => {
            this.clearDebugPanel();
        });

        // Performance metrics toggle
        const toggleMetricsButton = document.getElementById('toggle-metrics');
        const metricsContent = document.getElementById('performance-content');
        
        if (toggleMetricsButton && metricsContent) {
            toggleMetricsButton.addEventListener('click', () => {
                const isHidden = metricsContent.classList.contains('hidden');
                metricsContent.classList.toggle('hidden');
                toggleMetricsButton.textContent = isHidden ? 'Hide' : 'Show';
            });
        }
        
        // Keyboard shortcuts for accessibility
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'm':
                        e.preventDefault();
                        if (this.isListening) {
                            this.stopListening();
                        } else {
                            this.startListening();
                        }
                        break;
                    case 'h':
                        e.preventDefault();
                        this.showHelp();
                        break;
                }
            }
            
            // Space bar for quick mic toggle
            if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                if (this.isListening) {
                    this.stopListening();
                } else {
                    this.startListening();
                }
            }
        });
        
        // Mobile vibration support
        if ('vibrate' in navigator) {
            this.setupVibrationFeedback();
        }
        
        // Setup device card click handlers
        this.setupDeviceCardHandlers();
    }
    
    setupVibrationFeedback() {
        const originalExecuteCommand = this.executeCommand.bind(this);
        this.executeCommand = function(command) {
            if (command.type !== 'help' && navigator.vibrate) {
                navigator.vibrate(50); // Short vibration on command execution
            }
            return originalExecuteCommand(command);
        };
    }
    
    setupDeviceCardHandlers() {
        // Add click handlers to all device cards
        document.querySelectorAll('.device-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                
                const room = card.closest('.room-card').dataset.room;
                const device = card.dataset.device;
                
                console.log('Device card clicked:', room, device);
                
                if (!room || !device) return;
                
                // Toggle device state based on current state
                const currentValue = this.devices[room][device];
                let command;
                
                switch (device) {
                    case 'lights':
                        const isOn = currentValue > 0;
                        command = {
                            device: 'lights',
                            room: room,
                            action: isOn ? 'off' : 'on',
                            value: isOn ? 0 : 100
                        };
                        break;
                        
                    case 'music':
                        const isPlaying = currentValue === 'playing';
                        command = {
                            device: 'music',
                            room: room,
                            action: isPlaying ? 'stop' : 'play',
                            value: isPlaying ? 'stopped' : 'playing'
                        };
                        break;
                        
                    case 'security':
                        const isArmed = currentValue === 'armed';
                        command = {
                            device: 'security',
                            room: room,
                            action: isArmed ? 'disarm' : 'arm',
                            value: isArmed ? 'disarmed' : 'armed'
                        };
                        break;
                        
                    case 'thermostat':
                        // For thermostat, increment by 1 degree (cycle 68-76)
                        let temp = typeof currentValue === 'number' ? currentValue : 72;
                        temp = temp >= 76 ? 68 : temp + 1;
                        command = {
                            device: 'thermostat',
                            room: room,
                            action: 'set',
                            value: temp
                        };
                        break;
                        
                    default:
                        return;
                }
                
                this.addToDebugPanel(`Manual control: ${device} in ${room}`, 'success');
                this.executeCommand(command);
            });
        });
    }

    async startListening() {
        if (this.useWhisperBackend && this.whisperAvailable) {
            await this.startWhisperRecording();
        } else {
            this.startWebSpeechRecognition();
        }
    }

    stopListening() {
        if (this.useWhisperBackend && this.mediaRecorder) {
            this.stopWhisperRecording();
        } else if (this.recognition) {
            this.recognition.stop();
        }
    }

    startWebSpeechRecognition() {
        if (!this.recognition) {
            this.showError('Speech recognition not available');
            return;
        }

        try {
            this.recognition.start();
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            this.showError('Could not start speech recognition');
        }
    }

    async startWhisperRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                } 
            });
            
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/wav'
            });
            
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.processWhisperAudio();
                stream.getTracks().forEach(track => track.stop());
            };
            
            this.mediaRecorder.start();
            this.isListening = true;
            this.updateMicButton();
            this.updateVoiceStatus('Recording with Whisper...');
            
        } catch (error) {
            console.error('Error starting Whisper recording:', error);
            this.showError('Could not start Whisper recording');
            // Fallback to Web Speech API
            this.useWhisperBackend = false;
            this.startWebSpeechRecognition();
        }
    }

    stopWhisperRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
            this.isListening = false;
            this.updateMicButton();
            this.updateVoiceStatus('Processing...');
        }
    }

    async processWhisperAudio() {
        try {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
            
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.wav');
            formData.append('sample_rate', '16000');
            
            this.updateVoiceStatus('Transcribing with Whisper...');
            
            const response = await fetch(`${this.whisperServerUrl}/transcribe`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            this.updateVoiceStatus('Click to start listening');
            
            if (result.status === 'success' && result.text.trim()) {
                this.processCommand(result.text.trim(), result.confidence);
            } else if (result.status === 'no_speech_detected') {
                this.addToDebugPanel('No speech detected', 'error');
            } else if (result.error) {
                this.showError(`Whisper error: ${result.error}`);
            }
            
        } catch (error) {
            console.error('Error processing Whisper audio:', error);
            this.showError(`Whisper processing failed: ${error.message}`);
            this.updateVoiceStatus('Click to start listening');
        }
    }

    processCommand(command, confidence = 1) {
        const timestamp = new Date().toLocaleTimeString();
        const confidenceText = confidence < 1 ? ` (${Math.round(confidence * 100)}%)` : '';
        this.addToDebugPanel(`[${timestamp}] "${command}"${confidenceText}`);
        
        // Debug: Log the exact command being processed
        console.log('🎤 Processing command:', JSON.stringify(command));
        console.log('🏠 Available rooms:', Object.keys(this.devices));
        
        if (confidence < this.confidenceThreshold && confidence < 1) {
            this.addToDebugPanel(`[${timestamp}] Low confidence, please repeat`, 'error');
            this.speak("Sorry, I didn't hear that clearly. Could you please repeat?");
            return;
        }
        
        const parsedCommand = this.parseCommand(command.toLowerCase());
        
        if (parsedCommand) {
            console.log('✅ Parsed command successfully:', parsedCommand);
            this.executeCommand(parsedCommand);
            this.addCommandToHistory(command, parsedCommand, true);
        } else {
            console.log('❌ Failed to parse command:', command);
            this.addToDebugPanel(`[${timestamp}] Command not recognized`, 'error');
            this.speak(this.getRandomResponse('unrecognized'));
            this.addCommandToHistory(command, null, false);
        }
    }

    parseCommand(command) {
        // Add debugging to see what command is being parsed
        console.log('Parsing command:', command);
        
        // Check for help commands first
        if (command.includes('help') || command.includes('what can you do') || command.includes('commands')) {
            return { type: 'help', action: 'show' };
        }
        
        // Check for scene commands
        if (command.includes('movie mode') || command.includes('cinema mode')) {
            return { type: 'scene', action: 'movie' };
        }
        
        if (command.includes('goodnight') || command.includes('good night')) {
            return { type: 'scene', action: 'goodnight' };
        }
        
        if (command.includes('wake up') || command.includes('morning mode')) {
            return { type: 'scene', action: 'morning' };
        }
        
        if (command.includes('party mode') || command.includes('party time')) {
            return { type: 'scene', action: 'party' };
        }
        
        // Check for timer commands
        const timerMatch = command.match(/(turn off|stop) (.+) in (\d+) (minutes?|mins?|hours?|hrs?)/i);
        if (timerMatch) {
            return {
                type: 'timer',
                device: 'lights',
                room: this.normalizeRoom(timerMatch[2]),
                action: 'turn off',
                duration: parseInt(timerMatch[3]),
                unit: timerMatch[4].toLowerCase()
            };
        }
        
        // Check for voice settings
        if (command.includes('turn off voice') || command.includes('disable voice')) {
            return { type: 'settings', action: 'disable_voice' };
        }
        
        if (command.includes('turn on voice') || command.includes('enable voice')) {
            return { type: 'settings', action: 'enable_voice' };
        }
        
        // Check for backend switching
        if (command.includes('use whisper') || command.includes('switch to whisper') || command.includes('whisper backend')) {
            return { type: 'settings', action: 'use_whisper' };
        }
        
        if (command.includes('use web speech') || command.includes('switch to web speech') || command.includes('browser speech')) {
            return { type: 'settings', action: 'use_webspeech' };
        }
        
        const patterns = [
            // LIGHTS COMMANDS - More specific patterns first
            {
                pattern: /turn\s+(on|off)\s+(?:the\s+)?(living\s+room|bedroom|kitchen|living|master)\s+lights?/,
                type: 'lights',
                action: (matches) => {
                    const room = this.normalizeRoom(matches[2]);
                    console.log('Light command (specific):', matches[1], 'Room from match:', matches[2], 'Normalized:', room);
                    return {
                        device: 'lights',
                        room: room,
                        action: matches[1],
                        value: matches[1] === 'on' ? 100 : 0
                    };
                }
            },
            {
                pattern: /(living\s+room|bedroom|kitchen|living|master)\s+lights?\s+(on|off)/,
                type: 'lights',
                action: (matches) => {
                    const room = this.normalizeRoom(matches[1]);
                    console.log('Light command (room first):', matches[2], 'Room from match:', matches[1], 'Normalized:', room);
                    return {
                        device: 'lights',
                        room: room,
                        action: matches[2],
                        value: matches[2] === 'on' ? 100 : 0
                    };
                }
            },
            {
                pattern: /(?:turn\s+)?(on|off)\s+(?:the\s+)?lights?(?:\s+in\s+(?:the\s+)?(living\s+room|bedroom|kitchen|living|master))?/,
                type: 'lights',
                action: (matches) => {
                    const room = matches[2] ? this.normalizeRoom(matches[2]) : 'living-room';
                    console.log('Light command (general):', matches[1], 'Room from match:', matches[2] || 'default', 'Normalized:', room);
                    return {
                        device: 'lights',
                        room: room,
                        action: matches[1],
                        value: matches[1] === 'on' ? 100 : 0
                    };
                }
            },
            {
                pattern: /lights?\s+(on|off)(?:\s+in\s+(?:the\s+)?(.+))?/,
                type: 'lights',
                action: (matches) => {
                    const room = matches[2] ? this.normalizeRoom(matches[2]) : 'living-room';
                    console.log('Light command:', matches[1], 'Room:', room);
                    return {
                        device: 'lights',
                        room: room,
                        action: matches[1],
                        value: matches[1] === 'on' ? 100 : 0
                    };
                }
            },
            {
                pattern: /dim\s+(?:the\s+)?(?:(.+)\s+)?lights?\s+to\s+(\d+)(?:\s*percent|%)?/,
                type: 'lights',
                action: (matches) => {
                    const room = matches[1] ? this.normalizeRoom(matches[1]) : 'living-room';
                    const value = Math.min(100, Math.max(0, parseInt(matches[2])));
                    console.log('Dim command:', value, 'Room:', room);
                    return {
                        device: 'lights',
                        room: room,
                        action: 'dim',
                        value: value
                    };
                }
            },
            
            // THERMOSTAT COMMANDS - More flexible patterns
            {
                pattern: /set\s+(?:the\s+)?temperature\s+to\s+(\d+)(?:\s+(?:degrees?|°f?))?(?:\s+in\s+(?:the\s+)?(.+))?/,
                type: 'thermostat',
                action: (matches) => {
                    const room = matches[2] ? this.normalizeRoom(matches[2]) : 'living-room';
                    const temp = parseInt(matches[1]);
                    console.log('Thermostat command:', temp, 'Room:', room);
                    return {
                        device: 'thermostat',
                        room: room,
                        action: 'set',
                        value: temp
                    };
                }
            },
            {
                pattern: /set\s+(?:the\s+)?(.+)\s+temperature\s+to\s+(\d+)(?:\s+(?:degrees?|°f?))?/,
                type: 'thermostat',
                action: (matches) => {
                    const room = this.normalizeRoom(matches[1]);
                    const temp = parseInt(matches[2]);
                    console.log('Thermostat command:', temp, 'Room:', room);
                    return {
                        device: 'thermostat',
                        room: room,
                        action: 'set',
                        value: temp
                    };
                }
            },
            
            // MUSIC COMMANDS - More flexible patterns
            {
                pattern: /(play|stop|pause)\s+(?:the\s+)?music(?:\s+in\s+(?:the\s+)?(.+))?/,
                type: 'music',
                action: (matches) => {
                    const room = matches[2] ? this.normalizeRoom(matches[2]) : 'living-room';
                    const action = matches[1];
                    console.log('Music command:', action, 'Room:', room);
                    return {
                        device: 'music',
                        room: room,
                        action: action,
                        value: action === 'play' ? 'playing' : action === 'stop' ? 'stopped' : 'paused'
                    };
                }
            },
            {
                pattern: /music\s+(on|off|play|stop|pause)(?:\s+in\s+(?:the\s+)?(.+))?/,
                type: 'music',
                action: (matches) => {
                    const room = matches[2] ? this.normalizeRoom(matches[2]) : 'living-room';
                    const action = matches[1] === 'on' ? 'play' : matches[1] === 'off' ? 'stop' : matches[1];
                    console.log('Music command:', action, 'Room:', room);
                    return {
                        device: 'music',
                        room: room,
                        action: action,
                        value: action === 'play' ? 'playing' : action === 'stop' ? 'stopped' : 'paused'
                    };
                }
            },
            
            // SECURITY COMMANDS
            {
                pattern: /(arm|disarm)\s+(?:the\s+)?security(?:\s+system)?/,
                type: 'security',
                action: (matches) => {
                    console.log('Security command:', matches[1]);
                    return {
                        device: 'security',
                        room: 'kitchen',
                        action: matches[1],
                        value: matches[1] === 'arm' ? 'armed' : 'disarmed'
                    };
                }
            }
        ];

        for (const pattern of patterns) {
            const matches = command.match(pattern.pattern);
            if (matches) {
                return pattern.action(matches);
            }
        }

        return null;
    }

    normalizeRoom(roomName) {
        if (!roomName) return 'living-room';
        
        const normalized = roomName.trim().toLowerCase();
        console.log('🏠 Normalizing room:', JSON.stringify(roomName), '->', JSON.stringify(normalized));
        
        const roomMap = {
            // Living room variations
            'living room': 'living-room',
            'livingroom': 'living-room',
            'living': 'living-room',
            'lounge': 'living-room',
            'front room': 'living-room',
            'main room': 'living-room',
            
            // Handle truncated names (common with voice recognition)
            'living roo': 'living-room',  // Common truncation
            'living ro': 'living-room',
            'livin': 'living-room',
            'liv': 'living-room',
            
            // Bedroom variations
            'bedroom': 'bedroom',
            'bed room': 'bedroom',
            'master bedroom': 'bedroom',
            'master': 'bedroom',
            'sleeping room': 'bedroom',
            'bed': 'bedroom',
            
            // Kitchen variations
            'kitchen': 'kitchen',
            'cooking area': 'kitchen',
            'dining room': 'kitchen',
            'kitch': 'kitchen'
        };

        // First try exact match
        let result = roomMap[normalized];
        
        // If no exact match, try partial matching for common truncations
        if (!result) {
            for (const [key, value] of Object.entries(roomMap)) {
                if (key.startsWith(normalized) || normalized.startsWith(key)) {
                    result = value;
                    console.log('🔄 Found partial match:', key, '->', value);
                    break;
                }
            }
        }
        
        // Default fallback
        result = result || 'living-room';
        
        console.log('📍 Room mapping result:', JSON.stringify(normalized), '->', result);
        return result;
    }

    executeCommand(command) {
        console.log('Executing command:', command);
        
        // Handle special command types
        if (command.type === 'help') {
            this.showHelp();
            return;
        }
        
        if (command.type === 'scene') {
            this.executeScene(command.action);
            return;
        }
        
        if (command.type === 'timer') {
            this.setTimer(command);
            return;
        }
        
        if (command.type === 'settings') {
            this.handleSettings(command);
            return;
        }
        
        // Handle regular device commands
        const { device, room, action, value } = command;
        
        console.log(`🔧 Trying to execute: ${device} in ${room} -> ${action} (${value})`);
        console.log('🏠 Available devices:', JSON.stringify(this.devices, null, 2));
        console.log(`🔍 Checking room '${room}':`, this.devices[room]);
        console.log(`🔍 Checking device '${device}' in room '${room}':`, this.devices[room] ? this.devices[room][device] : 'ROOM NOT FOUND');
        
        if (!this.devices[room]) {
            console.error(`❌ Room '${room}' not found. Available rooms:`, Object.keys(this.devices));
            this.addToDebugPanel(`Room ${room} not found`, 'error');
            this.speak(`Sorry, I don't have a ${room.replace('-', ' ')} configured.`);
            return;
        }
        
        if (!this.devices[room].hasOwnProperty(device)) {
            console.error(`❌ Device '${device}' not found in room '${room}'. Available devices:`, Object.keys(this.devices[room]));
            console.error('🔍 Device check details:');
            console.error(`  - Looking for device: "${device}" (type: ${typeof device})`);
            console.error(`  - Available devices:`, Object.keys(this.devices[room]));
            console.error(`  - Device exists check:`, device in this.devices[room]);
            console.error(`  - HasOwnProperty check:`, this.devices[room].hasOwnProperty(device));
            this.addToDebugPanel(`Device ${device} not found in ${room}`, 'error');
            this.speak(`Sorry, I couldn't find the ${device} in the ${room.replace('-', ' ')}.`);
            return;
        }

        console.log(`✓ Command valid, executing...`);
        
        // Add realistic delay for device response
        setTimeout(() => {
            this.devices[room][device] = value;
            this.saveDeviceStates();
            this.updateDeviceUI(room, device, value);
            
            const timestamp = new Date().toLocaleTimeString();
            const successMessage = this.formatSuccessMessage(command);
            this.addToDebugPanel(`[${timestamp}] ✓ ${successMessage}`, 'success');
            
            // Speak confirmation
            this.speak(this.getRandomResponse('success', successMessage));
        }, Math.random() * 500 + 200); // Random delay 200-700ms
    }

    executeScene(sceneName) {
        const scenes = this.scenes[sceneName];
        if (!scenes) {
            this.speak(`Sorry, I don't know the ${sceneName} scene.`);
            return;
        }
        
        this.addToDebugPanel(`Executing ${sceneName} scene...`, 'success');
        this.speak(`Activating ${sceneName} mode.`);
        
        scenes.forEach((command, index) => {
            setTimeout(() => {
                this.devices[command.room][command.device] = command.value;
                this.updateDeviceUI(command.room, command.device, command.value);
            }, index * 500);
        });
        
        this.saveDeviceStates();
        
        setTimeout(() => {
            this.speak(this.getRandomResponse('success', `${sceneName} mode activated.`));
        }, scenes.length * 500);
    }
    
    setTimer(command) {
        const { device, room, action, duration, unit } = command;
        
        let milliseconds = duration * 60000; // Default to minutes
        if (unit.includes('hour')) {
            milliseconds = duration * 3600000;
        }
        
        const timerId = `${room}-${device}-${Date.now()}`;
        const endTime = Date.now() + milliseconds;
        
        this.activeTimers.set(timerId, {
            room,
            device,
            action,
            endTime,
            duration: duration,
            unit: unit.includes('hour') ? 'hour' : 'minute'
        });
        
        const timeText = `${duration} ${unit.includes('hour') ? 'hour' : 'minute'}${duration > 1 ? 's' : ''}`;
        this.addToDebugPanel(`Timer set: ${action} ${room.replace('-', ' ')} ${device} in ${timeText}`, 'success');
        this.speak(`Timer set. I'll ${action} the ${room.replace('-', ' ')} ${device} in ${timeText}.`);
        
        setTimeout(() => {
            if (this.activeTimers.has(timerId)) {
                this.devices[room][device] = action === 'turn off' ? 0 : 'stopped';
                this.updateDeviceUI(room, device, this.devices[room][device]);
                this.saveDeviceStates();
                
                this.addToDebugPanel(`Timer executed: ${action} ${room.replace('-', ' ')} ${device}`, 'success');
                this.speak(`Timer completed. I've turned off the ${room.replace('-', ' ')} ${device}.`);
                
                this.activeTimers.delete(timerId);
            }
        }, milliseconds);
    }
    
    handleSettings(command) {
        if (command.action === 'disable_voice') {
            this.voiceResponseEnabled = false;
            this.addToDebugPanel('Voice responses disabled', 'success');
            this.speak('Voice responses are now disabled.');
        } else if (command.action === 'enable_voice') {
            this.voiceResponseEnabled = true;
            this.addToDebugPanel('Voice responses enabled', 'success');
            this.speak('Voice responses are now enabled.');
        } else if (command.action === 'use_whisper') {
            if (this.whisperAvailable) {
                this.useWhisperBackend = true;
                localStorage.setItem('useWhisperBackend', 'true');
                this.addToDebugPanel('Switched to Whisper backend', 'success');
                this.speak('Now using Whisper for more accurate speech recognition.');
            } else {
                this.addToDebugPanel('Whisper backend not available', 'error');
                this.speak('Whisper backend is not available. Please start the Python server.');
            }
        } else if (command.action === 'use_webspeech') {
            this.useWhisperBackend = false;
            localStorage.setItem('useWhisperBackend', 'false');
            this.addToDebugPanel('Switched to Web Speech API', 'success');
            this.speak('Now using browser speech recognition.');
        }
    }
    
    showHelp() {
        const helpText = `Here are the commands I understand:

Device Control:
- Turn on/off lights: "turn on living room lights"
- Dim lights: "dim bedroom lights to 50 percent"
- Set temperature: "set temperature to 72 degrees"
- Control music: "play music in bedroom", "stop music"
- Security: "arm security", "disarm security"

Scenes:
- "Movie mode" - dims lights and starts music
- "Goodnight" - turns off all lights and arms security
- "Wake up" or "morning mode" - turns on lights
- "Party mode" - activates fun lighting

Timers:
- "Turn off bedroom lights in 10 minutes"

Settings:
- "Turn off voice responses"
- "Turn on voice responses"
- "Use Whisper backend" (offline, more accurate)
- "Use Web Speech" (browser-based)

Keyboard shortcuts:
- Ctrl/Cmd + M: Toggle microphone
- Ctrl/Cmd + H: Show help
- Spacebar: Quick mic toggle`;
        
        this.addToDebugPanel('Help system activated', 'success');
        this.speak('I can control your smart home devices. Try saying things like turn on living room lights, set temperature to 72, play music, movie mode, or goodnight. You can also set timers by saying turn off lights in 10 minutes.');
        
        // Show help in debug panel
        setTimeout(() => {
            this.addToDebugPanel(helpText, 'success');
        }, 1000);
    }
    
    showWelcomeMessage() {
        if (!localStorage.getItem('smartHomeWelcomed')) {
            setTimeout(() => {
                this.addToDebugPanel('Welcome! Say "help" to learn what I can do, or try "turn on living room lights"', 'success');
                this.speak('Welcome to your smart home! Say help to learn what I can do.');
                localStorage.setItem('smartHomeWelcomed', 'true');
            }, 1000);
        }
    }
    
    getResponseVariations() {
        return {
            success: [
                'Done!',
                'Sure thing!',
                'You got it!',
                'Consider it done!',
                'All set!',
                'Perfect!',
                'Great!'
            ],
            unrecognized: [
                "Sorry, I didn't understand that command.",
                "I'm not sure what you meant. Try saying 'help' for available commands.",
                "Could you rephrase that? Say 'help' to see what I can do.",
                "I didn't catch that. Try 'help' for a list of commands."
            ]
        };
    }
    
    getRandomResponse(type, message = '') {
        const responses = this.responseVariations[type];
        if (!responses) return message;
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        return type === 'success' ? `${randomResponse} ${message}` : randomResponse;
    }
    
    loadScenes() {
        return {
            movie: [
                { room: 'living-room', device: 'lights', value: 20 },
                { room: 'living-room', device: 'music', value: 'playing' }
            ],
            goodnight: [
                { room: 'living-room', device: 'lights', value: 0 },
                { room: 'bedroom', device: 'lights', value: 0 },
                { room: 'kitchen', device: 'lights', value: 0 },
                { room: 'kitchen', device: 'security', value: 'armed' }
            ],
            morning: [
                { room: 'bedroom', device: 'lights', value: 80 },
                { room: 'kitchen', device: 'lights', value: 100 },
                { room: 'kitchen', device: 'security', value: 'disarmed' }
            ],
            party: [
                { room: 'living-room', device: 'lights', value: 100 },
                { room: 'bedroom', device: 'lights', value: 75 },
                { room: 'kitchen', device: 'lights', value: 100 },
                { room: 'living-room', device: 'music', value: 'playing' }
            ]
        };
    }

    formatSuccessMessage(command) {
        const { device, room, action, value } = command;
        const roomName = room.replace('-', ' ');
        
        switch (device) {
            case 'lights':
                if (action === 'dim') {
                    return `${roomName} lights dimmed to ${value}%`;
                }
                return `${roomName} lights turned ${action}`;
            case 'thermostat':
                return `${roomName} temperature set to ${value}°F`;
            case 'music':
                return `Music ${value} in ${roomName}`;
            case 'security':
                return `Security system ${value}`;
            default:
                return `${device} in ${roomName} updated`;
        }
    }

    updateDeviceUI(room, device, value) {
        console.log(`🎨 Updating UI: ${device} in ${room} -> ${value}`);
        
        const statusElementId = `${room}-${device}-status`;
        const statusElement = document.getElementById(statusElementId);
        const deviceCard = statusElement?.closest('.device-card');
        
        console.log(`🔍 Looking for element: ${statusElementId}`);
        console.log(`📍 Status element found:`, !!statusElement);
        console.log(`📍 Device card found:`, !!deviceCard);
        
        if (!statusElement) {
            console.error(`❌ Status element not found: ${statusElementId}`);
            console.error('Available elements with status IDs:', 
                Array.from(document.querySelectorAll('[id*="-status"]')).map(el => el.id));
            return;
        }
        
        if (!deviceCard) {
            console.error(`❌ Device card not found for status element: ${statusElementId}`);
            return;
        }

        setTimeout(() => {
            let statusText = '';
            let isActive = false;

            switch (device) {
                case 'lights':
                    if (value > 0) {
                        statusText = value === 100 ? 'On' : `Dimmed ${value}%`;
                        isActive = true;
                    } else {
                        statusText = 'Off';
                    }
                    break;
                case 'thermostat':
                    statusText = `${value}°F`;
                    isActive = true;
                    break;
                case 'music':
                    statusText = value.charAt(0).toUpperCase() + value.slice(1);
                    isActive = value === 'playing';
                    break;
                case 'security':
                    statusText = value.charAt(0).toUpperCase() + value.slice(1);
                    isActive = value === 'armed';
                    break;
            }

            console.log(`✅ Updating UI: "${statusText}", active: ${isActive}`);
            statusElement.textContent = statusText;
            deviceCard.classList.toggle('active', isActive);
            
            // Visual feedback for successful update
            deviceCard.style.transform = 'scale(1.05)';
            setTimeout(() => {
                deviceCard.style.transform = '';
            }, 200);
            
        }, 100);
    }

    updateMicButton() {
        const micButton = document.getElementById('mic-btn');
        
        if (this.isListening) {
            micButton.classList.add('listening');
            micButton.innerHTML = `
                <svg class="mic-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
                <div class="sound-wave"></div>
                <div class="sound-wave"></div>
                <div class="sound-wave"></div>
                <div class="sound-wave"></div>
                <div class="sound-wave"></div>
            `;
        } else {
            micButton.classList.remove('listening');
            micButton.innerHTML = `
                <svg class="mic-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
            `;
        }
    }

    updateVoiceStatus(status) {
        const statusElement = document.getElementById('voice-status');
        statusElement.textContent = status;
        statusElement.classList.toggle('listening', this.isListening);
    }

    addToDebugPanel(text, type = 'normal') {
        const debugPanel = document.getElementById('recognized-text');
        const entry = document.createElement('div');
        entry.className = `command-entry${type !== 'normal' ? ` command-${type}` : ''}`;
        
        const textSpan = document.createElement('span');
        textSpan.className = 'command-text';
        textSpan.textContent = text;
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'command-time';
        timeSpan.textContent = new Date().toLocaleTimeString();
        
        entry.appendChild(textSpan);
        entry.appendChild(timeSpan);
        
        debugPanel.appendChild(entry);
        debugPanel.scrollTop = debugPanel.scrollHeight;
        
        // Limit debug panel entries to prevent memory issues
        while (debugPanel.children.length > 50) {
            debugPanel.removeChild(debugPanel.firstChild);
        }
    }

    clearDebugPanel() {
        const debugPanel = document.getElementById('recognized-text');
        debugPanel.innerHTML = '';
    }

    showError(message) {
        const timestamp = new Date().toLocaleTimeString();
        this.addToDebugPanel(`[${timestamp}] Error: ${message}`, 'error');
    }

    addCommandToHistory(command, parsed, success) {
        const entry = {
            command,
            parsed,
            success,
            timestamp: new Date().toISOString()
        };

        this.commandHistory.unshift(entry);
        
        if (this.commandHistory.length > this.maxHistoryLength) {
            this.commandHistory = this.commandHistory.slice(0, this.maxHistoryLength);
        }

        this.saveCommandHistory();
    }

    loadDeviceStates() {
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
            'kitchen': {
                lights: 0,
                thermostat: 68,
                security: 'disarmed'
            }
        };

        try {
            const saved = localStorage.getItem('smartHomeDevices');
            return saved ? JSON.parse(saved) : defaultStates;
        } catch (error) {
            console.error('Error loading device states:', error);
            return defaultStates;
        }
    }

    saveDeviceStates() {
        try {
            localStorage.setItem('smartHomeDevices', JSON.stringify(this.devices));
        } catch (error) {
            console.error('Error saving device states:', error);
        }
    }

    loadCommandHistory() {
        try {
            const saved = localStorage.getItem('smartHomeCommandHistory');
            this.commandHistory = saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading command history:', error);
            this.commandHistory = [];
        }
    }

    saveCommandHistory() {
        try {
            localStorage.setItem('smartHomeCommandHistory', JSON.stringify(this.commandHistory));
        } catch (error) {
            console.error('Error saving command history:', error);
        }
    }

    updateUI() {
        Object.keys(this.devices).forEach(room => {
            Object.keys(this.devices[room]).forEach(device => {
                this.updateDeviceUI(room, device, this.devices[room][device]);
            });
        });
        
        // Update any active timers display
        this.updateTimersDisplay();
    }
    
    updateTimersDisplay() {
        const activeTimersList = Array.from(this.activeTimers.entries());
        if (activeTimersList.length > 0) {
            const timersText = activeTimersList.map(([id, timer]) => {
                const remaining = Math.max(0, timer.endTime - Date.now());
                const minutes = Math.ceil(remaining / 60000);
                return `${timer.action} ${timer.room.replace('-', ' ')} ${timer.device} in ${minutes}min`;
            }).join(', ');
            
            // You could add this to a status area in the UI
            console.log('Active timers:', timersText);
        }
    }
    
    // Debug function to manually test commands
    testCommand(command) {
        console.log('\n🧪 TESTING COMMAND:', command);
        console.log('==========================================');
        
        const parsed = this.parseCommand(command.toLowerCase());
        console.log('Parsed result:', parsed);
        
        if (parsed) {
            console.log('Executing...');
            this.executeCommand(parsed);
        } else {
            console.log('❌ Command not parsed');
        }
        
        console.log('Current device states:');
        console.log(JSON.stringify(this.devices, null, 2));
        console.log('==========================================\n');
    }
    
    // Debug function to reset and reinitialize devices
    resetDevices() {
        console.log('🔄 Resetting devices...');
        localStorage.removeItem('smartHomeDevices');
        this.devices = this.loadDeviceStates();
        this.updateUI();
        console.log('✅ Devices reset and reinitialized:');
        console.log(JSON.stringify(this.devices, null, 2));
    }
    
    // Debug function to manually test specific device
    testDevice(room, device, value) {
        console.log(`🧪 Testing device: ${device} in ${room} with value ${value}`);
        
        const command = {
            device: device,
            room: room,
            action: 'test',
            value: value
        };
        
        this.executeCommand(command);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new SmartHomeVoiceControl();
    
    // Expose app instance for debugging
    window.smartHomeApp = app;
    
    console.log('🏠 Smart Home Voice Control initialized');
    console.log('📝 For testing, open console and type: testCommands()');
});