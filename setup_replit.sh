#!/bin/bash

# Make script exit on first error
set -e

echo "Starting dependency installation for VinRouge-Dexy-Bot on Replit..."

# Check if we're in the Replit environment
if [ -n "$REPL_ID" ]; then
    echo "Detected Replit environment ($REPL_ID)"
    
    # Create a virtual environment if it doesn't exist
    if [ ! -d ".venv" ]; then
        echo "Creating virtual environment..."
        python -m venv .venv
    fi
    
    # Activate the virtual environment
    echo "Activating virtual environment..."
    source .venv/bin/activate
fi

# Install core dependencies first with specific versions
echo "Installing core dependencies..."
pip install --no-cache-dir \
    python-dotenv==1.0.0 \
    flask==2.2.3 \
    flask-cors==3.0.10 \
    requests==2.28.2 \
    gunicorn==20.1.0

# Install data processing libraries
echo "Installing data processing libraries..."
pip install --no-cache-dir \
    numpy==1.26.4 \
    pandas==2.2.3 \
    pytz==2022.7 \
    python-dateutil==2.8.2

# Install pydantic with binary instead of source (to avoid C extension compilation issues)
echo "Installing pydantic with binary distribution..."
pip install --no-cache-dir --only-binary=:all: pydantic==2.6.4 pydantic-core==2.16.3

# Install AI dependencies with specific versions to avoid compatibility issues
echo "Installing AI dependencies..."
pip install --no-cache-dir \
    langchain-openai==0.1.1 \
    langchain-core==0.1.10 \
    langchain-community==0.0.10 \
    openai==1.3.7

# Try installing additional dependencies
echo "Installing additional dependencies..."
pip install --no-cache-dir \
    langgraph==0.2.39 \
    coinbase-agentkit==0.1.2 \
    coinbase-agentkit-langchain==0.1.0 || {
    echo "Warning: Failed to install some additional dependencies. Will try to continue without them."
}

# Fix any dependency conflicts
echo "Ensuring dependency compatibility..."
pip install --no-cache-dir --force-reinstall langchain-core==0.1.10 langchain-community==0.0.10

# Install any additional optional packages
echo "Installing matplotlib for visualizations..."
pip install --no-cache-dir matplotlib==3.7.2

# List installed packages
echo "Installed packages:"
pip list

echo "Dependencies installed successfully!"
echo "You can now run 'python server.py' to start the server." 