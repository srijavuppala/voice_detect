#!/bin/bash

# Smart Home Voice Control Setup Script
# This script sets up the complete development environment

set -e

echo "🏠 Smart Home Voice Control Setup"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Python is installed
check_python() {
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
        print_success "Python 3 found: $PYTHON_VERSION"
        
        # Check if version is 3.8+
        if python3 -c "import sys; exit(0 if sys.version_info >= (3, 8) else 1)"; then
            print_success "Python version is compatible (3.8+)"
        else
            print_error "Python 3.8+ is required. Current version: $PYTHON_VERSION"
            exit 1
        fi
    else
        print_error "Python 3 is not installed. Please install Python 3.8+ first."
        exit 1
    fi
}

# Setup frontend
setup_frontend() {
    print_status "Setting up frontend..."
    
    if [ ! -d "frontend" ]; then
        print_error "Frontend directory not found. Are you running this from the project root?"
        exit 1
    fi
    
    print_success "Frontend files verified"
}

# Setup backend (optional)
setup_backend() {
    print_status "Setting up Whisper backend (optional)..."
    
    if [ ! -d "backend" ]; then
        print_warning "Backend directory not found. Skipping Whisper setup."
        return 0
    fi
    
    cd backend
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        print_status "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install requirements
    if [ -f "requirements.txt" ]; then
        print_status "Installing Python dependencies..."
        pip install --upgrade pip
        pip install -r requirements.txt
        print_success "Backend dependencies installed"
    else
        print_warning "requirements.txt not found in backend directory"
    fi
    
    cd ..
}

# Create launch scripts
create_launch_scripts() {
    print_status "Creating launch scripts..."
    
    # Frontend launcher
    cat > scripts/start-frontend.sh << 'EOF'
#!/bin/bash
echo "🌐 Starting Smart Home Voice Control Frontend..."
echo "Open your browser to: http://localhost:8000/frontend"
cd "$(dirname "$0")/.."
python3 -m http.server 8000
EOF
    
    # Backend launcher
    cat > scripts/start-backend.sh << 'EOF'
#!/bin/bash
echo "🎤 Starting Whisper Backend Server..."
cd "$(dirname "$0")/../backend"

if [ -d "venv" ]; then
    source venv/bin/activate
fi

python whisper_server.py
EOF
    
    # Make scripts executable
    chmod +x scripts/start-frontend.sh
    chmod +x scripts/start-backend.sh
    
    print_success "Launch scripts created"
}

# Main setup process
main() {
    print_status "Starting setup process..."
    
    # Check prerequisites
    check_python
    
    # Setup components
    setup_frontend
    setup_backend
    
    # Create launch scripts
    create_launch_scripts
    
    echo ""
    echo "🎉 Setup Complete!"
    echo "================="
    echo ""
    echo "To start the application:"
    echo "  Frontend only: ./scripts/start-frontend.sh"
    echo "  With Whisper:  ./scripts/start-backend.sh (in one terminal)"
    echo "                 ./scripts/start-frontend.sh (in another terminal)"
    echo ""
    echo "Or use npm scripts:"
    echo "  npm start      # Start frontend server"
    echo "  npm run start-whisper # Start Whisper backend"
    echo ""
    echo "📖 See README.md for detailed documentation"
    
    print_success "Ready to use! 🚀"
}

# Run main function
main