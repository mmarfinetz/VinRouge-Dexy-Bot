#!/bin/bash

# This script specifically addresses the pydantic_core issue on Replit

echo "Fixing pydantic_core dependency issue..."

# Clean existing pydantic installations
pip uninstall -y pydantic pydantic-core

# Install pydantic with binary distribution
pip install --only-binary=:all: pydantic==2.6.4 pydantic-core==2.16.3

# Try alternative approach if the above fails
if ! python -c "import pydantic_core._pydantic_core" 2>/dev/null; then
    echo "Standard installation failed, trying alternative approach..."
    
    # Try an older version known to work on Replit
    pip uninstall -y pydantic pydantic-core
    pip install pydantic==1.10.8
    
    # Check if successful
    if python -c "import pydantic" 2>/dev/null; then
        echo "Successfully installed older version of pydantic"
    else
        echo "Failed to install pydantic. Try running: pip install --no-deps pydantic==1.10.8"
    fi
fi

# Update other dependencies to match pydantic version
pip install -U langchain-core langchain-community

echo "Dependency fixes completed." 