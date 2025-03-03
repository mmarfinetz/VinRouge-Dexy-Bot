#!/bin/bash

# Make script exit on first error
set -e

echo "FIXED SCRIPT: Installing dependencies for VinRouge-Dexy-Bot on Replit..."

# Check if we're in the Replit environment
if [ -n "$REPL_ID" ]; then
    echo "Detected Replit environment ($REPL_ID)"
    
    # Deactivate any virtual environment first
    if [ -n "$VIRTUAL_ENV" ]; then
        echo "Deactivating existing virtual environment..."
        deactivate 2>/dev/null || true
    fi
fi

# Ensure pip commands use Python's module to avoid --user flag issues
echo "Installing core dependencies..."
python -m pip install --no-cache-dir \
    python-dotenv==1.0.0 \
    flask==2.2.3 \
    flask-cors==3.0.10 \
    requests==2.28.2 \
    gunicorn==20.1.0

# Install data processing libraries
echo "Installing data processing libraries..."
python -m pip install --no-cache-dir \
    numpy==1.26.4 \
    pandas==2.2.3 \
    pytz==2022.7 \
    python-dateutil==2.8.2

# Clean any potentially problematic packages
echo "Cleaning problematic packages..."
python -m pip uninstall -y pydantic pydantic-core openai jiter langchain-openai langchain-core langchain-community || true

# Install pydantic and its dependencies with compatible versions
echo "Installing pydantic with compatible versions..."
python -m pip install --no-cache-dir pydantic==2.4.2 pydantic-core==2.10.1

# Install jiter (required by OpenAI)
echo "Installing jiter (required by OpenAI)..."
python -m pip install --no-cache-dir jiter==0.4.2

# Install OpenAI with a compatible version
echo "Installing OpenAI with compatible version..."
python -m pip install --no-cache-dir openai==1.2.0

# Install LangChain packages with compatible versions
echo "Installing LangChain packages..."
python -m pip install --no-cache-dir \
    langchain-core==0.1.10 \
    langchain-openai==0.0.5 \
    langchain-community==0.0.10

# Fix any dependency conflicts
echo "Ensuring dependency compatibility..."
python -m pip install --no-cache-dir --force-reinstall langchain-core==0.1.10 langchain-community==0.0.10

# Install matplotlib for visualizations
echo "Installing matplotlib for visualizations..."
python -m pip install --no-cache-dir matplotlib==3.7.2

# List installed packages
echo "Installed packages:"
python -m pip list

echo "Dependencies installed successfully!"
echo "You can now run 'python server.py' to start the server." 