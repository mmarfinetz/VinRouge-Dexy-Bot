#!/bin/bash

echo "Starting Dexy Bot..."
echo "Windows 97-themed interface for crypto analysis"
echo "---------------------------------------------"

# Check if we're in a virtual environment
if [ -d ".venv" ] && [ -f ".venv/bin/activate" ]; then
    echo "Activating virtual environment..."
    source .venv/bin/activate
fi

# Run the server directly with Python
echo "Starting server..."
python server.py

echo "Server stopped." 