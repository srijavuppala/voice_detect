#!/usr/bin/env python3
"""
Smart Home Whisper Backend Setup Script
Installs Whisper and dependencies for offline speech recognition
"""

import subprocess
import sys
import os
import platform

def run_command(command, description):
    """Run a command with error handling"""
    print(f"📦 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e.stderr}")
        return False

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major == 3 and version.minor >= 8:
        print(f"✅ Python {version.major}.{version.minor}.{version.micro} is compatible")
        return True
    else:
        print(f"❌ Python {version.major}.{version.minor}.{version.micro} is not compatible. Need Python 3.8+")
        return False

def install_whisper():
    """Install Whisper and download the base model"""
    commands = [
        ("pip install --upgrade pip", "Upgrading pip"),
        ("pip install -r requirements.txt", "Installing Python dependencies"),
        ("python -c \"import whisper; whisper.load_model('base')\"", "Downloading Whisper base model")
    ]
    
    for command, description in commands:
        if not run_command(command, description):
            return False
    return True

def create_directories():
    """Create necessary directories"""
    dirs = ['uploads', 'logs', 'models']
    for dir_name in dirs:
        os.makedirs(dir_name, exist_ok=True)
        print(f"📁 Created directory: {dir_name}")

def main():
    """Main setup function"""
    print("🏠 Smart Home Whisper Backend Setup")
    print("=" * 40)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Create directories
    create_directories()
    
    # Install Whisper and dependencies
    if install_whisper():
        print("\n🎉 Setup completed successfully!")
        print("\nNext steps:")
        print("1. Run: python whisper_server.py")
        print("2. Open index.html in your browser")
        print("3. Toggle to 'Whisper Backend' in settings")
        print("\n🎤 Your smart home now has offline speech recognition!")
    else:
        print("\n❌ Setup failed. Please check the error messages above.")
        sys.exit(1)

if __name__ == "__main__":
    main()